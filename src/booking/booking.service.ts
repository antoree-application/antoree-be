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
  BookingVm,
  BookingSearchResultVm,
  TeacherAvailabilityVm,
  AvailableTimeSlotVm,
  BookingStatsVm,
} from './vm/booking.vm';
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
      const hasAccess = booking.student.userId === userId || booking.teacher.userId === userId;
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
      const hasAccess = existingBooking.student.userId === userId || existingBooking.teacher.userId === userId;
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

    return this.update(id, { status: BookingStatus.COMPLETED }, userId, userRole);
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
      const student = await this.prisma.student.findUnique({ where: { userId } });
      if (student) where.studentId = student.id;
    } else if (userId && userRole === UserRole.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
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
}
