import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { SearchTeacherDto } from './dto/search-teacher.dto';
import { CreateAvailabilityDto, UpdateAvailabilityDto } from './dto/availability.dto';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import {
  TeacherVm,
  TeacherAvailabilityVm,
  TeacherSearchResultVm,
} from './vm/teacher.vm';
import { Teacher, User, TeacherAvailability, TeacherStatus, UserRole, Course } from '@prisma/client';

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaService) {}

  private toTeacherVm(teacher: Teacher & { user: User }): TeacherVm {
    return {
      id: teacher.id,
      userId: teacher.userId,
      bio: teacher.bio,
      experience: teacher.experience,
      education: teacher.education,
      certifications: teacher.certifications,
      specialties: teacher.specialties,
      hourlyRate: teacher.hourlyRate.toString(),
      timezone: teacher.timezone,
      languages: teacher.languages,
      videoIntroUrl: teacher.videoIntroUrl,
      status: teacher.status,
      totalLessons: teacher.totalLessons,
      averageRating: teacher.averageRating?.toString(),
      responseTime: teacher.responseTime,
      createdAt: teacher.user.createdAt,
      updatedAt: teacher.user.updatedAt,
      fullName: `${teacher.user.firstName} ${teacher.user.lastName}`,
      email: teacher.user.email,
      avatar: teacher.user.avatar,
      phone: teacher.user.phone,
      isActive: teacher.user.isActive,
    };
  }

  private toAvailabilityVm(availability: TeacherAvailability): TeacherAvailabilityVm {
    return {
      id: availability.id,
      teacherId: availability.teacherId,
      dayOfWeek: availability.dayOfWeek,
      startTime: availability.startTime,
      endTime: availability.endTime,
      isActive: availability.isActive,
      createdAt: availability.createdAt,
    };
  }

  async create(createTeacherDto: CreateTeacherDto): Promise<TeacherVm> {
    // Check if user exists and has correct role
    const user = await this.prisma.user.findUnique({
      where: { id: createTeacherDto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.TEACHER) {
      throw new BadRequestException('User must have TEACHER role');
    }

    // Check if teacher profile already exists
    const existingTeacher = await this.prisma.teacher.findUnique({
      where: { userId: createTeacherDto.userId },
    });

    if (existingTeacher) {
      throw new ConflictException('Teacher profile already exists for this user');
    }

    const teacher = await this.prisma.teacher.create({
      data: {
        userId: createTeacherDto.userId,
        bio: createTeacherDto.bio,
        experience: createTeacherDto.experience || 0,
        education: createTeacherDto.education,
        certifications: createTeacherDto.certifications || [],
        specialties: createTeacherDto.specialties || [],
        hourlyRate: createTeacherDto.hourlyRate,
        timezone: createTeacherDto.timezone || 'Asia/Ho_Chi_Minh',
        languages: createTeacherDto.languages || ['English'],
        videoIntroUrl: createTeacherDto.videoIntroUrl,
        responseTime: createTeacherDto.responseTime,
      },
      include: {
        user: true,
      },
    });

    return this.toTeacherVm(teacher);
  }

  async findAll(): Promise<TeacherVm[]> {
    const teachers = await this.prisma.teacher.findMany({
      include: {
        user: true,
      },
      orderBy: {
        averageRating: 'desc',
      },
    });

    return teachers.map(teacher => this.toTeacherVm(teacher));
  }

  async findOne(id: string): Promise<TeacherVm> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${id} not found`);
    }

    return this.toTeacherVm(teacher);
  }

  async findByUserId(userId: string): Promise<TeacherVm> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found for user ${userId}`);
    }

    return this.toTeacherVm(teacher);
  }

  async search(searchDto: SearchTeacherDto): Promise<TeacherSearchResultVm> {
    const {
      search,
      level,
      status = TeacherStatus.APPROVED,
      minRate,
      maxRate,
      specialties,
      languages,
      minExperience,
      minRating,
      page = 1,
      limit = 10,
      sortBy = 'averageRating',
      sortOrder = 'desc',
    } = searchDto;

    const where: any = {
      status,
      user: {
        isActive: true,
      },
    };

    // Search filter
    if (search) {
      where.OR = [
        {
          user: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          specialties: {
            has: search,
          },
        },
        {
          bio: { contains: search, mode: 'insensitive' },
        },
      ];
    }

    // Rate filters
    if (minRate !== undefined) {
      where.hourlyRate = { ...where.hourlyRate, gte: minRate };
    }
    if (maxRate !== undefined) {
      where.hourlyRate = { ...where.hourlyRate, lte: maxRate };
    }

    // Specialties filter
    if (specialties && specialties.length > 0) {
      where.specialties = {
        hasSome: specialties,
      };
    }

    // Languages filter
    if (languages && languages.length > 0) {
      where.languages = {
        hasSome: languages,
      };
    }

    // Experience filter
    if (minExperience !== undefined) {
      where.experience = { gte: minExperience };
    }

    // Rating filter
    if (minRating !== undefined) {
      where.averageRating = { gte: minRating };
    }

    const skip = (page - 1) * limit;

    const [teachers, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return {
      teachers: teachers.map(teacher => this.toTeacherVm(teacher)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto): Promise<TeacherVm> {
    const existingTeacher = await this.prisma.teacher.findUnique({
      where: { id },
    });

    if (!existingTeacher) {
      throw new NotFoundException(`Teacher with ID ${id} not found`);
    }

    const teacher = await this.prisma.teacher.update({
      where: { id },
      data: {
        bio: updateTeacherDto.bio,
        experience: updateTeacherDto.experience,
        education: updateTeacherDto.education,
        certifications: updateTeacherDto.certifications,
        specialties: updateTeacherDto.specialties,
        hourlyRate: updateTeacherDto.hourlyRate,
        timezone: updateTeacherDto.timezone,
        languages: updateTeacherDto.languages,
        videoIntroUrl: updateTeacherDto.videoIntroUrl,
        responseTime: updateTeacherDto.responseTime,
        status: updateTeacherDto.status,
      },
      include: {
        user: true,
      },
    });

    return this.toTeacherVm(teacher);
  }

  async updateStatus(id: string, status: TeacherStatus): Promise<TeacherVm> {
    const teacher = await this.prisma.teacher.update({
      where: { id },
      data: { status },
      include: {
        user: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${id} not found`);
    }

    return this.toTeacherVm(teacher);
  }

  async remove(id: string): Promise<TeacherVm> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${id} not found`);
    }

    await this.prisma.teacher.delete({
      where: { id },
    });

    return this.toTeacherVm(teacher);
  }

  // Availability Management
  async addAvailability(
    teacherId: string,
    createAvailabilityDto: CreateAvailabilityDto,
  ): Promise<TeacherAvailabilityVm> {
    // Check if teacher exists
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (
      !timeRegex.test(createAvailabilityDto.startTime) ||
      !timeRegex.test(createAvailabilityDto.endTime)
    ) {
      throw new BadRequestException('Invalid time format. Use HH:mm format');
    }

    // Check if start time is before end time
    const startTime = new Date(`1970-01-01T${createAvailabilityDto.startTime}:00`);
    const endTime = new Date(`1970-01-01T${createAvailabilityDto.endTime}:00`);
    
    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check for overlapping availability
    const existingAvailability = await this.prisma.teacherAvailability.findFirst({
      where: {
        teacherId,
        dayOfWeek: createAvailabilityDto.dayOfWeek,
        isActive: true,
        OR: [
          {
            AND: [
              { startTime: { lte: createAvailabilityDto.startTime } },
              { endTime: { gt: createAvailabilityDto.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: createAvailabilityDto.endTime } },
              { endTime: { gte: createAvailabilityDto.endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: createAvailabilityDto.startTime } },
              { endTime: { lte: createAvailabilityDto.endTime } },
            ],
          },
        ],
      },
    });

    if (existingAvailability) {
      throw new ConflictException('Availability overlaps with existing schedule');
    }

    const availability = await this.prisma.teacherAvailability.create({
      data: {
        teacherId,
        dayOfWeek: createAvailabilityDto.dayOfWeek,
        startTime: createAvailabilityDto.startTime,
        endTime: createAvailabilityDto.endTime,
        isActive: createAvailabilityDto.isActive ?? true,
      },
    });

    return this.toAvailabilityVm(availability);
  }

  async getAvailabilities(teacherId: string): Promise<TeacherAvailabilityVm[]> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
    }

    const availabilities = await this.prisma.teacherAvailability.findMany({
      where: { teacherId },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return availabilities.map(availability => this.toAvailabilityVm(availability));
  }

  async updateAvailability(
    teacherId: string,
    availabilityId: string,
    updateAvailabilityDto: UpdateAvailabilityDto,
  ): Promise<TeacherAvailabilityVm> {
    const availability = await this.prisma.teacherAvailability.findFirst({
      where: {
        id: availabilityId,
        teacherId,
      },
    });

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    // Validate time format if provided
    if (updateAvailabilityDto.startTime || updateAvailabilityDto.endTime) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      if (
        updateAvailabilityDto.startTime &&
        !timeRegex.test(updateAvailabilityDto.startTime)
      ) {
        throw new BadRequestException('Invalid start time format. Use HH:mm format');
      }

      if (
        updateAvailabilityDto.endTime &&
        !timeRegex.test(updateAvailabilityDto.endTime)
      ) {
        throw new BadRequestException('Invalid end time format. Use HH:mm format');
      }

      // Check if start time is before end time
      const startTime = updateAvailabilityDto.startTime || availability.startTime;
      const endTime = updateAvailabilityDto.endTime || availability.endTime;
      
      const start = new Date(`1970-01-01T${startTime}:00`);
      const end = new Date(`1970-01-01T${endTime}:00`);
      
      if (start >= end) {
        throw new BadRequestException('Start time must be before end time');
      }
    }

    const updatedAvailability = await this.prisma.teacherAvailability.update({
      where: { id: availabilityId },
      data: updateAvailabilityDto,
    });

    return this.toAvailabilityVm(updatedAvailability);
  }

  async removeAvailability(teacherId: string, availabilityId: string): Promise<void> {
    const availability = await this.prisma.teacherAvailability.findFirst({
      where: {
        id: availabilityId,
        teacherId,
      },
    });

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    await this.prisma.teacherAvailability.delete({
      where: { id: availabilityId },
    });
  }

  // Statistics
  async getTeacherStats(teacherId: string): Promise<any> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        lessons: {
          where: {
            status: 'COMPLETED',
          },
        },
        reviews: true,
        bookings: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
    }

    const completedLessons = teacher.lessons.length;
    const totalReviews = teacher.reviews.length;
    const averageRating = totalReviews > 0
      ? teacher.reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

    const totalBookings = teacher.bookings.length;
    const confirmedBookings = teacher.bookings.filter(
      booking => booking.status === 'CONFIRMED',
    ).length;

    return {
      totalLessons: completedLessons,
      totalReviews,
      averageRating: Number(averageRating.toFixed(2)),
      totalBookings,
      confirmedBookings,
      responseTime: teacher.responseTime,
    };
  }

  async updateTeacherRating(teacherId: string): Promise<void> {
    const reviews = await this.prisma.review.findMany({
      where: { teacherId },
    });

    if (reviews.length === 0) {
      await this.prisma.teacher.update({
        where: { id: teacherId },
        data: { averageRating: null },
      });
      return;
    }

    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    await this.prisma.teacher.update({
      where: { id: teacherId },
      data: { averageRating: Number(averageRating.toFixed(2)) },
    });
  }

  // Course Management
  async createCourse(teacherId: string, createCourseDto: CreateCourseDto): Promise<Course> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
    }

    if (teacher.status !== TeacherStatus.APPROVED) {
      throw new BadRequestException('Only approved teachers can create courses');
    }

    return this.prisma.course.create({
      data: {
        teacherId,
        name: createCourseDto.name,
        description: createCourseDto.description,
        duration: createCourseDto.duration,
        totalLessons: createCourseDto.totalLessons,
        price: createCourseDto.price,
        level: createCourseDto.level,
        isActive: createCourseDto.isActive ?? true,
      },
    });
  }

  async getTeacherCourses(teacherId: string): Promise<Course[]> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
    }

    return this.prisma.course.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateCourse(
    teacherId: string,
    courseId: string,
    updateCourseDto: UpdateCourseDto,
  ): Promise<Course> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        teacherId,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found or not owned by teacher');
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: updateCourseDto,
    });
  }

  async deleteCourse(teacherId: string, courseId: string): Promise<Course> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        teacherId,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found or not owned by teacher');
    }

    // Check if course has bookings
    const bookings = await this.prisma.booking.findMany({
      where: { courseId },
    });

    if (bookings.length > 0) {
      throw new BadRequestException('Cannot delete course with existing bookings');
    }

    return this.prisma.course.delete({
      where: { id: courseId },
    });
  }
}
