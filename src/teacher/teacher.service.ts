import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { SearchTeacherDto } from './dto/search-teacher.dto';
import { CreateAvailabilityDto, UpdateAvailabilityDto } from './dto/availability.dto';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { SetupTeacherProfileDto } from './dto/setup-profile.dto';
import { SubmitVerificationDto, VerificationStatusDto } from './dto/verification.dto';
import { 
  SetupAvailabilityAndRatesDto, 
  GoLiveRequestDto, 
  UpdateRateDto,
  RateType,
  AvailabilityType 
} from './dto/availability-rates.dto';
import {
  TeacherVm,
  TeacherAvailabilityVm,
  TeacherSearchResultVm,
  TeacherVerificationVm,
  ProfileSetupStatusVm,
  TeacherRateVm,
  AvailabilityAndRatesVm,
  TeacherOnboardingStatusVm,
  EnhancedTeacherAvailabilityVm,
} from './vm/teacher.vm';
import { 
  Teacher, 
  User, 
  TeacherAvailability, 
  TeacherStatus, 
  UserRole, 
  Course
} from '@prisma/client';

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaService) {}

  private toTeacherVm(teacher: Teacher & { user: User }): TeacherVm {
    return {
      id: teacher.id,
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
      profileCompleted: (teacher as any).profileCompleted || false,
      verificationSubmitted: (teacher as any).verificationSubmitted || false,
      availabilitySetup: (teacher as any).availabilitySetup || false,
      isLive: (teacher as any).isLive || false,
      advanceNoticeHours: (teacher as any).advanceNoticeHours,
      maxAdvanceBookingHours: (teacher as any).maxAdvanceBookingHours,
      allowInstantBooking: (teacher as any).allowInstantBooking || false,
      bookingInstructions: (teacher as any).bookingInstructions,
      createdAt: teacher.user.createdAt,
      updatedAt: teacher.user.updatedAt,
      fullName: `${teacher.user.firstName} ${teacher.user.lastName}`,
      email: teacher.user.email,
      avatar: teacher.user.avatar,
      phone: teacher.user.phone,
      isActive: teacher.user.isActive,
    };
  }

  private toEnhancedTeacherVm(teacher: any): TeacherVm {
    const baseVm = this.toTeacherVm(teacher);
    
    // Add availability summary
    const availabilityDays = teacher.availabilities?.map((avail: any) => avail.dayOfWeek) || [];
    const uniqueDays = [...new Set(availabilityDays)].sort();
    
    // Add rate information
    const rates = teacher.rates || [];
    const trialRate = rates.find((rate: any) => rate.type === 'TRIAL_LESSON');
    const regularRate = rates.find((rate: any) => rate.type === 'REGULAR_LESSON');
    
    // Add recent reviews
    const recentReviews = teacher.reviews?.map((review: any) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      studentName: `${review.student.firstName} ${review.student.lastName}`,
      studentAvatar: review.student.avatar,
    })) || [];

    return {
      ...baseVm,
      availableDays: uniqueDays,
      trialLessonRate: trialRate?.rate?.toString(),
      regularLessonRate: regularRate?.rate?.toString(),
      recentReviews,
      totalReviews: teacher.reviews?.length || 0,
    } as any;
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
      where: { id: createTeacherDto.userId },
    });

    if (existingTeacher) {
      throw new ConflictException('Teacher profile already exists for this user');
    }

    const teacher = await this.prisma.teacher.create({
      data: {
        id: createTeacherDto.userId,
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
      where: { id: userId },
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
      certifications,
      languages,
      minExperience,
      minRating,
      timezone,
      instantBooking,
      availableOnDay,
      availableAtTime,
      hasVideoIntro,
      onlyLive,
      maxResponseTime,
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

    // Only show live teachers if requested
    if (onlyLive) {
      where.isLive = true;
    }

    // Search filter
    if (search) {
      // First get all teachers to check array fields
      const allTeachers = await this.prisma.teacher.findMany({
        where: {
          status,
          user: { isActive: true },
        },
        include: {
          user: {
            select: { firstName: true, lastName: true }
          }
        }
      });

      // Find teachers that match in array fields
      const arrayMatchingIds = allTeachers
        .filter(teacher => {
          // Check specialties
          const specialtyMatch = teacher.specialties.some(specialty => 
            specialty.toLowerCase().includes(search.toLowerCase())
          );
          
          // Check certifications
          const certificationMatch = teacher.certifications.some(certification => 
            certification.toLowerCase().includes(search.toLowerCase())
          );
          
          return specialtyMatch || certificationMatch;
        })
        .map(teacher => teacher.id);

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
          bio: { contains: search, mode: 'insensitive' },
        },
        {
          education: { contains: search, mode: 'insensitive' },
        },
      ];

      // Add array matches to OR condition
      if (arrayMatchingIds.length > 0) {
        where.OR.push({
          id: { in: arrayMatchingIds }
        });
      }
    }

    // Rate filters
    if (minRate !== undefined) {
      where.hourlyRate = { ...where.hourlyRate, gte: minRate };
    }
    if (maxRate !== undefined) {
      where.hourlyRate = { ...where.hourlyRate, lte: maxRate };
    }

    // Specialties filter with regex support
    if (specialties && specialties.length > 0) {
      // For each specialty, find teachers whose specialties array contains items that match the pattern
      const specialtyMatches = await this.prisma.teacher.findMany({
        where: {
          status,
          user: { isActive: true },
        },
        select: { id: true, specialties: true },
      });

      const matchingTeacherIds = specialtyMatches
        .filter(teacher => 
          specialties.some(searchSpecialty => 
            teacher.specialties.some(teacherSpecialty => 
              teacherSpecialty.toLowerCase().includes(searchSpecialty.toLowerCase())
            )
          )
        )
        .map(teacher => teacher.id);

      if (matchingTeacherIds.length > 0) {
        where.id = where.id 
          ? { in: [...(Array.isArray(where.id.in) ? where.id.in : []), ...matchingTeacherIds] }
          : { in: matchingTeacherIds };
      } else {
        // No matches found, return empty result
        where.id = { in: [] };
      }
    }

    // Certifications filter with regex support
    if (certifications && certifications.length > 0) {
      // For each certification, find teachers whose certifications array contains items that match the pattern
      const certificationMatches = await this.prisma.teacher.findMany({
        where: {
          status,
          user: { isActive: true },
        },
        select: { id: true, certifications: true },
      });

      const matchingTeacherIds = certificationMatches
        .filter(teacher => 
          certifications.some(searchCertification => 
            teacher.certifications.some(teacherCertification => 
              teacherCertification.toLowerCase().includes(searchCertification.toLowerCase())
            )
          )
        )
        .map(teacher => teacher.id);

      if (matchingTeacherIds.length > 0) {
        if (where.id?.in) {
          // Intersect with existing filter
          const existingIds = Array.isArray(where.id.in) ? where.id.in : [];
          where.id = { in: existingIds.filter(id => matchingTeacherIds.includes(id)) };
        } else {
          where.id = { in: matchingTeacherIds };
        }
      } else {
        // No matches found, return empty result
        where.id = { in: [] };
      }
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

    // Timezone filter
    if (timezone) {
      where.timezone = timezone;
    }

    // Instant booking filter
    if (instantBooking !== undefined) {
      where.allowInstantBooking = instantBooking;
    }

    // Video introduction filter
    if (hasVideoIntro !== undefined) {
      if (hasVideoIntro) {
        where.videoIntroUrl = { not: null };
      } else {
        where.videoIntroUrl = null;
      }
    }

    // Response time filter
    if (maxResponseTime !== undefined) {
      where.responseTime = { lte: maxResponseTime };
    }

    // Availability filters (requires additional queries)
    let teacherIdsWithAvailability: string[] | undefined;
    
    if (availableOnDay !== undefined || availableAtTime) {
      const availabilityWhere: any = {
        isActive: true,
      };
      
      if (availableOnDay !== undefined) {
        availabilityWhere.dayOfWeek = availableOnDay;
      }
      
      if (availableAtTime) {
        availabilityWhere.startTime = { lte: availableAtTime };
        availabilityWhere.endTime = { gt: availableAtTime };
      }

      const availabilities = await this.prisma.teacherAvailability.findMany({
        where: availabilityWhere,
        select: { teacherId: true },
      });

      teacherIdsWithAvailability = [...new Set(availabilities.map(a => a.teacherId))];
      
      if (teacherIdsWithAvailability.length === 0) {
        // No teachers match the availability criteria
        return {
          teachers: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }
      
      where.id = { in: teacherIdsWithAvailability };
    }

    const skip = (page - 1) * limit;

    const [teachers, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where,
        include: {
          user: true,
          availabilities: {
            where: { isActive: true },
            orderBy: [
              { dayOfWeek: 'asc' },
              { startTime: 'asc' },
            ],
          },
          rates: {
            where: { isActive: true },
            orderBy: { type: 'asc' },
          },
          reviews: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              student: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
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
      teachers: teachers.map(teacher => this.toEnhancedTeacherVm(teacher)),
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

  // Profile Setup and Verification Methods

  async setupProfile(userId: string, setupProfileDto: SetupTeacherProfileDto): Promise<TeacherVm> {
    // Find teacher by userId
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: userId },
      include: { user: true },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found for user ${userId}`);
    }

    if (teacher.status !== TeacherStatus.PENDING) {
      throw new BadRequestException('Profile setup can only be done for pending teachers');
    }

    // Validate that English is included in languages
    if (!setupProfileDto.languages.includes('English')) {
      throw new BadRequestException('English must be included in the languages list');
    }

    // Update teacher profile
    const updatedTeacher = await this.prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        bio: setupProfileDto.bio,
        experience: setupProfileDto.experience,
        education: setupProfileDto.education,
        certifications: setupProfileDto.certifications,
        specialties: setupProfileDto.specialties,
        hourlyRate: setupProfileDto.hourlyRate,
        timezone: setupProfileDto.timezone || 'Asia/Ho_Chi_Minh',
        languages: setupProfileDto.languages,
        videoIntroUrl: setupProfileDto.videoIntroUrl,
        responseTime: setupProfileDto.responseTime,
        profileCompleted: true,
      },
      include: {
        user: true,
      },
    });

    return this.toTeacherVm(updatedTeacher);
  }

  async getProfileSetupStatus(userId: string): Promise<ProfileSetupStatusVm> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: userId },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found for user ${userId}`);
    }

    const nextSteps: string[] = [];
    let completionPercentage = 0;

    if (!teacher.profileCompleted) {
      nextSteps.push('Complete profile setup');
    } else {
      completionPercentage += 25;
    }

    if (!teacher.verificationSubmitted) {
      if (teacher.profileCompleted) {
        nextSteps.push('Submit verification documents');
      }
    } else {
      completionPercentage += 25;
    }

    if (teacher.status === TeacherStatus.PENDING && teacher.verificationSubmitted) {
      nextSteps.push('Wait for admin approval');
    } else if (teacher.status === TeacherStatus.APPROVED) {
      completionPercentage += 25;
    } else if (teacher.status === TeacherStatus.REJECTED) {
      nextSteps.push('Update profile based on feedback and resubmit');
    }

    if (!(teacher as any).availabilitySetup && teacher.status === TeacherStatus.APPROVED) {
      nextSteps.push('Set up availability and rates');
    } else if ((teacher as any).availabilitySetup) {
      completionPercentage += 15;
    }

    if (!(teacher as any).isLive && (teacher as any).availabilitySetup && teacher.status === TeacherStatus.APPROVED) {
      nextSteps.push('Go live to start receiving bookings');
    } else if ((teacher as any).isLive) {
      completionPercentage += 10;
    }

    return {
      profileCompleted: teacher.profileCompleted,
      verificationSubmitted: teacher.verificationSubmitted,
      availabilitySetup: (teacher as any).availabilitySetup || false,
      isLive: (teacher as any).isLive || false,
      status: teacher.status,
      nextSteps,
      completionPercentage,
    };
  }

  async submitVerification(userId: string, verificationDto: SubmitVerificationDto): Promise<TeacherVerificationVm> {
    // Find teacher
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: userId },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found for user ${userId}`);
    }

    if (!teacher.profileCompleted) {
      throw new BadRequestException('Profile setup must be completed before submitting verification');
    }

    if (teacher.verificationSubmitted) {
      throw new ConflictException('Verification documents have already been submitted');
    }

    // Validate required document types
    const documentTypes = verificationDto.documents.map(doc => doc.type);
    const requiredTypes = ['TEACHING_CERTIFICATE', 'EDUCATION_DIPLOMA'];
    const hasRequiredDocs = requiredTypes.every(type => documentTypes.includes(type as any));

    if (!hasRequiredDocs) {
      throw new BadRequestException('At least one teaching certificate and education diploma are required');
    }

    // Create verification record
    const verification = await this.prisma.teacherVerification.create({
      data: {
        teacherId: teacher.id,
        additionalNotes: verificationDto.additionalNotes,
        linkedinUrl: verificationDto.linkedinUrl,
        portfolioUrl: verificationDto.portfolioUrl,
        documents: {
          create: verificationDto.documents.map(doc => ({
            type: doc.type,
            title: doc.title,
            documentUrl: doc.documentUrl,
            description: doc.description,
          })),
        },
      },
      include: {
        documents: true,
      },
    });

    // Update teacher verification status
    await this.prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        verificationSubmitted: true,
      },
    });

    return this.toVerificationVm(verification);
  }

  async getVerification(userId: string): Promise<TeacherVerificationVm> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: userId },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found for user ${userId}`);
    }

    const verification = await this.prisma.teacherVerification.findUnique({
      where: { teacherId: teacher.id },
      include: {
        documents: true,
      },
    });

    if (!verification) {
      throw new NotFoundException('Verification documents not found');
    }

    return this.toVerificationVm(verification);
  }

  async getAllPendingVerifications(): Promise<TeacherVerificationVm[]> {
    const verifications = await this.prisma.teacherVerification.findMany({
      where: {
        teacher: {
          status: TeacherStatus.PENDING,
        },
        reviewedAt: null,
      },
      include: {
        documents: true,
        teacher: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'asc',
      },
    });

    return verifications.map(verification => this.toVerificationVm(verification));
  }

  async reviewVerification(
    teacherId: string,
    status: TeacherStatus,
    reviewDto: VerificationStatusDto,
  ): Promise<TeacherVm> {
    if (status !== TeacherStatus.APPROVED && status !== TeacherStatus.REJECTED) {
      throw new BadRequestException('Status must be either APPROVED or REJECTED');
    }

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        verification: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
    }

    if (!teacher.verification) {
      throw new BadRequestException('No verification documents found for this teacher');
    }

    // Update verification with review notes and timestamp
    await this.prisma.teacherVerification.update({
      where: { teacherId },
      data: {
        reviewNotes: reviewDto.reviewNotes,
        reviewedAt: new Date(),
      },
    });

    // Update teacher status
    const updatedTeacher = await this.prisma.teacher.update({
      where: { id: teacherId },
      data: {
        status,
      },
      include: {
        user: true,
      },
    });

    return this.toTeacherVm(updatedTeacher);
  }

  async resubmitVerification(
    userId: string,
    verificationDto: SubmitVerificationDto,
  ): Promise<TeacherVerificationVm> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: userId },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found for user ${userId}`);
    }

    if (teacher.status !== TeacherStatus.REJECTED) {
      throw new BadRequestException('Verification can only be resubmitted for rejected applications');
    }

    // Delete existing verification documents
    await this.prisma.teacherVerification.deleteMany({
      where: { teacherId: teacher.id },
    });

    // Reset teacher status and verification flags
    await this.prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        status: TeacherStatus.PENDING,
        verificationSubmitted: false,
      },
    });

    // Submit new verification
    return this.submitVerification(userId, verificationDto);
  }

  private toVerificationVm(verification: any): TeacherVerificationVm {
    return {
      id: verification.id,
      teacherId: verification.teacherId,
      documents: verification.documents.map((doc: any) => ({
        id: doc.id,
        type: doc.type,
        title: doc.title,
        documentUrl: doc.documentUrl,
        description: doc.description,
        createdAt: doc.createdAt,
      })),
      additionalNotes: verification.additionalNotes,
      linkedinUrl: verification.linkedinUrl,
      portfolioUrl: verification.portfolioUrl,
      reviewNotes: verification.reviewNotes,
      submittedAt: verification.submittedAt,
      reviewedAt: verification.reviewedAt,
      createdAt: verification.createdAt,
      updatedAt: verification.updatedAt,
    };
  }

  // Availability and Rates Setup Methods

  async setupAvailabilityAndRates(
    userId: string,
    setupDto: SetupAvailabilityAndRatesDto,
  ): Promise<AvailabilityAndRatesVm> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: userId },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found for user ${userId}`);
    }

    if (teacher.status !== TeacherStatus.APPROVED) {
      throw new BadRequestException('Teacher must be approved before setting up availability and rates');
    }

    if (!teacher.profileCompleted || !teacher.verificationSubmitted) {
      throw new BadRequestException('Profile setup and verification must be completed first');
    }

    // Validate availability slots
    this.validateAvailabilitySlots(setupDto.availabilitySlots);

    // Validate rates
    this.validateRates(setupDto.rates);

    return this.prisma.$transaction(async (prisma) => {
      // Clear existing availability and rates
      await prisma.teacherAvailability.deleteMany({
        where: { teacherId: teacher.id },
      });

      await prisma.teacherRate.deleteMany({
        where: { teacherId: teacher.id },
      });

      // Create new availability slots
      const availabilities = await Promise.all(
        setupDto.availabilitySlots.map(slot =>
          prisma.teacherAvailability.create({
            data: {
              teacherId: teacher.id,
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              type: slot.type || AvailabilityType.REGULAR,
              isActive: slot.isActive !== false,
            },
          })
        )
      );

      // Create new rates
      const rates = await Promise.all(
        setupDto.rates.map(rate =>
          prisma.teacherRate.create({
            data: {
              teacherId: teacher.id,
              type: rate.type,
              rate: rate.rate,
              duration: rate.duration || 60,
              maxStudents: rate.maxStudents || 1,
              isActive: rate.isActive !== false,
            },
          })
        )
      );

      // Update teacher with availability setup flag and booking preferences
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: {
          availabilitySetup: true,
          advanceNoticeHours: setupDto.advanceNoticeHours || 24,
          maxAdvanceBookingHours: setupDto.maxAdvanceBookingHours || 720,
          allowInstantBooking: setupDto.allowInstantBooking || false,
          bookingInstructions: setupDto.bookingInstructions,
        },
      });

      return {
        availabilities: availabilities.map(avail => this.toEnhancedAvailabilityVm(avail)),
        rates: rates.map(rate => this.toRateVm(rate)),
        advanceNoticeHours: setupDto.advanceNoticeHours || 24,
        maxAdvanceBookingHours: setupDto.maxAdvanceBookingHours || 720,
        allowInstantBooking: setupDto.allowInstantBooking || false,
        bookingInstructions: setupDto.bookingInstructions,
      };
    });
  }

  async getAvailabilityAndRates(userId: string): Promise<AvailabilityAndRatesVm> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: userId },
      include: {
        availabilities: {
          orderBy: [
            { dayOfWeek: 'asc' },
            { startTime: 'asc' },
          ],
        },
        rates: {
          where: { isActive: true },
          orderBy: { type: 'asc' },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found for user ${userId}`);
    }

    return {
      availabilities: teacher.availabilities.map(avail => this.toEnhancedAvailabilityVm(avail)),
      rates: teacher.rates.map(rate => this.toRateVm(rate)),
      advanceNoticeHours: (teacher as any).advanceNoticeHours,
      maxAdvanceBookingHours: (teacher as any).maxAdvanceBookingHours,
      allowInstantBooking: (teacher as any).allowInstantBooking || false,
      bookingInstructions: (teacher as any).bookingInstructions,
    };
  }

  async updateRate(
    userId: string,
    rateId: string,
    updateDto: UpdateRateDto,
  ): Promise<TeacherRateVm> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: userId },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found for user ${userId}`);
    }

    const rate = await this.prisma.teacherRate.findFirst({
      where: {
        id: rateId,
        teacherId: teacher.id,
      },
    });

    if (!rate) {
      throw new NotFoundException('Rate not found');
    }

    const updatedRate = await this.prisma.teacherRate.update({
      where: { id: rateId },
      data: updateDto,
    });

    return this.toRateVm(updatedRate);
  }

  async goLive(userId: string, goLiveDto: GoLiveRequestDto): Promise<TeacherVm> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: userId },
      include: {
        user: true,
        rates: true,
        availabilities: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found for user ${userId}`);
    }

    // Validate teacher is ready to go live
    if (!teacher.profileCompleted) {
      throw new BadRequestException('Profile setup must be completed');
    }

    if (!teacher.verificationSubmitted) {
      throw new BadRequestException('Verification documents must be submitted');
    }

    if (teacher.status !== TeacherStatus.APPROVED) {
      throw new BadRequestException('Teacher must be approved by admin');
    }

    if (!(teacher as any).availabilitySetup) {
      throw new BadRequestException('Availability and rates must be setup');
    }

    if (teacher.rates.length === 0) {
      throw new BadRequestException('At least one rate must be configured');
    }

    if (teacher.availabilities.length === 0) {
      throw new BadRequestException('At least one availability slot must be configured');
    }

    if (!goLiveDto.confirmReady) {
      throw new BadRequestException('Teacher must confirm they are ready to go live');
    }

    const updatedTeacher = await this.prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        isLive: true,
      },
      include: {
        user: true,
      },
    });

    return this.toTeacherVm(updatedTeacher);
  }

  async getOnboardingStatus(userId: string): Promise<TeacherOnboardingStatusVm> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: userId },
      include: {
        rates: true,
        availabilities: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found for user ${userId}`);
    }

    const status = this.calculateOnboardingStatus(teacher);
    return status;
  }

  async pauseTeacher(userId: string): Promise<TeacherVm> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: userId },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found for user ${userId}`);
    }

    if (!(teacher as any).isLive) {
      throw new BadRequestException('Teacher is not currently live');
    }

    const updatedTeacher = await this.prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        isLive: false,
      },
      include: {
        user: true,
      },
    });

    return this.toTeacherVm(updatedTeacher);
  }

  // Private helper methods

  private validateAvailabilitySlots(slots: any[]): void {
    if (slots.length === 0) {
      throw new BadRequestException('At least one availability slot is required');
    }

    // Check for overlapping slots on the same day
    const daySlots = slots.reduce((acc, slot) => {
      if (!acc[slot.dayOfWeek]) {
        acc[slot.dayOfWeek] = [];
      }
      acc[slot.dayOfWeek].push(slot);
      return acc;
    }, {});

    for (const day in daySlots) {
      const slotsForDay = daySlots[day].sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
      
      for (let i = 0; i < slotsForDay.length - 1; i++) {
        const current = slotsForDay[i];
        const next = slotsForDay[i + 1];
        
        if (current.endTime > next.startTime) {
          throw new BadRequestException(`Overlapping availability slots found on day ${day}`);
        }
      }
    }
  }

  private validateRates(rates: any[]): void {
    if (rates.length === 0) {
      throw new BadRequestException('At least one rate is required');
    }

    const rateTypes = rates.map(rate => rate.type);
    const uniqueTypes = new Set(rateTypes);

    if (rateTypes.length !== uniqueTypes.size) {
      throw new BadRequestException('Duplicate rate types are not allowed');
    }

    // Ensure trial lesson rate exists and is lower than regular lesson
    const trialRate = rates.find(rate => rate.type === RateType.TRIAL_LESSON);
    const regularRate = rates.find(rate => rate.type === RateType.REGULAR_LESSON);

    if (trialRate && regularRate && trialRate.rate >= regularRate.rate) {
      throw new BadRequestException('Trial lesson rate must be lower than regular lesson rate');
    }
  }

  private toRateVm(rate: any): TeacherRateVm {
    return {
      id: rate.id,
      teacherId: rate.teacherId,
      type: rate.type,
      rate: rate.rate.toString(),
      duration: rate.duration,
      maxStudents: rate.maxStudents,
      isActive: rate.isActive,
      createdAt: rate.createdAt,
      updatedAt: rate.updatedAt,
    };
  }

  private toEnhancedAvailabilityVm(availability: any): EnhancedTeacherAvailabilityVm {
    return {
      id: availability.id,
      teacherId: availability.teacherId,
      dayOfWeek: availability.dayOfWeek,
      startTime: availability.startTime,
      endTime: availability.endTime,
      type: availability.type || AvailabilityType.REGULAR,
      isActive: availability.isActive,
      createdAt: availability.createdAt,
    };
  }

  private calculateOnboardingStatus(teacher: any): TeacherOnboardingStatusVm {
    const steps = [
      { key: 'profileCompleted', label: 'Profile Setup' },
      { key: 'verificationSubmitted', label: 'Verification Submitted' },
      { key: 'verificationApproved', label: 'Verification Approved' },
      { key: 'availabilitySetup', label: 'Availability & Rates Setup' },
      { key: 'isLive', label: 'Profile Live' },
    ];

    const verificationApproved = teacher.status === TeacherStatus.APPROVED;
    const availabilitySetup = teacher.availabilitySetup && teacher.rates.length > 0 && teacher.availabilities.length > 0;
    
    const status = {
      profileCompleted: teacher.profileCompleted,
      verificationSubmitted: teacher.verificationSubmitted,
      verificationApproved,
      availabilitySetup,
      isLive: teacher.isLive,
    };

    const completedSteps = Object.values(status).filter(Boolean).length;
    const completionPercentage = Math.round((completedSteps / steps.length) * 100);

    let currentStep = 'PROFILE_SETUP';
    const nextSteps: string[] = [];

    if (!status.profileCompleted) {
      currentStep = 'PROFILE_SETUP';
      nextSteps.push('Complete your teacher profile');
    } else if (!status.verificationSubmitted) {
      currentStep = 'VERIFICATION_SUBMISSION';
      nextSteps.push('Submit verification documents');
    } else if (!status.verificationApproved) {
      currentStep = 'VERIFICATION_PENDING';
      nextSteps.push('Wait for admin approval');
    } else if (!status.availabilitySetup) {
      currentStep = 'AVAILABILITY_SETUP';
      nextSteps.push('Set up your availability schedule');
      nextSteps.push('Configure your lesson rates');
    } else if (!status.isLive) {
      currentStep = 'READY_TO_GO_LIVE';
      nextSteps.push('Go live to start receiving bookings');
    } else {
      currentStep = 'LIVE';
      nextSteps.push('Your profile is live and accepting bookings!');
    }

    const canGoLive = status.profileCompleted && 
                     status.verificationSubmitted && 
                     status.verificationApproved && 
                     status.availabilitySetup;

    return {
      currentStep,
      profileCompleted: status.profileCompleted,
      verificationSubmitted: status.verificationSubmitted,
      verificationApproved: status.verificationApproved,
      availabilitySetup: status.availabilitySetup,
      isLive: status.isLive,
      completionPercentage,
      nextSteps,
      canGoLive,
    };
  }

  async findLiveTeachers(): Promise<TeacherVm[]> {
    const teachers = await this.prisma.teacher.findMany({
      where: {
        isLive: true,
        status: TeacherStatus.APPROVED,
        user: {
          isActive: true,
        },
      },
      include: {
        user: true,
      },
      orderBy: {
        averageRating: 'desc',
      },
    });

    return teachers.map(teacher => this.toTeacherVm(teacher as any));
  }

  async getAvailableSlots(
    teacherId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        availabilities: {
          where: { isActive: true },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
    }

    if (!(teacher as any).isLive) {
      throw new BadRequestException('Teacher is not currently accepting bookings');
    }

    // Calculate available slots based on availability and existing bookings
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const availableSlots = await this.calculateAvailableSlots(teacher as any, start, end);

    return {
      teacherId,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      slots: availableSlots,
      advanceNoticeHours: (teacher as any).advanceNoticeHours || 24,
      maxAdvanceBookingHours: (teacher as any).maxAdvanceBookingHours || 720,
      allowInstantBooking: (teacher as any).allowInstantBooking || false,
    };
  }

  private async calculateAvailableSlots(teacher: any, startDate: Date, endDate: Date): Promise<any[]> {
    const slots: any[] = [];
    const availabilities = teacher.availabilities || [];

    // Get existing bookings in the date range
    const existingBookings = await this.prisma.booking.findMany({
      where: {
        teacherId: teacher.id,
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['CONFIRMED', 'PENDING'],
        },
      },
    });

    // Generate slots for each day in the range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const dayAvailabilities = availabilities.filter((avail: any) => avail.dayOfWeek === dayOfWeek);

      for (const availability of dayAvailabilities) {
        const daySlots = this.generateSlotsForDay(d, availability, existingBookings, teacher);
        slots.push(...daySlots);
      }
    }

    return slots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  private generateSlotsForDay(date: Date, availability: any, existingBookings: any[], teacher: any): any[] {
    const slots: any[] = [];
    const [startHour, startMinute] = availability.startTime.split(':').map(Number);
    const [endHour, endMinute] = availability.endTime.split(':').map(Number);

    const slotStartTime = new Date(date);
    slotStartTime.setHours(startHour, startMinute, 0, 0);

    const slotEndTime = new Date(date);
    slotEndTime.setHours(endHour, endMinute, 0, 0);

    // Check if slot is in the future considering advance notice
    const now = new Date();
    const advanceNoticeMs = ((teacher as any).advanceNoticeHours || 24) * 60 * 60 * 1000;
    const minBookingTime = new Date(now.getTime() + advanceNoticeMs);

    // Generate 30-minute slots (can be configurable)
    const slotDuration = 30 * 60 * 1000; // 30 minutes in milliseconds

    for (let time = slotStartTime.getTime(); time < slotEndTime.getTime(); time += slotDuration) {
      const slotStart = new Date(time);
      const slotEnd = new Date(time + slotDuration);

      // Check if slot is available
      if (slotStart >= minBookingTime && !this.isSlotBooked(slotStart, slotEnd, existingBookings)) {
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          available: true,
          duration: 30, // minutes
        });
      }
    }

    return slots;
  }

  private isSlotBooked(slotStart: Date, slotEnd: Date, bookings: any[]): boolean {
    return bookings.some(booking => {
      const bookingStart = new Date(booking.scheduledAt);
      const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60 * 1000);

      return (slotStart < bookingEnd && slotEnd > bookingStart);
    });
  }

  async getAvailableSpecialties(): Promise<string[]> {
    const teachers = await this.prisma.teacher.findMany({
      where: {
        status: TeacherStatus.APPROVED,
        isLive: true,
        user: { isActive: true },
      },
      select: { specialties: true },
    });

    // Flatten and deduplicate specialties
    const allSpecialties = teachers.flatMap(teacher => teacher.specialties);
    return [...new Set(allSpecialties)].sort();
  }

  async getAvailableLanguages(): Promise<string[]> {
    const teachers = await this.prisma.teacher.findMany({
      where: {
        status: TeacherStatus.APPROVED,
        isLive: true,
        user: { isActive: true },
      },
      select: { languages: true },
    });

    // Flatten and deduplicate languages
    const allLanguages = teachers.flatMap(teacher => teacher.languages);
    return [...new Set(allLanguages)].sort();
  }

  async getAvailableTimezones(): Promise<string[]> {
    const teachers = await this.prisma.teacher.findMany({
      where: {
        status: TeacherStatus.APPROVED,
        isLive: true,
        user: { isActive: true },
      },
      select: { timezone: true },
      distinct: ['timezone'],
    });

    return teachers.map(teacher => teacher.timezone).sort();
  }

  async getFeaturedTeachers(limit: number = 8): Promise<TeacherVm[]> {
    const teachers = await this.prisma.teacher.findMany({
      where: {
        status: TeacherStatus.APPROVED,
        isLive: true,
        user: { isActive: true },
        averageRating: { gte: 4.5 }, // Only highly rated teachers
        totalLessons: { gte: 10 }, // Teachers with some experience
      },
      include: { user: true },
      orderBy: [
        { averageRating: 'desc' },
        { totalLessons: 'desc' },
      ],
      take: limit,
    });

    return teachers.map(teacher => this.toTeacherVm(teacher));
  }

  async getTeacherRecentReviews(teacherId: string, limit: number = 5): Promise<any[]> {
    const reviews = await this.prisma.review.findMany({
      where: { teacherId },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return reviews.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      studentName: `${review.student.firstName} ${review.student.lastName}`,
      studentAvatar: review.student.avatar,
      createdAt: review.createdAt,
    }));
  }

  async getTeacherRates(teacherId: string): Promise<TeacherRateVm[]> {
    const rates = await this.prisma.teacherRate.findMany({
      where: { teacherId },
      orderBy: { type: 'asc' },
    });

    return rates.map(rate => ({
      id: rate.id,
      teacherId: rate.teacherId,
      type: rate.type as RateType,
      rate: rate.rate.toString(),
      duration: rate.duration,
      maxStudents: rate.maxStudents,
      isActive: rate.isActive,
      createdAt: rate.createdAt,
      updatedAt: rate.updatedAt,
    }));
  }

  async findBySpecialty(specialty: string, limit: number = 20): Promise<TeacherVm[]> {
    const teachers = await this.prisma.teacher.findMany({
      where: {
        status: TeacherStatus.APPROVED,
        isLive: true,
        user: { isActive: true },
        specialties: {
          has: specialty,
        },
      },
      include: { user: true },
      orderBy: [
        { averageRating: 'desc' },
        { totalLessons: 'desc' },
      ],
      take: limit,
    });

    return teachers.map(teacher => this.toTeacherVm(teacher));
  }

  /**
   * Get teacher interest information for the booking decision flow
   * This provides all necessary data for a student to decide whether to book a trial lesson
   */
  async getTeacherInterestInfo(teacherId: string, studentUserId?: string): Promise<any> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { 
        id: teacherId,
        status: TeacherStatus.APPROVED,
        isLive: true,
      },
      include: {
        user: true,
        rates: {
          where: { isActive: true },
          orderBy: { type: 'asc' },
        },
        reviews: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found or not available for booking');
    }

    // Check if student already had a trial lesson with this teacher
    let hasTrialLesson = false;
    let canBookTrial = true;

    if (studentUserId) {
      const student = await this.prisma.student.findUnique({
        where: { id: studentUserId },
      });

      if (student) {
        const existingTrial = await this.prisma.booking.findFirst({
          where: {
            studentId: student.id,
            teacherId,
            isTrialLesson: true,
            status: { in: ['CONFIRMED', 'COMPLETED', 'PENDING'] },
          },
        });

        hasTrialLesson = !!existingTrial;
        canBookTrial = !hasTrialLesson;
      }
    }

    // Get trial lesson rate
    const trialRate = teacher.rates.find(rate => rate.type === 'TRIAL_LESSON');
    const regularRate = teacher.rates.find(rate => rate.type === 'REGULAR_LESSON');

    // Get next available slots (next 3 days)
    const availableSlots = await this.getAvailableSlots(teacherId, undefined, undefined);

    // Get teacher statistics
    const stats = await this.getTeacherStats(teacherId);

    return {
      teacher: {
        id: teacher.id,
        fullName: `${teacher.user.firstName} ${teacher.user.lastName}`,
        avatar: teacher.user.avatar,
        bio: teacher.bio,
        experience: teacher.experience,
        specialties: teacher.specialties,
        languages: teacher.languages,
        hourlyRate: teacher.hourlyRate.toString(),
        averageRating: teacher.averageRating?.toString(),
        totalLessons: teacher.totalLessons,
        responseTime: teacher.responseTime,
        timezone: teacher.timezone,
        videoIntroUrl: teacher.videoIntroUrl,
      },
      bookingInfo: {
        canBookTrial,
        hasTrialLesson,
        trialLessonRate: trialRate?.rate?.toString(),
        trialLessonDuration: trialRate?.duration || 30,
        regularLessonRate: regularRate?.rate?.toString(),
        regularLessonDuration: regularRate?.duration || 60,
        advanceNoticeHours: (teacher as any).advanceNoticeHours || 24,
        allowInstantBooking: (teacher as any).allowInstantBooking || false,
        bookingInstructions: (teacher as any).bookingInstructions,
      },
      availability: {
        nextAvailableSlots: availableSlots.slots?.slice(0, 6) || [], // Show first 6 slots
        totalSlotsAvailable: availableSlots.slots?.length || 0,
      },
      reviews: teacher.reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        studentName: `${review.student.firstName} ${review.student.lastName}`,
        studentAvatar: review.student.avatar,
      })),
      stats: {
        totalLessons: stats.totalLessons,
        totalReviews: stats.totalReviews,
        averageRating: stats.averageRating,
        responseTime: stats.responseTime,
      },
      actionOptions: {
        canBookTrialLesson: canBookTrial,
        canBookRegularLesson: !canBookTrial || hasTrialLesson,
        trialLessonPrice: trialRate?.rate?.toString(),
        regularLessonPrice: regularRate?.rate?.toString(),
        recommendedAction: canBookTrial ? 'BOOK_TRIAL' : 'BOOK_REGULAR',
      },
    };
  }

  /**
   * Generate booking decision options for a student interested in a teacher
   */
  async generateBookingOptions(teacherId: string, studentUserId?: string): Promise<any> {
    const interestInfo = await this.getTeacherInterestInfo(teacherId, studentUserId);
    
    const options = [];

    // Option 1: Book Trial Lesson (if eligible)
    if (interestInfo.actionOptions.canBookTrialLesson) {
      options.push({
        action: 'BOOK_TRIAL_LESSON',
        title: 'Book Trial Lesson',
        description: `Try a ${interestInfo.bookingInfo.trialLessonDuration}-minute trial lesson`,
        price: interestInfo.bookingInfo.trialLessonRate,
        currency: 'USD',
        duration: interestInfo.bookingInfo.trialLessonDuration,
        buttonText: 'Book Trial Lesson',
        buttonStyle: 'primary',
        benefits: [
          'Get to know the teacher',
          'Test teaching style',
          'Discounted rate',
          'No long-term commitment',
        ],
        endpoint: '/bookings/trial',
        method: 'POST',
        payload: {
          teacherId,
          duration: interestInfo.bookingInfo.trialLessonDuration,
        },
      });
    }

    // Option 2: Book Regular Lesson
    if (interestInfo.actionOptions.canBookRegularLesson) {
      options.push({
        action: 'BOOK_REGULAR_LESSON',
        title: 'Book Regular Lesson',
        description: `Book a ${interestInfo.bookingInfo.regularLessonDuration}-minute lesson`,
        price: interestInfo.bookingInfo.regularLessonRate,
        currency: 'USD',
        duration: interestInfo.bookingInfo.regularLessonDuration,
        buttonText: 'Book Lesson',
        buttonStyle: interestInfo.actionOptions.canBookTrialLesson ? 'secondary' : 'primary',
        benefits: [
          'Full lesson experience',
          'Comprehensive learning',
          'Progress tracking',
          'Homework assignments',
        ],
        endpoint: '/bookings',
        method: 'POST',
        payload: {
          teacherId,
          duration: interestInfo.bookingInfo.regularLessonDuration,
          isTrialLesson: false,
        },
      });
    }

    // Option 3: View Available Times
    options.push({
      action: 'VIEW_AVAILABILITY',
      title: 'Check Availability',
      description: 'See all available time slots',
      buttonText: 'View Schedule',
      buttonStyle: 'outline',
      endpoint: `/teachers/${teacherId}/available-slots`,
      method: 'GET',
    });

    // Option 4: Back to Teachers List
    options.push({
      action: 'BACK_TO_LIST',
      title: 'Continue Browsing',
      description: 'Look for other teachers',
      buttonText: 'Back to Teachers',
      buttonStyle: 'text',
      endpoint: '/teachers/browse',
      method: 'GET',
    });

    // Option 5: Save for Later (if authenticated)
    if (studentUserId) {
      options.push({
        action: 'SAVE_FOR_LATER',
        title: 'Save Teacher',
        description: 'Remember this teacher for later',
        buttonText: 'Save for Later',
        buttonStyle: 'outline',
        endpoint: `/teachers/${teacherId}/save`,
        method: 'POST',
        payload: { teacherId },
      });
    }

    return {
      teacherInfo: {
        id: interestInfo.teacher.id,
        name: interestInfo.teacher.fullName,
        avatar: interestInfo.teacher.avatar,
        rating: interestInfo.teacher.averageRating,
        specialties: interestInfo.teacher.specialties,
      },
      recommendedAction: interestInfo.actionOptions.recommendedAction,
      availableSlots: interestInfo.availability.totalSlotsAvailable,
      options,
      decisionFlow: {
        title: `Interested in ${interestInfo.teacher.fullName}?`,
        subtitle: `Choose your next step to start learning with this teacher`,
        primaryRecommendation: interestInfo.actionOptions.canBookTrialLesson 
          ? 'We recommend starting with a trial lesson to see if this teacher is right for you!'
          : 'Book a lesson to start your learning journey!',
      },
    };
  }
}
