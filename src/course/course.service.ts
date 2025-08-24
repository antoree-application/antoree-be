import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { 
  CreateCourseDto, 
  UpdateCourseDto, 
  SearchCourseDto, 
  BookCourseDto 
} from './dto';
import {
  CourseVm,
  CourseListVm,
  CourseDetailVm,
  PopularCourseVm,
  CourseAnalyticsVm,
} from './vm';
import { Course, Teacher, User, EnglishLevel, BookingStatus } from '@prisma/client';

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new course
   */
  async create(createCourseDto: CreateCourseDto, teacherId: string): Promise<CourseVm> {
    // Verify teacher exists and is approved
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher not found with ID: ${teacherId}`);
    }

    if (teacher.status !== 'APPROVED') {
      throw new ForbiddenException('Only approved teachers can create courses');
    }

    // Check for duplicate course name by the same teacher
    const existingCourse = await this.prisma.course.findFirst({
      where: {
        teacherId,
        name: createCourseDto.name,
      },
    });

    if (existingCourse) {
      throw new ConflictException('Course with this name already exists');
    }

    const course = await this.prisma.course.create({
      data: {
        ...createCourseDto,
        teacherId,
      },
      include: {
        teacher: {
          include: { user: true },
        },
      },
    });

    return this.toCourseVm(course);
  }

  /**
   * Find all courses with pagination and filters
   */
  async findAll(searchDto: SearchCourseDto): Promise<CourseListVm> {
    const {
      search,
      level,
      minPrice,
      maxPrice,
      minDuration,
      maxDuration,
      minLessons,
      maxLessons,
      isActive = true,
      teacherId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = searchDto;

    // Build where clause
    const where: any = { isActive };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (level) where.level = level;
    if (teacherId) where.teacherId = teacherId;

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (minDuration !== undefined || maxDuration !== undefined) {
      where.duration = {};
      if (minDuration !== undefined) where.duration.gte = minDuration;
      if (maxDuration !== undefined) where.duration.lte = maxDuration;
    }

    if (minLessons !== undefined || maxLessons !== undefined) {
      where.totalLessons = {};
      if (minLessons !== undefined) where.totalLessons.gte = minLessons;
      if (maxLessons !== undefined) where.totalLessons.lte = maxLessons;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.prisma.course.count({ where });

    // Get courses
    const courses = await this.prisma.course.findMany({
      where,
      include: {
        teacher: {
          include: { user: true },
        },
        _count: {
          select: {
            bookings: true,
            lessons: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      courses: courses.map(course => this.toCourseVm(course)),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Find one course by ID with detailed information
   */
  async findOne(id: string): Promise<CourseDetailVm> {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        teacher: {
          include: { user: true },
        },
        bookings: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } },
          include: {
            student: {
              include: { user: true },
            },
          },
          orderBy: { scheduledAt: 'asc' },
          take: 5,
        },
        lessons: {
          include: {
            student: {
              include: { user: true },
            },
          },
          orderBy: { scheduledAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            bookings: true,
            lessons: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get course statistics
    const stats = await this.getCourseStats(id);

    // Get reviews for this course (through lessons)
    const reviews = await this.prisma.review.findMany({
      where: {
        teacher: { courses: { some: { id } } },
      },
      include: {
        student: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const courseVm = this.toCourseVm(course);
    
    return {
      ...courseVm,
      stats,
      recentBookings: course.bookings.map(booking => ({
        id: booking.id,
        studentName: `${booking.student.user.firstName} ${booking.student.user.lastName}`,
        scheduledAt: booking.scheduledAt.toISOString(),
        status: booking.status,
      })),
      reviews: reviews.map(review => ({
        id: review.id,
        studentName: `${review.student.firstName} ${review.student.lastName}`,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Update a course
   */
  async update(id: string, updateCourseDto: UpdateCourseDto, teacherId: string): Promise<CourseVm> {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You can only update your own courses');
    }

    // Check for name conflicts if name is being updated
    if (updateCourseDto.name && updateCourseDto.name !== course.name) {
      const existingCourse = await this.prisma.course.findFirst({
        where: {
          teacherId,
          name: updateCourseDto.name,
          id: { not: id },
        },
      });

      if (existingCourse) {
        throw new ConflictException('Course with this name already exists');
      }
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: updateCourseDto,
      include: {
        teacher: {
          include: { user: true },
        },
      },
    });

    return this.toCourseVm(updatedCourse);
  }

  /**
   * Delete a course (soft delete by setting isActive to false)
   */
  async remove(id: string, teacherId: string): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        bookings: {
          where: { 
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You can only delete your own courses');
    }

    // Check if there are active bookings
    if (course.bookings.length > 0) {
      throw new BadRequestException(
        'Cannot delete course with active bookings. Please cancel or complete all bookings first.'
      );
    }

    await this.prisma.course.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Get courses by teacher
   */
  async findByTeacher(teacherId: string, searchDto: SearchCourseDto): Promise<CourseListVm> {
    return this.findAll({ ...searchDto, teacherId });
  }

  /**
   * Get popular courses
   */
  async getPopularCourses(limit: number = 10): Promise<PopularCourseVm[]> {
    const courses = await this.prisma.course.findMany({
      where: { isActive: true },
      include: {
        teacher: {
          include: { user: true },
        },
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'COMPLETED'] },
          },
        },
        lessons: {
          where: {
            status: 'COMPLETED',
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: {
        bookings: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return courses.map(course => ({
      id: course.id,
      name: course.name,
      price: course.price.toString(),
      level: course.level,
      totalLessons: course.totalLessons,
      duration: course.duration,
      teacher: {
        id: course.teacher.id,
        name: `${course.teacher.user.firstName} ${course.teacher.user.lastName}`,
        avatar: course.teacher.user.avatar,
        averageRating: course.teacher.averageRating?.toString(),
        specialties: course.teacher.specialties,
      },
      popularity: {
        totalBookings: course._count.bookings,
        monthlyBookings: course.bookings.filter(
          booking => booking.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length,
        averageRating: course.teacher.averageRating?.toString(),
        reviewCount: 0, // Will be calculated separately if needed
      },
    }));
  }

  /**
   * Get course analytics
   */
  async getCourseAnalytics(courseId: string, teacherId: string): Promise<CourseAnalyticsVm> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You can only view analytics for your own courses');
    }

    // Get booking statistics
    const bookingStats = await this.prisma.booking.groupBy({
      by: ['status'],
      where: { courseId },
      _count: { status: true },
    });

    const totalBookings = bookingStats.reduce((sum, stat) => sum + stat._count.status, 0);
    const activeBookings = bookingStats.find(s => s.status === 'CONFIRMED')?._count.status || 0;
    const completedBookings = bookingStats.find(s => s.status === 'COMPLETED')?._count.status || 0;
    const cancelledBookings = bookingStats.find(s => s.status === 'CANCELLED')?._count.status || 0;

    // Calculate revenue
    const payments = await this.prisma.payment.findMany({
      where: {
        lessonPackage: {
          OR: [
            { teacherId: course.teacherId },
            { bookings: { some: { courseId } } },
          ],
        },
        status: 'COMPLETED',
      },
    });

    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);

    // Get monthly trend (last 12 months)
    const monthlyData = await this.getMonthlyTrend(courseId);

    // Get teacher rating separately
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: course.teacherId },
    });

    return {
      courseId: course.id,
      courseName: course.name,
      analytics: {
        totalBookings,
        activeBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue: totalRevenue.toString(),
        averageRating: teacher?.averageRating?.toString(),
        totalReviews: 0, // Calculate if needed
        completionRate: totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0,
        monthlyTrend: monthlyData,
        levelDistribution: [], // Calculate if needed
      },
    };
  }

  /**
   * Search courses by text
   */
  async searchCourses(query: string, limit: number = 10): Promise<CourseVm[]> {
    const courses = await this.prisma.course.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { teacher: { specialties: { has: query } } },
        ],
      },
      include: {
        teacher: {
          include: { user: true },
        },
      },
      take: limit,
    });

    return courses.map(course => this.toCourseVm(course));
  }

  /**
   * Helper methods
   */
  private toCourseVm(course: Course & { teacher?: Teacher & { user: User } }): CourseVm {
    return {
      id: course.id,
      teacherId: course.teacherId,
      name: course.name,
      description: course.description,
      duration: course.duration,
      totalLessons: course.totalLessons,
      price: course.price.toString(),
      level: course.level,
      isActive: course.isActive,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      teacher: course.teacher ? {
        id: course.teacher.id,
        user: {
          firstName: course.teacher.user.firstName,
          lastName: course.teacher.user.lastName,
          avatar: course.teacher.user.avatar,
        },
        averageRating: course.teacher.averageRating?.toString(),
        totalLessons: course.teacher.totalLessons,
        specialties: course.teacher.specialties,
        hourlyRate: course.teacher.hourlyRate.toString(),
      } : undefined,
    };
  }

  private async getCourseStats(courseId: string) {
    const [totalBookings, activeBookings, completedLessons] = await Promise.all([
      this.prisma.booking.count({
        where: { courseId },
      }),
      this.prisma.booking.count({
        where: { 
          courseId,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      }),
      this.prisma.lesson.count({
        where: { 
          courseId,
          status: 'COMPLETED',
        },
      }),
    ]);

    return {
      totalBookings,
      activeBookings,
      completedLessons,
    };
  }

  private async getMonthlyTrend(courseId: string) {
    // This is a simplified version - you might want to use raw SQL for better performance
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        month: date.toISOString().slice(0, 7), // YYYY-MM format
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
      };
    }).reverse();

    const monthlyData = await Promise.all(
      last12Months.map(async ({ month, start, end }) => {
        const bookings = await this.prisma.booking.count({
          where: {
            courseId,
            createdAt: {
              gte: start,
              lte: end,
            },
          },
        });

        return {
          month,
          bookings,
          revenue: '0', // Calculate based on actual payments if needed
        };
      })
    );

    return monthlyData;
  }
}
