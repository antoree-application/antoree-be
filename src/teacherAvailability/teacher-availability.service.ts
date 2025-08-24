import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { 
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
  BulkCreateAvailabilityDto,
  GetAvailabilityQueryDto,
  AvailabilityConflictCheckDto,
  CopyAvailabilityDto,
  AvailabilityType
} from './dto/availability.dto';
import {
  GetAvailableTimeSlotsDto,
  CheckTeacherAvailableDto,
  BulkAvailabilityCheckDto,
  WeeklyScheduleQueryDto
} from './dto/schedule.dto';
import {
  TeacherAvailabilityVm,
  AvailabilityTimeSlotVm,
  WeeklyAvailabilityVm,
  DailyAvailabilityVm,
  AvailabilityStatsVm,
  AvailabilityConflictVm,
  BulkAvailabilityResultVm,
  AvailabilitySummaryVm
} from './vm/availability.vm';
import { TeacherAvailability, BookingStatus } from '@prisma/client';

@Injectable()
export class TeacherAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}


  private getDayName(dayOfWeek: number): string {
    const DAYS_OF_WEEK = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];
    return DAYS_OF_WEEK[dayOfWeek] || '';
  }

  // Create single availability
  async createAvailability(
    teacherId: string,
    createDto: CreateAvailabilityDto
  ): Promise<TeacherAvailabilityVm> {
    // Validate teacher exists
    await this.validateTeacherExists(teacherId);

    // Check for time conflicts
    await this.validateTimeSlot(createDto.startTime, createDto.endTime);
    await this.checkTimeConflicts(teacherId, createDto.dayOfWeek, createDto.startTime, createDto.endTime);

    const availability = await this.prisma.teacherAvailability.create({
      data: {
        teacherId,
        dayOfWeek: createDto.dayOfWeek,
        startTime: createDto.startTime,
        endTime: createDto.endTime,
        type: createDto.type || AvailabilityType.REGULAR,
        isActive: createDto.isActive ?? true,
      },
    });

    return this.toAvailabilityVm(availability);
  }

  // Get teacher's availability
  async getTeacherAvailability(
    teacherId: string,
    queryDto?: GetAvailabilityQueryDto
  ): Promise<TeacherAvailabilityVm[]> {
    await this.validateTeacherExists(teacherId);

    const where: any = { teacherId };

    if (queryDto) {
      if (queryDto.dayOfWeek !== undefined) {
        where.dayOfWeek = queryDto.dayOfWeek;
      }
      if (queryDto.type) {
        where.type = queryDto.type;
      }
      if (queryDto.isActive !== undefined) {
        where.isActive = queryDto.isActive;
      }
    }

    const availabilities = await this.prisma.teacherAvailability.findMany({
      where,
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ],
    });

    return availabilities.map(availability => this.toAvailabilityVm(availability));
  }

  // Update availability
  async updateAvailability(
    teacherId: string,
    availabilityId: string,
    updateDto: UpdateAvailabilityDto
  ): Promise<TeacherAvailabilityVm> {
    const availability = await this.findAvailabilityByIdAndTeacher(availabilityId, teacherId);

    // Validate new time slot if provided
    if (updateDto.startTime || updateDto.endTime) {
      const startTime = updateDto.startTime || availability.startTime;
      const endTime = updateDto.endTime || availability.endTime;
      
      await this.validateTimeSlot(startTime, endTime);
      await this.checkTimeConflicts(
        teacherId, 
        availability.dayOfWeek, 
        startTime, 
        endTime, 
        availabilityId
      );
    }

    const updatedAvailability = await this.prisma.teacherAvailability.update({
      where: { id: availabilityId },
      data: updateDto,
    });

    return this.toAvailabilityVm(updatedAvailability);
  }

  // Delete availability
  async deleteAvailability(teacherId: string, availabilityId: string): Promise<void> {
    await this.findAvailabilityByIdAndTeacher(availabilityId, teacherId);

    await this.prisma.teacherAvailability.delete({
      where: { id: availabilityId },
    });
  }

  // Bulk create availabilities
  async bulkCreateAvailability(
    teacherId: string,
    bulkDto: BulkCreateAvailabilityDto
  ): Promise<BulkAvailabilityResultVm> {
    await this.validateTeacherExists(teacherId);

    const successes: TeacherAvailabilityVm[] = [];
    const failures: Array<{ index: number; error: string; data: any }> = [];

    for (let i = 0; i < bulkDto.availabilities.length; i++) {
      const availabilityDto = bulkDto.availabilities[i];
      
      try {
        // Validate each slot
        await this.validateTimeSlot(availabilityDto.startTime, availabilityDto.endTime);
        await this.checkTimeConflicts(
          teacherId,
          availabilityDto.dayOfWeek,
          availabilityDto.startTime,
          availabilityDto.endTime
        );

        const availability = await this.prisma.teacherAvailability.create({
          data: {
            teacherId,
            dayOfWeek: availabilityDto.dayOfWeek,
            startTime: availabilityDto.startTime,
            endTime: availabilityDto.endTime,
            type: availabilityDto.type || AvailabilityType.REGULAR,
            isActive: availabilityDto.isActive ?? true,
          },
        });

        successes.push(this.toAvailabilityVm(availability));
      } catch (error) {
        failures.push({
          index: i,
          error: error.message,
          data: availabilityDto,
        });
      }
    }

    return {
      successCount: successes.length,
      failureCount: failures.length,
      successes,
      failures,
    };
  }

  // Check for availability conflicts
  async checkAvailabilityConflict(
    teacherId: string,
    conflictDto: AvailabilityConflictCheckDto
  ): Promise<AvailabilityConflictVm> {
    await this.validateTeacherExists(teacherId);
    
    const where: any = {
      teacherId,
      dayOfWeek: conflictDto.dayOfWeek,
      isActive: true,
    };

    if (conflictDto.excludeId) {
      where.id = { not: conflictDto.excludeId };
    }

    const conflictingAvailabilities = await this.prisma.teacherAvailability.findMany({
      where: {
        ...where,
        OR: [
          // New slot starts within existing slot
          {
            AND: [
              { startTime: { lte: conflictDto.startTime } },
              { endTime: { gt: conflictDto.startTime } }
            ]
          },
          // New slot ends within existing slot
          {
            AND: [
              { startTime: { lt: conflictDto.endTime } },
              { endTime: { gte: conflictDto.endTime } }
            ]
          },
          // New slot encompasses existing slot
          {
            AND: [
              { startTime: { gte: conflictDto.startTime } },
              { endTime: { lte: conflictDto.endTime } }
            ]
          }
        ]
      },
    });

    const hasConflict = conflictingAvailabilities.length > 0;
    
    return {
      hasConflict,
      conflictMessage: hasConflict 
        ? `Time slot conflicts with ${conflictingAvailabilities.length} existing availability slot(s)`
        : 'No conflicts found',
      conflictingAvailabilities: hasConflict 
        ? conflictingAvailabilities.map(availability => this.toAvailabilityVm(availability))
        : undefined,
    };
  }

  // Copy availability from one day to others
  async copyAvailability(
    teacherId: string,
    copyDto: CopyAvailabilityDto
  ): Promise<BulkAvailabilityResultVm> {
    await this.validateTeacherExists(teacherId);

    // Get source day availabilities
    const sourceAvailabilities = await this.prisma.teacherAvailability.findMany({
      where: {
        teacherId,
        dayOfWeek: copyDto.fromDayOfWeek,
        isActive: true,
      },
    });

    if (sourceAvailabilities.length === 0) {
      throw new BadRequestException('No availability found for source day');
    }

    const successes: TeacherAvailabilityVm[] = [];
    const failures: Array<{ index: number; error: string; data: any }> = [];

    for (const targetDay of copyDto.toDaysOfWeek) {
      // Skip if copying to same day
      if (targetDay === copyDto.fromDayOfWeek) continue;

      try {
        // Remove existing if replace option is enabled
        if (copyDto.replaceExisting) {
          await this.prisma.teacherAvailability.deleteMany({
            where: {
              teacherId,
              dayOfWeek: targetDay,
            },
          });
        }

        // Create new availabilities for target day
        for (const sourceAvailability of sourceAvailabilities) {
          const newAvailability = await this.prisma.teacherAvailability.create({
            data: {
              teacherId,
              dayOfWeek: targetDay,
              startTime: sourceAvailability.startTime,
              endTime: sourceAvailability.endTime,
              type: sourceAvailability.type,
              isActive: sourceAvailability.isActive,
            },
          });

          successes.push(this.toAvailabilityVm(newAvailability));
        }
      } catch (error) {
        failures.push({
          index: targetDay,
          error: error.message,
          data: { targetDay, sourceDay: copyDto.fromDayOfWeek },
        });
      }
    }

    return {
      successCount: successes.length,
      failureCount: failures.length,
      successes,
      failures,
    };
  }

  // Get available time slots for a date range
  async getAvailableTimeSlots(
    teacherId: string,
    slotsDto: GetAvailableTimeSlotsDto
  ): Promise<AvailabilityTimeSlotVm[]> {
    await this.validateTeacherExists(teacherId);

    const startDate = new Date(slotsDto.startDate);
    const endDate = new Date(slotsDto.endDate);
    const duration = slotsDto.duration || 60;
    const breakTime = slotsDto.breakTime || 15;

    // Get teacher settings for advance notice
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { advanceNoticeHours: true },
    });

    const advanceNoticeHours = teacher?.advanceNoticeHours || 24;
    const minBookingTime = new Date();
    minBookingTime.setHours(minBookingTime.getHours() + advanceNoticeHours);

    const slots: AvailabilityTimeSlotVm[] = [];
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      
      // Get availability for this day
      const dayAvailabilities = await this.prisma.teacherAvailability.findMany({
        where: {
          teacherId,
          dayOfWeek,
          isActive: true,
        },
        orderBy: { startTime: 'asc' },
      });

      // Get existing bookings for this day
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      const existingBookings = await this.prisma.booking.findMany({
        where: {
          teacherId,
          scheduledAt: {
            gte: dateStart,
            lte: dateEnd,
          },
          status: {
            in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
          },
        },
      });

      // Generate slots for each availability period
      for (const availability of dayAvailabilities) {
        const daySlots = this.generateTimeSlotsForAvailability(
          date,
          availability,
          duration,
          breakTime,
          existingBookings,
          minBookingTime,
          slotsDto.includeShortNotice || false
        );
        
        slots.push(...daySlots);
      }
    }

    return slots.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }

  // Check if teacher is available at specific time
  async checkTeacherAvailable(
    teacherId: string,
    checkDto: CheckTeacherAvailableDto
  ): Promise<{ isAvailable: boolean; reason?: string }> {
    await this.validateTeacherExists(teacherId);

    const requestedDateTime = new Date(checkDto.dateTime);
    const dayOfWeek = requestedDateTime.getDay();
    const timeString = this.formatTimeToHHMM(requestedDateTime);
    const endTimeString = this.formatTimeToHHMM(
      new Date(requestedDateTime.getTime() + checkDto.duration * 60000)
    );

    // Check if within availability hours
    const availability = await this.prisma.teacherAvailability.findFirst({
      where: {
        teacherId,
        dayOfWeek,
        isActive: true,
        startTime: { lte: timeString },
        endTime: { gte: endTimeString },
      },
    });

    if (!availability) {
      return {
        isAvailable: false,
        reason: 'Teacher is not available at this time',
      };
    }

    // Check for existing bookings
    const endDateTime = new Date(requestedDateTime.getTime() + checkDto.duration * 60000);
    
    const whereClause: any = {
      teacherId,
      status: {
        in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      },
      OR: [
        // Booking starts during requested time
        {
          AND: [
            { scheduledAt: { gte: requestedDateTime } },
            { scheduledAt: { lt: endDateTime } }
          ]
        },
        // Booking ends during requested time
        {
          AND: [
            { scheduledAt: { lt: requestedDateTime } },
            // This requires calculating booking end time
          ]
        }
      ]
    };

    if (checkDto.excludeBookingId) {
      whereClause.id = { not: checkDto.excludeBookingId };
    }

    const conflictingBooking = await this.prisma.booking.findFirst({
      where: whereClause,
    });

    if (conflictingBooking) {
      return {
        isAvailable: false,
        reason: 'Time slot is already booked',
      };
    }

    return { isAvailable: true };
  }

  // Get weekly schedule with bookings
  async getWeeklySchedule(
    teacherId: string,
    queryDto: WeeklyScheduleQueryDto
  ): Promise<WeeklyAvailabilityVm[]> {
    await this.validateTeacherExists(teacherId);

    const weeks: WeeklyAvailabilityVm[] = [];
    const weeksCount = queryDto.weeksCount || 1;
    const slotDuration = queryDto.slotDuration || 60;

    let startDate: Date;
    if (queryDto.weekStartDate) {
      startDate = new Date(queryDto.weekStartDate);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of current week
    }

    for (let weekIndex = 0; weekIndex < weeksCount; weekIndex++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (weekIndex * 7));
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekSchedule = await this.generateWeeklySchedule(
        teacherId,
        weekStart,
        weekEnd,
        slotDuration,
        queryDto.includeBookings ?? true
      );

      weeks.push(weekSchedule);
    }

    return weeks;
  }

  // Get availability summary
  async getAvailabilitySummary(teacherId: string): Promise<AvailabilitySummaryVm> {
    await this.validateTeacherExists(teacherId);

    const schedule = await this.getTeacherAvailability(teacherId);
    const stats = await this.getAvailabilityStats(teacherId);
    const upcomingWeeks = await this.getWeeklySchedule(teacherId, { weeksCount: 4 });

    return {
      schedule,
      stats,
      upcomingWeeks,
    };
  }

  // Get availability statistics
  async getAvailabilityStats(teacherId: string): Promise<AvailabilityStatsVm> {
    const availabilities = await this.prisma.teacherAvailability.findMany({
      where: { teacherId },
    });

    const activeAvailabilities = availabilities.filter(a => a.isActive);
    const availableDays = [...new Set(activeAvailabilities.map(a => a.dayOfWeek))];
    
    let totalHoursPerWeek = 0;
    let earliestStart = '23:59';
    let latestEnd = '00:00';

    for (const availability of activeAvailabilities) {
      const startHour = parseInt(availability.startTime.split(':')[0]);
      const startMin = parseInt(availability.startTime.split(':')[1]);
      const endHour = parseInt(availability.endTime.split(':')[0]);
      const endMin = parseInt(availability.endTime.split(':')[1]);
      
      const hours = (endHour + endMin/60) - (startHour + startMin/60);
      totalHoursPerWeek += hours;

      if (availability.startTime < earliestStart) {
        earliestStart = availability.startTime;
      }
      if (availability.endTime > latestEnd) {
        latestEnd = availability.endTime;
      }
    }

    return {
      totalAvailabilities: availabilities.length,
      activeAvailabilities: activeAvailabilities.length,
      availableDays: availableDays.sort(),
      totalHoursPerWeek,
      earliestStartTime: activeAvailabilities.length > 0 ? earliestStart : '00:00',
      latestEndTime: activeAvailabilities.length > 0 ? latestEnd : '00:00',
      avgHoursPerDay: availableDays.length > 0 ? totalHoursPerWeek / availableDays.length : 0,
    };
  }

  // Private helper methods
  private async validateTeacherExists(teacherId: string): Promise<void> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
  }

  private async findAvailabilityByIdAndTeacher(
    availabilityId: string,
    teacherId: string
  ): Promise<TeacherAvailability> {
    const availability = await this.prisma.teacherAvailability.findFirst({
      where: {
        id: availabilityId,
        teacherId,
      },
    });

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    return availability;
  }

  private async validateTimeSlot(startTime: string, endTime: string): Promise<void> {
    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Validate time format and range
    const timePattern = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
      throw new BadRequestException('Invalid time format. Use HH:mm format');
    }
  }

  private async checkTimeConflicts(
    teacherId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<void> {
    const conflictDto: AvailabilityConflictCheckDto = {
      dayOfWeek,
      startTime,
      endTime,
      excludeId,
    };

    const conflict = await this.checkAvailabilityConflict(teacherId, conflictDto);
    
    if (conflict.hasConflict) {
      throw new ConflictException(conflict.conflictMessage);
    }
  }

  private toAvailabilityVm(availability: TeacherAvailability): TeacherAvailabilityVm {
    const startHour = parseInt(availability.startTime.split(':')[0]);
    const startMin = parseInt(availability.startTime.split(':')[1]);
    const endHour = parseInt(availability.endTime.split(':')[0]);
    const endMin = parseInt(availability.endTime.split(':')[1]);
    
    const durationHours = (endHour + endMin/60) - (startHour + startMin/60);

    return {
      id: availability.id,
      teacherId: availability.teacherId,
      dayOfWeek: availability.dayOfWeek,
      dayName: this.getDayName(availability.dayOfWeek),
      startTime: availability.startTime,
      endTime: availability.endTime,
      type: availability.type as AvailabilityType,
      isActive: availability.isActive,
      durationHours: Math.round(durationHours * 100) / 100,
      createdAt: availability.createdAt,
    };
  }

  private generateTimeSlotsForAvailability(
    date: Date,
    availability: TeacherAvailability,
    duration: number,
    breakTime: number,
    existingBookings: any[],
    minBookingTime: Date,
    includeShortNotice: boolean
  ): AvailabilityTimeSlotVm[] {
    const slots: AvailabilityTimeSlotVm[] = [];
    const [startHour, startMin] = availability.startTime.split(':').map(Number);
    const [endHour, endMin] = availability.endTime.split(':').map(Number);

    const slotStart = new Date(date);
    slotStart.setHours(startHour, startMin, 0, 0);
    
    const availabilityEnd = new Date(date);
    availabilityEnd.setHours(endHour, endMin, 0, 0);

    while (slotStart.getTime() + duration * 60000 <= availabilityEnd.getTime()) {
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);
      
      // Check if slot meets advance notice requirement
      const meetsAdvanceNotice = includeShortNotice || slotStart >= minBookingTime;
      
      // Check if slot conflicts with existing bookings
      const isBooked = existingBookings.some(booking => {
        const bookingStart = new Date(booking.scheduledAt);
        const bookingEnd = new Date(bookingStart.getTime() + (booking.duration || 60) * 60000);
        
        return (slotStart < bookingEnd && slotEnd > bookingStart);
      });

      let unavailableReason = '';
      let bookingId = '';
      
      if (!meetsAdvanceNotice) {
        unavailableReason = 'Insufficient advance notice';
      } else if (isBooked) {
        unavailableReason = 'Already booked';
        const conflictingBooking = existingBookings.find(booking => {
          const bookingStart = new Date(booking.scheduledAt);
          const bookingEnd = new Date(bookingStart.getTime() + (booking.duration || 60) * 60000);
          return (slotStart < bookingEnd && slotEnd > bookingStart);
        });
        bookingId = conflictingBooking?.id || '';
      }

      slots.push({
        date: date.toISOString().split('T')[0],
        dayName: this.getDayName(date.getDay()),
        startTime: this.formatTimeToHHMM(slotStart),
        endTime: this.formatTimeToHHMM(slotEnd),
        dateTime: slotStart.toISOString(),
        isAvailable: meetsAdvanceNotice && !isBooked,
        unavailableReason: unavailableReason || undefined,
        bookingId: bookingId || undefined,
      });

      // Move to next slot
      slotStart.setMinutes(slotStart.getMinutes() + duration + breakTime);
    }

    return slots;
  }

  private async generateWeeklySchedule(
    teacherId: string,
    weekStart: Date,
    weekEnd: Date,
    slotDuration: number,
    includeBookings: boolean
  ): Promise<WeeklyAvailabilityVm> {
    const days: DailyAvailabilityVm[] = [];
    let totalAvailableHours = 0;
    let totalBookedHours = 0;
    let totalAvailableSlots = 0;
    let totalBookedSlots = 0;

    for (let date = new Date(weekStart); date <= weekEnd; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      
      // Get availability for this day
      const dayAvailabilities = await this.prisma.teacherAvailability.findMany({
        where: {
          teacherId,
          dayOfWeek,
          isActive: true,
        },
      });

      let dayAvailableHours = 0;
      let dayBookedHours = 0;
      const timeSlots: AvailabilityTimeSlotVm[] = [];

      if (dayAvailabilities.length > 0) {
        // Calculate available hours
        for (const availability of dayAvailabilities) {
          const startHour = parseInt(availability.startTime.split(':')[0]);
          const startMin = parseInt(availability.startTime.split(':')[1]);
          const endHour = parseInt(availability.endTime.split(':')[0]);
          const endMin = parseInt(availability.endTime.split(':')[1]);
          
          const hours = (endHour + endMin/60) - (startHour + startMin/60);
          dayAvailableHours += hours;
        }

        // Get bookings if requested
        if (includeBookings) {
          const dateStart = new Date(date);
          dateStart.setHours(0, 0, 0, 0);
          const dateEnd = new Date(date);
          dateEnd.setHours(23, 59, 59, 999);

          const dayBookings = await this.prisma.booking.findMany({
            where: {
              teacherId,
              scheduledAt: {
                gte: dateStart,
                lte: dateEnd,
              },
              status: {
                in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
              },
            },
          });

          dayBookedHours = dayBookings.reduce((total, booking) => {
            return total + (booking.duration || 60) / 60;
          }, 0);

          // Generate time slots for visualization
          for (const availability of dayAvailabilities) {
            const slots = this.generateTimeSlotsForAvailability(
              date,
              availability,
              slotDuration,
              15, // default break time
              dayBookings,
              new Date(),
              true
            );
            timeSlots.push(...slots);
          }
        }
      }

      const daySlots = timeSlots.length;
      const bookedSlots = timeSlots.filter(slot => !slot.isAvailable).length;

      days.push({
        date: date.toISOString().split('T')[0],
        dayOfWeek,
        dayName: this.getDayName(dayOfWeek),
        timeSlots: timeSlots.sort((a, b) => a.startTime.localeCompare(b.startTime)),
        totalAvailableHours: Math.round(dayAvailableHours * 100) / 100,
        totalBookedHours: Math.round(dayBookedHours * 100) / 100,
        hasAvailability: dayAvailabilities.length > 0,
      });

      totalAvailableHours += dayAvailableHours;
      totalBookedHours += dayBookedHours;
      totalAvailableSlots += daySlots;
      totalBookedSlots += bookedSlots;
    }

    return {
      weekStartDate: weekStart.toISOString().split('T')[0],
      weekEndDate: weekEnd.toISOString().split('T')[0],
      days,
      totalAvailableHours: Math.round(totalAvailableHours * 100) / 100,
      totalBookedHours: Math.round(totalBookedHours * 100) / 100,
      totalAvailableSlots,
      totalBookedSlots,
    };
  }

  private formatTimeToHHMM(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }
}
