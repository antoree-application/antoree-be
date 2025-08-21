import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateBookingDto, BookTrialLessonDto, BookCourseDto } from './dto/create-booking.dto';
import { UpdateBookingDto, RescheduleBookingDto } from './dto/update-booking.dto';
import { SearchBookingDto, GetAvailableTimesDto } from './dto/search-booking.dto';
import {
  CreateBookingWithDetailsDto,
  ConfirmBookingDto,
  TeacherBookingActionDto,
} from './dto/booking-flow.dto';
import {
  BookingVm,
  BookingSearchResultVm,
  TeacherAvailabilityVm,
  AvailableTimeSlotVm,
  BookingStatsVm,
} from './vm/booking.vm';
import {
  TeacherAvailabilitySlotsVm,
  BookingFlowTimeSlotVm,
  BookingRequestVm,
  BookingConfirmationVm,
  TeacherNotificationVm,
  BookingActionResponseVm,
  BookingFlowStatusVm,
} from './vm/booking-flow.vm';
import {
  Booking,
  Student,
  Teacher,
  Course,
  User,
  BookingStatus,
  TeacherStatus,
  UserRole,
  LessonStatus,
  EnglishLevel,
} from '@prisma/client';

type BookingWithRelations = Booking & {
  student: Student & { user: User };
  teacher: Teacher & { user: User };
  course?: Course | null;
  lesson?: { id: string; status: LessonStatus; meetingUrl?: string } | null;
};

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  private toBookingVm(booking: BookingWithRelations): BookingVm {
    return {
      id: booking.id,
      studentId: booking.studentId,
      teacherId: booking.teacherId,
      courseId: booking.courseId,
      scheduledAt: booking.scheduledAt,
      duration: booking.duration,
      notes: booking.notes,
      status: booking.status,
      isTrialLesson: booking.isTrialLesson,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      student: {
        id: booking.student.id,
        user: {
          firstName: booking.student.user.firstName,
          lastName: booking.student.user.lastName,
          email: booking.student.user.email,
          avatar: booking.student.user.avatar,
        },
        englishLevel: booking.student.englishLevel,
        timezone: booking.student.timezone,
      },
      teacher: {
        id: booking.teacher.id,
        user: {
          firstName: booking.teacher.user.firstName,
          lastName: booking.teacher.user.lastName,
          email: booking.teacher.user.email,
          avatar: booking.teacher.user.avatar,
        },
        hourlyRate: booking.teacher.hourlyRate.toString(),
        timezone: booking.teacher.timezone,
        averageRating: booking.teacher.averageRating?.toString(),
      },
      course: booking.course ? {
        id: booking.course.id,
        name: booking.course.name,
        description: booking.course.description,
        level: booking.course.level,
        price: booking.course.price.toString(),
      } : undefined,
      lesson: booking.lesson ? {
        id: booking.lesson.id,
        status: booking.lesson.status,
        meetingUrl: booking.lesson.meetingUrl,
      } : undefined,
    };
  }

  async create(createBookingDto: CreateBookingDto, studentId: string): Promise<BookingVm> {
    // Validate student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Validate teacher exists and is approved
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: createBookingDto.teacherId },
      include: { user: true },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (teacher.status !== TeacherStatus.APPROVED) {
      throw new BadRequestException('Teacher is not approved for bookings');
    }

    if (!teacher.user.isActive) {
      throw new BadRequestException('Teacher account is not active');
    }

    // Validate course if provided
    let course = null;
    if (createBookingDto.courseId) {
      course = await this.prisma.course.findUnique({
        where: { id: createBookingDto.courseId },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      if (course.teacherId !== createBookingDto.teacherId) {
        throw new BadRequestException('Course does not belong to the specified teacher');
      }

      if (!course.isActive) {
        throw new BadRequestException('Course is not available for booking');
      }
    }

    const scheduledAt = new Date(createBookingDto.scheduledAt);
    
    // Validate booking time is in the future
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Booking time must be in the future');
    }

    // Check if teacher is available at the requested time
    await this.validateTeacherAvailability(
      createBookingDto.teacherId,
      scheduledAt,
      createBookingDto.duration || 30
    );

    // Check for conflicting bookings
    await this.checkForConflicts(
      createBookingDto.teacherId,
      studentId,
      scheduledAt,
      createBookingDto.duration || 30
    );

    // Create booking
    const booking = await this.prisma.booking.create({
      data: {
        studentId,
        teacherId: createBookingDto.teacherId,
        courseId: createBookingDto.courseId,
        scheduledAt,
        duration: createBookingDto.duration || 30,
        notes: createBookingDto.notes,
        isTrialLesson: createBookingDto.isTrialLesson ?? true,
        status: BookingStatus.PENDING,
      },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        course: true,
        lesson: true,
      },
    });

    return this.toBookingVm(booking);
  }

  async bookTrialLesson(bookTrialDto: BookTrialLessonDto, studentId: string): Promise<BookingVm> {
    // Check if student already had a trial with this teacher
    const existingTrial = await this.prisma.booking.findFirst({
      where: {
        studentId,
        teacherId: bookTrialDto.teacherId,
        isTrialLesson: true,
        status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
      },
    });

    if (existingTrial) {
      throw new ConflictException('Student already had a trial lesson with this teacher');
    }

    return this.create({
      teacherId: bookTrialDto.teacherId,
      scheduledAt: bookTrialDto.scheduledAt,
      duration: bookTrialDto.duration || 30,
      notes: bookTrialDto.notes,
      isTrialLesson: true,
    }, studentId);
  }

  async bookCourse(bookCourseDto: BookCourseDto, studentId: string): Promise<BookingVm> {
    const course = await this.prisma.course.findUnique({
      where: { id: bookCourseDto.courseId },
      include: { teacher: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return this.create({
      teacherId: course.teacherId,
      courseId: bookCourseDto.courseId,
      scheduledAt: bookCourseDto.preferredStartDate,
      duration: course.duration,
      notes: bookCourseDto.notes,
      isTrialLesson: false,
    }, studentId);
  }

  async findAll(): Promise<BookingVm[]> {
    const bookings = await this.prisma.booking.findMany({
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        course: true,
        lesson: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map(booking => this.toBookingVm(booking));
  }

  async findOne(id: string, userId?: string, userRole?: UserRole): Promise<BookingVm> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        course: true,
        lesson: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Check authorization
    if (userId && userRole !== UserRole.ADMIN) {
      const hasAccess = booking.student.id === userId || booking.teacher.id === userId;
      if (!hasAccess) {
        throw new ForbiddenException('You can only access your own bookings');
      }
    }

    return this.toBookingVm(booking);
  }

  async search(searchDto: SearchBookingDto): Promise<BookingSearchResultVm> {
    const {
      status,
      teacherId,
      studentId,
      courseId,
      startDate,
      endDate,
      isTrialLesson,
      searchNotes,
      page = 1,
      limit = 10,
      sortBy = 'scheduledAt',
      sortOrder = 'desc',
    } = searchDto;

    const where: any = {};

    if (status) where.status = status;
    if (teacherId) where.teacherId = teacherId;
    if (studentId) where.studentId = studentId;
    if (courseId) where.courseId = courseId;
    if (isTrialLesson !== undefined) where.isTrialLesson = isTrialLesson;

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate);
      if (endDate) where.scheduledAt.lte = new Date(endDate);
    }

    if (searchNotes) {
      where.notes = { contains: searchNotes, mode: 'insensitive' };
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          student: { include: { user: true } },
          teacher: { include: { user: true } },
          course: true,
          lesson: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      bookings: bookings.map(booking => this.toBookingVm(booking)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByStudent(studentId: string): Promise<BookingVm[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { studentId },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        course: true,
        lesson: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });

    return bookings.map(booking => this.toBookingVm(booking));
  }

  async findByTeacher(teacherId: string): Promise<BookingVm[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { teacherId },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        course: true,
        lesson: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });

    return bookings.map(booking => this.toBookingVm(booking));
  }

  async update(id: string, updateBookingDto: UpdateBookingDto, userId?: string, userRole?: UserRole): Promise<BookingVm> {
    const existingBooking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
      },
    });

    if (!existingBooking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Check authorization
    if (userId && userRole !== UserRole.ADMIN) {
      const hasAccess = existingBooking.student.id === userId || existingBooking.teacher.id === userId;
      if (!hasAccess) {
        throw new ForbiddenException('You can only modify your own bookings');
      }
    }

    // Validate status transitions
    if (updateBookingDto.status) {
      this.validateStatusTransition(existingBooking.status, updateBookingDto.status);
    }

    // If rescheduling, validate new time
    if (updateBookingDto.scheduledAt) {
      const newScheduledAt = new Date(updateBookingDto.scheduledAt);
      
      if (newScheduledAt <= new Date()) {
        throw new BadRequestException('New booking time must be in the future');
      }

      await this.validateTeacherAvailability(
        existingBooking.teacherId,
        newScheduledAt,
        updateBookingDto.duration || existingBooking.duration,
        id // Exclude current booking from conflict check
      );
    }

    const booking = await this.prisma.booking.update({
      where: { id },
      data: {
        scheduledAt: updateBookingDto.scheduledAt ? new Date(updateBookingDto.scheduledAt) : undefined,
        duration: updateBookingDto.duration,
        notes: updateBookingDto.notes,
        status: updateBookingDto.status,
      },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        course: true,
        lesson: true,
      },
    });

    return this.toBookingVm(booking);
  }

  async reschedule(id: string, rescheduleDto: RescheduleBookingDto, userId?: string, userRole?: UserRole): Promise<BookingVm> {
    return this.update(id, {
      scheduledAt: rescheduleDto.newScheduledAt,
      notes: rescheduleDto.reason ? `Rescheduled: ${rescheduleDto.reason}` : undefined,
    }, userId, userRole);
  }

  async confirm(id: string, userId?: string, userRole?: UserRole): Promise<BookingVm> {
    return this.update(id, { status: BookingStatus.CONFIRMED }, userId, userRole);
  }

  async cancel(id: string, reason?: string, userId?: string, userRole?: UserRole): Promise<BookingVm> {
    const booking = await this.findOne(id, userId, userRole);
    
    // Check if booking can be cancelled
    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed booking');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    // Check cancellation timing (e.g., at least 24 hours before)
    const now = new Date();
    const scheduledAt = new Date(booking.scheduledAt);
    const hoursUntilBooking = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilBooking < 24 && userRole !== UserRole.ADMIN) {
      throw new BadRequestException('Bookings can only be cancelled at least 24 hours in advance');
    }

    const updateData: any = { status: BookingStatus.CANCELLED };
    if (reason) {
      updateData.notes = booking.notes ? `${booking.notes}\nCancellation reason: ${reason}` : `Cancellation reason: ${reason}`;
    }

    return this.update(id, updateData, userId, userRole);
  }

  async complete(id: string, userId?: string, userRole?: UserRole): Promise<BookingVm> {
    const booking = await this.findOne(id, userId, userRole);

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be marked as completed');
    }

    // Create lesson if not exists
    if (!booking.lesson) {
      await this.prisma.lesson.create({
        data: {
          bookingId: id,
          studentId: booking.studentId,
          teacherId: booking.teacherId,
          courseId: booking.courseId,
          scheduledAt: booking.scheduledAt,
          duration: booking.duration,
          status: LessonStatus.COMPLETED,
        },
      });
    }

    const completedBooking = await this.update(id, { status: BookingStatus.COMPLETED }, userId, userRole);

    // If this is a trial lesson, trigger feedback notification
    if (booking.isTrialLesson) {
      await this.triggerTrialLessonFeedbackNotification(id, booking.studentId);
    }

    return completedBooking;
  }

  async remove(id: string, userId?: string, userRole?: UserRole): Promise<BookingVm> {
    const booking = await this.findOne(id, userId, userRole);

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot delete a completed booking');
    }

    await this.prisma.booking.delete({ where: { id } });
    return booking;
  }

  // Availability Methods
  async getTeacherAvailability(teacherId: string, daysAhead: number = 7, duration: number = 60): Promise<TeacherAvailabilityVm> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        user: true,
        availabilities: { where: { isActive: true } },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const availability: AvailableTimeSlotVm[] = [];
    const today = new Date();
    
    for (let i = 0; i < daysAhead; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      
      const dayOfWeek = checkDate.getDay();
      const dateStr = checkDate.toISOString().split('T')[0];
      
      // Find teacher's availability for this day
      const dayAvailability = teacher.availabilities.filter(av => av.dayOfWeek === dayOfWeek);
      
      if (dayAvailability.length === 0) {
        continue;
      }

      // Get available time slots for this date
      const timeSlots = await this.getAvailableTimeSlots(teacherId, checkDate, duration);
      
      if (timeSlots.length > 0) {
        availability.push({
          date: dateStr,
          dayOfWeek,
          timeSlots,
          isToday: i === 0,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        });
      }
    }

    return {
      teacherId,
      teacherName: `${teacher.user.firstName} ${teacher.user.lastName}`,
      timezone: teacher.timezone,
      availability,
    };
  }

  async getAvailableTimeSlots(teacherId: string, date: Date, duration: number): Promise<string[]> {
    const dayOfWeek = date.getDay();
    
    // Get teacher's availability for this day
    const availabilities = await this.prisma.teacherAvailability.findMany({
      where: {
        teacherId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (availabilities.length === 0) {
      return [];
    }

    // Get existing bookings for this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        teacherId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
      },
    });

    const availableSlots: string[] = [];
    
    for (const availability of availabilities) {
      const startTime = this.parseTime(availability.startTime);
      const endTime = this.parseTime(availability.endTime);
      
      // Generate time slots
      let currentTime = startTime;
      while (currentTime + duration <= endTime) {
        const slotStart = new Date(date);
        slotStart.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + duration);
        
        // Check if slot conflicts with existing bookings
        const hasConflict = existingBookings.some(booking => {
          const bookingStart = new Date(booking.scheduledAt);
          const bookingEnd = new Date(bookingStart);
          bookingEnd.setMinutes(bookingEnd.getMinutes() + booking.duration);
          
          return (slotStart < bookingEnd && slotEnd > bookingStart);
        });
        
        if (!hasConflict && slotStart > new Date()) {
          availableSlots.push(this.formatTime(currentTime));
        }
        
        currentTime += 30; // 30-minute intervals
      }
    }

    return availableSlots.sort();
  }

  // Statistics Methods
  async getBookingStats(userId?: string, userRole?: UserRole): Promise<BookingStatsVm> {
    const where: any = {};
    
    // Apply user-specific filters
    if (userId && userRole === UserRole.STUDENT) {
      const student = await this.prisma.student.findUnique({ where: { id: userId } });
      if (student) where.studentId = student.id;
    } else if (userId && userRole === UserRole.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({ where: { id: userId } });
      if (teacher) where.teacherId = teacher.id;
    }

    const [
      totalBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      trialLessons,
      courseBookings,
      statusBreakdown,
      recentBookings,
      upcomingBookings,
    ] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.count({ where: { ...where, status: BookingStatus.CONFIRMED } }),
      this.prisma.booking.count({ where: { ...where, status: BookingStatus.COMPLETED } }),
      this.prisma.booking.count({ where: { ...where, status: BookingStatus.CANCELLED } }),
      this.prisma.booking.count({ where: { ...where, isTrialLesson: true } }),
      this.prisma.booking.count({ where: { ...where, isTrialLesson: false } }),
      this.getStatusBreakdown(where),
      this.getRecentBookingsCount(where),
      this.getUpcomingBookingsCount(where),
    ]);

    return {
      totalBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      trialLessons,
      courseBookings,
      statusBreakdown,
      recentBookings,
      upcomingBookings,
    };
  }

  // Private helper methods
  private async validateTeacherAvailability(
    teacherId: string,
    scheduledAt: Date,
    duration: number,
    excludeBookingId?: string
  ): Promise<void> {
    const dayOfWeek = scheduledAt.getDay();
    const timeInMinutes = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
    
    // Check if teacher has availability for this day and time
    const availability = await this.prisma.teacherAvailability.findFirst({
      where: {
        teacherId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (!availability) {
      throw new BadRequestException('Teacher is not available on this day');
    }

    const startTime = this.parseTime(availability.startTime);
    const endTime = this.parseTime(availability.endTime);

    if (timeInMinutes < startTime || timeInMinutes + duration > endTime) {
      throw new BadRequestException('Requested time is outside teacher availability hours');
    }
  }

  private async checkForConflicts(
    teacherId: string,
    studentId: string,
    scheduledAt: Date,
    duration: number,
    excludeBookingId?: string
  ): Promise<void> {
    const bookingStart = new Date(scheduledAt);
    const bookingEnd = new Date(scheduledAt);
    bookingEnd.setMinutes(bookingEnd.getMinutes() + duration);

    const where: any = {
      OR: [
        { teacherId },
        { studentId },
      ],
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
      scheduledAt: {
        lt: bookingEnd,
      },
    };

    if (excludeBookingId) {
      where.id = { not: excludeBookingId };
    }

    const conflictingBookings = await this.prisma.booking.findMany({
      where,
      select: {
        id: true,
        scheduledAt: true,
        duration: true,
        teacherId: true,
        studentId: true,
      },
    });

    for (const booking of conflictingBookings) {
      const existingStart = new Date(booking.scheduledAt);
      const existingEnd = new Date(booking.scheduledAt);
      existingEnd.setMinutes(existingEnd.getMinutes() + booking.duration);

      if (bookingStart < existingEnd && bookingEnd > existingStart) {
        if (booking.teacherId === teacherId) {
          throw new ConflictException('Teacher already has a booking at this time');
        }
        if (booking.studentId === studentId) {
          throw new ConflictException('Student already has a booking at this time');
        }
      }
    }
  }

  private validateStatusTransition(currentStatus: BookingStatus, newStatus: BookingStatus): void {
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
      [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
      [BookingStatus.COMPLETED]: [], // No transitions allowed from completed
      [BookingStatus.CANCELLED]: [], // No transitions allowed from cancelled
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private async getStatusBreakdown(where: any): Promise<Record<BookingStatus, number>> {
    const result: Record<BookingStatus, number> = {
      [BookingStatus.PENDING]: 0,
      [BookingStatus.CONFIRMED]: 0,
      [BookingStatus.COMPLETED]: 0,
      [BookingStatus.CANCELLED]: 0,
    };

    const counts = await this.prisma.booking.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    counts.forEach(({ status, _count }) => {
      result[status] = _count.status;
    });

    return result;
  }

  private async getRecentBookingsCount(where: any): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.prisma.booking.count({
      where: {
        ...where,
        createdAt: { gte: thirtyDaysAgo },
      },
    });
  }

  private async getUpcomingBookingsCount(where: any): Promise<number> {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return this.prisma.booking.count({
      where: {
        ...where,
        scheduledAt: {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
      },
    });
  }

  // === BOOKING FLOW METHODS ===

  async getAvailableTimeSlotsForBooking(
    teacherId: string,
    startDate?: string,
    endDate?: string,
    duration: number = 30,
    timezone?: string
  ): Promise<TeacherAvailabilitySlotsVm> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        user: true,
        availabilities: { where: { isActive: true } },
        rates: { where: { isActive: true } },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (teacher.status !== TeacherStatus.APPROVED || !teacher.isLive) {
      throw new BadRequestException('Teacher is not available for booking');
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead

    const availableSlots: BookingFlowTimeSlotVm[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dayAvailabilities = teacher.availabilities.filter(av => av.dayOfWeek === dayOfWeek);

      for (const availability of dayAvailabilities) {
        const slots = await this.generateTimeSlotsForDay(
          teacherId,
          current,
          availability,
          duration,
          teacher.rates
        );
        availableSlots.push(...slots);
      }

      current.setDate(current.getDate() + 1);
    }

    // Find next available date if no slots in range
    let nextAvailableDate: string | undefined;
    if (availableSlots.length === 0) {
      nextAvailableDate = await this.findNextAvailableDate(teacherId, end, duration);
    }

    return {
      teacherId,
      teacherName: `${teacher.user.firstName} ${teacher.user.lastName}`,
      timezone: teacher.timezone,
      availableSlots,
      bookingPolicies: {
        advanceNoticeHours: teacher.advanceNoticeHours || 24,
        maxAdvanceBookingHours: teacher.maxAdvanceBookingHours || 720,
        allowInstantBooking: teacher.allowInstantBooking,
        bookingInstructions: teacher.bookingInstructions,
      },
      nextAvailableDate,
    };
  }

  async createBookingWithDetails(
    createBookingDto: CreateBookingWithDetailsDto,
    studentId: string,
    userId: string
  ): Promise<BookingRequestVm> {
    const { timeSlot, contactInfo, learningGoals, isTrialLesson, messageToTeacher, howFoundTeacher } = createBookingDto;

    // Validate and update student profile with provided information
    await this.updateStudentProfile(studentId, contactInfo, learningGoals);

    // Create the booking
    const booking = await this.create({
      teacherId: timeSlot.teacherId,
      scheduledAt: timeSlot.scheduledAt,
      duration: timeSlot.duration,
      notes: messageToTeacher,
      isTrialLesson: isTrialLesson ?? true,
    }, studentId);

    // Store additional booking metadata
    await this.storeBookingMetadata(booking.id, {
      learningGoals,
      howFoundTeacher,
      contactInfo,
    });

    // Send notification to teacher
    await this.notifyTeacherOfNewBooking(booking.id);

    return this.toBookingRequestVm(await this.getBookingWithFullDetails(booking.id));
  }

  async confirmBooking(
    bookingId: string,
    confirmDto: ConfirmBookingDto,
    userId: string
  ): Promise<BookingConfirmationVm> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        course: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.student.id !== userId) {
      throw new ForbiddenException('You can only confirm your own bookings');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Booking can only be confirmed when in pending status');
    }

    // Update booking status
    const updatedBooking = await this.update(bookingId, {
      status: BookingStatus.CONFIRMED,
      notes: confirmDto.confirmationNotes ? 
        `${booking.notes || ''}\nConfirmation notes: ${confirmDto.confirmationNotes}` : 
        booking.notes,
    });

    // Generate confirmation details
    const confirmationCode = this.generateConfirmationCode();
    const meetingUrl = await this.generateMeetingUrl(bookingId);

    // Store confirmation details
    await this.storeConfirmationDetails(bookingId, {
      confirmationCode,
      meetingUrl,
      confirmedAt: new Date(),
    });

    // Notify teacher of confirmation
    await this.notifyTeacherOfBookingConfirmation(bookingId);

    return {
      booking: this.toBookingRequestVm(await this.getBookingWithFullDetails(bookingId)),
      confirmation: {
        confirmedAt: new Date().toISOString(),
        confirmationCode,
        meetingUrl,
        preparationNotes: 'Please join the lesson 5 minutes before the scheduled time.',
      },
      nextSteps: [
        'Join the lesson 5 minutes before start time using the meeting link',
        'Prepare questions about your learning goals',
        'Ensure you have a stable internet connection and quiet environment',
        'Have a notebook ready for taking notes',
      ],
      support: {
        email: 'support@antoree.com',
        phone: '+84-901-234-567',
        helpUrl: 'https://antoree.com/support',
      },
    };
  }

  async getBookingFlowStatus(
    bookingId: string,
    userId: string,
    userRole: UserRole
  ): Promise<BookingFlowStatusVm> {
    const booking = await this.findOne(bookingId, userId, userRole);

    const stepMap: Record<BookingStatus, 'BROWSING' | 'SLOT_SELECTED' | 'DETAILS_PROVIDED' | 'CONFIRMED' | 'TEACHER_RESPONDED'> = {
      [BookingStatus.PENDING]: 'DETAILS_PROVIDED',
      [BookingStatus.CONFIRMED]: 'CONFIRMED',
      [BookingStatus.COMPLETED]: 'TEACHER_RESPONDED',
      [BookingStatus.CANCELLED]: 'TEACHER_RESPONDED',
    };

    const progressMap = {
      [BookingStatus.PENDING]: 75,
      [BookingStatus.CONFIRMED]: 100,
      [BookingStatus.COMPLETED]: 100,
      [BookingStatus.CANCELLED]: 50,
    };

    const availableActions = this.getAvailableActionsForBooking(booking.status, userRole);

    return {
      currentStep: stepMap[booking.status],
      progress: progressMap[booking.status],
      availableActions,
      statusMessage: this.getStatusMessage(booking.status),
      estimatedCompletion: booking.status === BookingStatus.PENDING ? 
        'Usually confirmed within 2-4 hours' : 
        undefined,
    };
  }

  // Teacher notification methods
  async getTeacherNotifications(
    teacherId: string,
    status?: string,
    limit: number = 20
  ): Promise<TeacherNotificationVm[]> {
    // In a real implementation, this would fetch from a notifications table
    // For now, we'll return pending bookings as notifications
    const whereClause: any = { teacherId };
    
    if (status === 'unread') {
      whereClause.status = BookingStatus.PENDING;
    }

    const bookings = await this.prisma.booking.findMany({
      where: whereClause,
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        course: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return bookings.map(booking => ({
      id: `notif_${booking.id}`,
      type: booking.isTrialLesson ? 'NEW_TRIAL_REQUEST' : 'NEW_BOOKING_REQUEST',
      title: booking.isTrialLesson ? 'New Trial Lesson Request' : 'New Lesson Booking',
      message: `${booking.student.user.firstName} ${booking.student.user.lastName} has requested a ${booking.isTrialLesson ? 'trial ' : ''}lesson`,
      booking: this.toBookingRequestVm(booking),
      availableActions: ['ACCEPT', 'DECLINE', 'REQUEST_RESCHEDULE'],
      createdAt: booking.createdAt.toISOString(),
      isRead: booking.status !== BookingStatus.PENDING,
      priority: this.getNotificationPriority(booking),
      responseTimeRemaining: this.calculateResponseTimeRemaining(booking.createdAt),
    }));
  }

  async getPendingBookingRequests(teacherId: string): Promise<BookingRequestVm[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        teacherId,
        status: BookingStatus.PENDING,
      },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        course: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map(booking => this.toBookingRequestVm(booking));
  }

  async respondToBookingRequest(
    bookingId: string,
    actionDto: TeacherBookingActionDto,
    teacherId: string
  ): Promise<BookingActionResponseVm> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        course: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.teacherId !== teacherId) {
      throw new ForbiddenException('You can only respond to your own booking requests');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Can only respond to pending booking requests');
    }

    let updatedBooking;
    let nextSteps: string[] = [];

    switch (actionDto.action) {
      case 'ACCEPT':
        updatedBooking = await this.update(bookingId, {
          status: BookingStatus.CONFIRMED,
          notes: actionDto.responseMessage ? 
            `${booking.notes || ''}\nTeacher response: ${actionDto.responseMessage}` : 
            booking.notes,
        });
        nextSteps = [
          'Student will receive confirmation email',
          'Meeting link will be sent 1 hour before lesson',
          'Lesson will appear in your schedule',
        ];
        break;

      case 'DECLINE':
        updatedBooking = await this.update(bookingId, {
          status: BookingStatus.CANCELLED,
          notes: `${booking.notes || ''}\nDeclined by teacher. Reason: ${actionDto.declineReason || 'No reason provided'}`,
        });
        nextSteps = [
          'Student will be notified of the decline',
          'Student can book another time slot',
          'No further action required from you',
        ];
        break;

      case 'REQUEST_RESCHEDULE':
        // In a full implementation, this would create a reschedule request
        nextSteps = [
          'Student will receive reschedule request',
          'Student can accept one of the alternative times',
          'You will be notified of student\'s response',
        ];
        updatedBooking = booking;
        break;

      default:
        throw new BadRequestException('Invalid action');
    }

    // Notify student of teacher's response
    await this.notifyStudentOfTeacherResponse(bookingId, actionDto);

    return {
      booking: this.toBookingRequestVm(await this.getBookingWithFullDetails(bookingId)),
      action: actionDto.action,
      responseMessage: actionDto.responseMessage,
      studentNotified: true,
      nextSteps,
    };
  }

  async markNotificationAsRead(notificationId: string, teacherId: string): Promise<void> {
    // In a real implementation, this would update a notifications table
    // For now, we'll just validate the teacher has access to this notification
    const bookingId = notificationId.replace('notif_', '');
    
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || booking.teacherId !== teacherId) {
      throw new ForbiddenException('Notification not found or access denied');
    }
  }

  async getTeacherBookingDashboard(teacherId: string): Promise<any> {
    const [
      pendingRequests,
      upcomingLessons,
      recentBookings,
      stats,
    ] = await Promise.all([
      this.getPendingBookingRequests(teacherId),
      this.getUpcomingLessons(teacherId),
      this.getRecentBookings(teacherId, 5),
      this.getTeacherStats(teacherId),
    ]);

    return {
      pendingRequests,
      upcomingLessons,
      recentBookings,
      stats,
      quickActions: [
        'View Schedule',
        'Update Availability',
        'Set Time Off',
        'View Earnings',
      ],
    };
  }

  // Student booking flow methods
  async getStudentBookingRequests(
    studentId: string,
    status?: string
  ): Promise<BookingRequestVm[]> {
    const whereClause: any = { studentId };
    
    if (status) {
      whereClause.status = status;
    }

    const bookings = await this.prisma.booking.findMany({
      where: whereClause,
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        course: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map(booking => this.toBookingRequestVm(booking));
  }

  async getStudentBookingDashboard(studentId: string): Promise<any> {
    const [
      activeRequests,
      upcomingLessons,
      completedLessons,
      recommendedTeachers,
    ] = await Promise.all([
      this.getStudentBookingRequests(studentId, BookingStatus.PENDING),
      this.getUpcomingLessons(studentId, 'student'),
      this.getCompletedLessons(studentId),
      this.getRecommendedTeachers(studentId),
    ]);

    return {
      activeRequests,
      upcomingLessons,
      completedLessons,
      recommendedTeachers,
      learningProgress: await this.getStudentLearningProgress(studentId),
      nextSteps: this.getStudentNextSteps(activeRequests, upcomingLessons),
    };
  }

  // Helper methods for booking flow
  private async generateTimeSlotsForDay(
    teacherId: string,
    date: Date,
    availability: any,
    duration: number,
    rates: any[]
  ): Promise<BookingFlowTimeSlotVm[]> {
    const startTime = this.parseTime(availability.startTime);
    const endTime = this.parseTime(availability.endTime);
    const slots: BookingFlowTimeSlotVm[] = [];

    // Get existing bookings for this day
    const existingBookings = await this.getExistingBookingsForDay(teacherId, date);

    let currentTime = startTime;
    while (currentTime + duration <= endTime) {
      const slotStart = new Date(date);
      slotStart.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration);

      // Check if slot is available
      if (this.isSlotAvailable(slotStart, slotEnd, existingBookings, duration) && slotStart > new Date()) {
        const rate = this.getSlotRate(rates, duration);
        
        slots.push({
          dateTime: slotStart.toISOString(),
          duration,
          isPreferred: this.isPreferredTime(currentTime),
          price: parseFloat(rate.toString()),
          notes: this.getSlotNotes(currentTime),
        });
      }

      currentTime += 30; // 30-minute intervals
    }

    return slots;
  }

  private async updateStudentProfile(
    studentId: string,
    contactInfo: any,
    learningGoals: any
  ): Promise<void> {
    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        englishLevel: learningGoals.currentLevel,
        learningGoals: JSON.stringify(learningGoals),
        timezone: contactInfo.timezone || 'Asia/Ho_Chi_Minh',
      },
    });

    // Update user contact info if provided
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });

    if (student && (contactInfo.firstName || contactInfo.lastName || contactInfo.phone)) {
      await this.prisma.user.update({
        where: { id: student.id },
        data: {
          firstName: contactInfo.firstName,
          lastName: contactInfo.lastName,
          phone: contactInfo.phone,
        },
      });
    }
  }

  private async storeBookingMetadata(bookingId: string, metadata: any): Promise<void> {
    // In a real implementation, this would store metadata in a separate table
    // For now, we'll update the notes field with structured data
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (booking) {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          notes: `${booking.notes || ''}\nMetadata: ${JSON.stringify(metadata)}`,
        },
      });
    }
  }

  private async notifyTeacherOfNewBooking(bookingId: string): Promise<void> {
    // In a real implementation, this would send email/push notifications
    // For now, we'll just log the notification
    console.log(`Notification sent to teacher for new booking: ${bookingId}`);
  }

  private async notifyTeacherOfBookingConfirmation(bookingId: string): Promise<void> {
    console.log(`Notification sent to teacher for booking confirmation: ${bookingId}`);
  }

  private async notifyStudentOfTeacherResponse(bookingId: string, action: any): Promise<void> {
    console.log(`Notification sent to student for teacher response: ${bookingId}`, action);
  }

  private generateConfirmationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private async generateMeetingUrl(bookingId: string): Promise<string> {
    // In a real implementation, this would integrate with Zoom/Google Meet
    return `https://meet.antoree.com/lesson/${bookingId}`;
  }

  private async storeConfirmationDetails(bookingId: string, details: any): Promise<void> {
    // Store confirmation details in database
    console.log(`Storing confirmation details for booking: ${bookingId}`, details);
  }

  private toBookingRequestVm(booking: any): BookingRequestVm {
    // Parse metadata from notes if exists
    let learningGoals: any = {};
    try {
      const metadataMatch = booking.notes?.match(/Metadata: ({.*})/);
      if (metadataMatch) {
        const metadata = JSON.parse(metadataMatch[1]);
        learningGoals = metadata.learningGoals || {};
      }
    } catch (e) {
      // Ignore parsing errors
    }

    return {
      id: booking.id,
      student: {
        id: booking.student.id,
        firstName: booking.student.user.firstName,
        lastName: booking.student.user.lastName,
        email: booking.student.user.email,
        phone: booking.student.user.phone,
        englishLevel: booking.student.englishLevel,
        timezone: booking.student.timezone,
      },
      teacher: {
        id: booking.teacher.id,
        firstName: booking.teacher.user.firstName,
        lastName: booking.teacher.user.lastName,
        timezone: booking.teacher.timezone,
      },
      scheduledAt: booking.scheduledAt.toISOString(),
      duration: booking.duration,
      learningGoals,
      status: booking.status,
      isTrialLesson: booking.isTrialLesson,
      messageToTeacher: booking.notes,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };
  }

  private async getBookingWithFullDetails(bookingId: string): Promise<any> {
    return this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        course: true,
        lesson: true,
      },
    });
  }

  private getAvailableActionsForBooking(status: BookingStatus, userRole: UserRole): string[] {
    const actions: Record<BookingStatus, Record<UserRole, string[]>> = {
      [BookingStatus.PENDING]: {
        [UserRole.STUDENT]: ['CANCEL', 'EDIT_DETAILS'],
        [UserRole.TEACHER]: ['ACCEPT', 'DECLINE', 'REQUEST_RESCHEDULE'],
        [UserRole.ADMIN]: ['CANCEL', 'CONFIRM', 'EDIT'],
      },
      [BookingStatus.CONFIRMED]: {
        [UserRole.STUDENT]: ['CANCEL', 'RESCHEDULE'],
        [UserRole.TEACHER]: ['CANCEL', 'RESCHEDULE', 'COMPLETE'],
        [UserRole.ADMIN]: ['CANCEL', 'RESCHEDULE', 'COMPLETE'],
      },
      [BookingStatus.COMPLETED]: {
        [UserRole.STUDENT]: ['REVIEW', 'BOOK_AGAIN'],
        [UserRole.TEACHER]: ['VIEW_DETAILS'],
        [UserRole.ADMIN]: ['VIEW_DETAILS'],
      },
      [BookingStatus.CANCELLED]: {
        [UserRole.STUDENT]: ['BOOK_AGAIN'],
        [UserRole.TEACHER]: ['VIEW_DETAILS'],
        [UserRole.ADMIN]: ['VIEW_DETAILS'],
      },
    };

    return actions[status]?.[userRole] || [];
  }

  private getStatusMessage(status: BookingStatus): string {
    const messages = {
      [BookingStatus.PENDING]: 'Waiting for teacher confirmation',
      [BookingStatus.CONFIRMED]: 'Booking confirmed! Lesson scheduled',
      [BookingStatus.COMPLETED]: 'Lesson completed successfully',
      [BookingStatus.CANCELLED]: 'Booking was cancelled',
    };

    return messages[status] || 'Unknown status';
  }

  // Additional helper methods
  private async findNextAvailableDate(teacherId: string, afterDate: Date, duration: number): Promise<string | undefined> {
    // Search for next 30 days
    const searchEnd = new Date(afterDate);
    searchEnd.setDate(searchEnd.getDate() + 30);

    let current = new Date(afterDate);
    current.setDate(current.getDate() + 1);

    while (current <= searchEnd) {
      const slots = await this.getAvailableTimeSlots(teacherId, current, duration);
      if (slots.length > 0) {
        return current.toISOString().split('T')[0];
      }
      current.setDate(current.getDate() + 1);
    }

    return undefined;
  }

  private async getExistingBookingsForDay(teacherId: string, date: Date): Promise<any[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.booking.findMany({
      where: {
        teacherId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
      },
    });
  }

  private isSlotAvailable(slotStart: Date, slotEnd: Date, existingBookings: any[], duration: number): boolean {
    return !existingBookings.some(booking => {
      const bookingStart = new Date(booking.scheduledAt);
      const bookingEnd = new Date(bookingStart);
      bookingEnd.setMinutes(bookingEnd.getMinutes() + booking.duration);
      
      return (slotStart < bookingEnd && slotEnd > bookingStart);
    });
  }

  private getSlotRate(rates: any[], duration: number): number {
    // Find appropriate rate based on duration and type
    const trialRate = rates.find(r => r.type === 'TRIAL_LESSON');
    const regularRate = rates.find(r => r.type === 'REGULAR_LESSON');
    
    return trialRate?.rate || regularRate?.rate || 25; // Default rate
  }

  private isPreferredTime(timeInMinutes: number): boolean {
    // Consider 9 AM - 5 PM as preferred times
    return timeInMinutes >= 540 && timeInMinutes <= 1020; // 9:00 - 17:00
  }

  private getSlotNotes(timeInMinutes: number): string | undefined {
    if (timeInMinutes < 480 || timeInMinutes > 1320) { // Before 8 AM or after 10 PM
      return 'Late/Early hours rate may apply';
    }
    return undefined;
  }

  private getNotificationPriority(booking: any): 'low' | 'medium' | 'high' {
    const hoursOld = (new Date().getTime() - booking.createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursOld > 24) return 'high';
    if (hoursOld > 4) return 'medium';
    return 'low';
  }

  private calculateResponseTimeRemaining(createdAt: Date): number {
    const hoursOld = (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return Math.max(0, 48 - hoursOld); // 48 hour response window
  }

  // Additional dashboard helper methods
  private async getUpcomingLessons(id: string, type: 'student' | 'teacher' = 'teacher'): Promise<any[]> {
    const whereClause = type === 'student' ? { studentId: id } : { teacherId: id };
    
    return this.prisma.booking.findMany({
      where: {
        ...whereClause,
        status: BookingStatus.CONFIRMED,
        scheduledAt: { gte: new Date() },
      },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        course: true,
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
    });
  }

  private async getRecentBookings(teacherId: string, limit: number): Promise<any[]> {
    return this.prisma.booking.findMany({
      where: { teacherId },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        course: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async getTeacherStats(teacherId: string): Promise<any> {
    const [totalBookings, completedLessons, pendingRequests, averageRating] = await Promise.all([
      this.prisma.booking.count({ where: { teacherId } }),
      this.prisma.booking.count({ where: { teacherId, status: BookingStatus.COMPLETED } }),
      this.prisma.booking.count({ where: { teacherId, status: BookingStatus.PENDING } }),
      this.getTeacherAverageRating(teacherId),
    ]);

    return {
      totalBookings,
      completedLessons,
      pendingRequests,
      averageRating,
      responseRate: '95%', // This would be calculated from response history
      onTimeRate: '98%', // This would be calculated from lesson attendance
    };
  }

  private async getTeacherAverageRating(teacherId: string): Promise<number> {
    const result = await this.prisma.review.aggregate({
      where: { teacherId },
      _avg: { rating: true },
    });

    return result._avg.rating || 0;
  }

  private async getCompletedLessons(studentId: string): Promise<any[]> {
    return this.prisma.booking.findMany({
      where: {
        studentId,
        status: BookingStatus.COMPLETED,
      },
      include: {
        teacher: { include: { user: true } },
        course: true,
      },
      orderBy: { scheduledAt: 'desc' },
      take: 10,
    });
  }

  private async getRecommendedTeachers(studentId: string): Promise<any[]> {
    // In a real implementation, this would use ML recommendations
    // For now, return top-rated teachers
    return this.prisma.teacher.findMany({
      where: {
        status: TeacherStatus.APPROVED,
        isLive: true,
      },
      include: { user: true },
      orderBy: { averageRating: 'desc' },
      take: 3,
    });
  }

  private async getStudentLearningProgress(studentId: string): Promise<any> {
    const completedLessons = await this.prisma.booking.count({
      where: { studentId, status: BookingStatus.COMPLETED },
    });

    const totalHours = await this.prisma.booking.aggregate({
      where: { studentId, status: BookingStatus.COMPLETED },
      _sum: { duration: true },
    });

    return {
      totalLessons: completedLessons,
      totalHours: (totalHours._sum.duration || 0) / 60,
      currentStreak: 5, // This would be calculated from lesson history
      level: 'Intermediate', // This would be determined from assessments
    };
  }

  private getStudentNextSteps(activeRequests: any[], upcomingLessons: any[]): string[] {
    const steps = [];

    if (activeRequests.length > 0) {
      steps.push('Wait for teacher confirmation on your booking request');
    }

    if (upcomingLessons.length > 0) {
      steps.push('Prepare for your upcoming lessons');
    }

    if (activeRequests.length === 0 && upcomingLessons.length === 0) {
      steps.push('Browse teachers and book your next lesson');
    }

    steps.push('Complete your profile for better teacher matching');
    steps.push('Set your learning goals and track progress');

    return steps;
  }

  // Feedback integration methods
  async triggerTrialLessonFeedbackNotification(bookingId: string, studentId: string): Promise<void> {
    // In a real implementation, this would send an email/push notification
    // prompting the student to provide feedback
    console.log(`Sending feedback notification for trial lesson ${bookingId} to student ${studentId}`);
    
    // You could also create a delayed job to remind the student after a few hours
    setTimeout(() => {
      this.sendFeedbackReminder(bookingId, studentId);
    }, 2 * 60 * 60 * 1000); // 2 hours later
  }

  async sendFeedbackReminder(bookingId: string, studentId: string): Promise<void> {
    // Check if feedback has already been provided
    const feedback = await this.prisma.review.findFirst({
      where: {
        studentId,
        comment: { contains: 'Trial Lesson Feedback', mode: 'insensitive' },
      },
      include: {
        student: true,
        teacher: { include: { user: true } },
      },
    });

    if (!feedback) {
      console.log(`Sending feedback reminder for trial lesson ${bookingId} to student ${studentId}`);
      // Send reminder notification
    }
  }

  async getCompletedTrialLessonsAwaitingFeedback(studentId: string): Promise<any[]> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return [];
    }

    // Find completed trial lessons that don't have feedback yet
    const completedTrials = await this.prisma.booking.findMany({
      where: {
        studentId,
        isTrialLesson: true,
        status: BookingStatus.COMPLETED,
        // Exclude those that already have feedback
        teacher: {
          NOT: {
            reviews: {
              some: {
                studentId: student.id,
                comment: { contains: 'Trial Lesson Feedback', mode: 'insensitive' },
              },
            },
          },
        },
      },
      include: {
        teacher: { include: { user: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    return completedTrials.map(booking => ({
      bookingId: booking.id,
      teacherId: booking.teacherId,
      teacherName: `${booking.teacher.user.firstName} ${booking.teacher.user.lastName}`,
      scheduledAt: booking.scheduledAt.toISOString(),
      duration: booking.duration,
      awaitingFeedback: true,
      daysSinceCompletion: Math.floor(
        (new Date().getTime() - booking.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));
  }

  async markTrialLessonForFeedbackReminder(bookingId: string): Promise<void> {
    // In a real implementation, this could add the booking to a feedback reminder queue
    console.log(`Marking trial lesson ${bookingId} for feedback reminder`);
  }
}
