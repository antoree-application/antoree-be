import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AvailabilityType } from '../dto/availability.dto';

export class TeacherAvailabilityVm {
  @ApiProperty({
    description: 'Availability ID',
    example: 'clm123abc456',
  })
  id: string;

  @ApiProperty({
    description: 'Teacher ID',
    example: 'clu456def789',
  })
  teacherId: string;

  @ApiProperty({
    description: 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
  })
  dayOfWeek: number;

  // @ApiProperty({
  //   description: 'Day name',
  //   example: 'Monday',
  // })
  dayName: string;

  @ApiProperty({
    description: 'Start time in HH:mm format',
    example: '09:00',
  })
  startTime: string;

  @ApiProperty({
    description: 'End time in HH:mm format',
    example: '17:00',
  })
  endTime: string;

  @ApiProperty({
    description: 'Type of availability',
    enum: AvailabilityType,
    example: AvailabilityType.REGULAR,
  })
  type: AvailabilityType;

  @ApiProperty({
    description: 'Whether this availability is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Duration in hours',
    example: 8,
  })
  durationHours: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-08-21T10:00:00.000Z',
  })
  createdAt: Date;
}

export class AvailabilityTimeSlotVm {
  @ApiProperty({
    description: 'Date of the slot in YYYY-MM-DD format',
    example: '2025-08-25',
  })
  date: string;

  @ApiProperty({
    description: 'Day of week name',
    example: 'Monday',
  })
  dayName: string;

  @ApiProperty({
    description: 'Start time in HH:mm format',
    example: '09:00',
  })
  startTime: string;

  @ApiProperty({
    description: 'End time in HH:mm format',
    example: '10:00',
  })
  endTime: string;

  @ApiProperty({
    description: 'Full date-time in ISO format',
    example: '2025-08-25T09:00:00.000Z',
  })
  dateTime: string;

  @ApiProperty({
    description: 'Whether this slot is available for booking',
    example: true,
  })
  isAvailable: boolean;

  @ApiPropertyOptional({
    description: 'Reason why slot is not available',
    example: 'Already booked',
  })
  unavailableReason?: string;

  @ApiPropertyOptional({
    description: 'Existing booking ID if slot is booked',
    example: 'clm789ghi012',
  })
  bookingId?: string;
}

export class DailyAvailabilityVm {
  @ApiProperty({
    description: 'Date in YYYY-MM-DD format',
    example: '2025-08-25',
  })
  date: string;

  @ApiProperty({
    description: 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
  })
  dayOfWeek: number;

  @ApiProperty({
    description: 'Day name',
    example: 'Monday',
  })
  dayName: string;

  @ApiProperty({
    description: 'Available time slots for this day',
    type: [AvailabilityTimeSlotVm],
  })
  timeSlots: AvailabilityTimeSlotVm[];

  @ApiProperty({
    description: 'Total available hours for this day',
    example: 8,
  })
  totalAvailableHours: number;

  @ApiProperty({
    description: 'Total booked hours for this day',
    example: 3,
  })
  totalBookedHours: number;

  @ApiProperty({
    description: 'Whether teacher has any availability this day',
    example: true,
  })
  hasAvailability: boolean;
}

export class WeeklyAvailabilityVm {
  @ApiProperty({
    description: 'Week start date',
    example: '2025-08-25',
  })
  weekStartDate: string;

  @ApiProperty({
    description: 'Week end date',
    example: '2025-08-31',
  })
  weekEndDate: string;

  @ApiProperty({
    description: 'Daily availability breakdown',
    type: [DailyAvailabilityVm],
  })
  days: DailyAvailabilityVm[];

  @ApiProperty({
    description: 'Total available hours for the week',
    example: 40,
  })
  totalAvailableHours: number;

  @ApiProperty({
    description: 'Total booked hours for the week',
    example: 15,
  })
  totalBookedHours: number;

  @ApiProperty({
    description: 'Total available time slots',
    example: 80,
  })
  totalAvailableSlots: number;

  @ApiProperty({
    description: 'Total booked time slots',
    example: 15,
  })
  totalBookedSlots: number;
}

export class AvailabilityStatsVm {
  @ApiProperty({
    description: 'Total availability records',
    example: 5,
  })
  totalAvailabilities: number;

  @ApiProperty({
    description: 'Active availability records',
    example: 5,
  })
  activeAvailabilities: number;

  @ApiProperty({
    description: 'Days with availability',
    example: [1, 2, 3, 4, 5],
  })
  availableDays: number[];

  @ApiProperty({
    description: 'Total hours per week',
    example: 40,
  })
  totalHoursPerWeek: number;

  @ApiProperty({
    description: 'Earliest start time',
    example: '09:00',
  })
  earliestStartTime: string;

  @ApiProperty({
    description: 'Latest end time',
    example: '17:00',
  })
  latestEndTime: string;

  @ApiProperty({
    description: 'Average hours per available day',
    example: 8,
  })
  avgHoursPerDay: number;
}

export class AvailabilityConflictVm {
  @ApiProperty({
    description: 'Whether there is a conflict',
    example: true,
  })
  hasConflict: boolean;

  @ApiProperty({
    description: 'Conflict details',
    example: 'Time slot overlaps with existing availability from 09:00 to 12:00',
  })
  conflictMessage: string;

  @ApiPropertyOptional({
    description: 'Conflicting availability records',
    type: [TeacherAvailabilityVm],
  })
  conflictingAvailabilities?: TeacherAvailabilityVm[];
}

export class BulkAvailabilityResultVm {
  @ApiProperty({
    description: 'Number of successfully created availabilities',
    example: 3,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of failed creations',
    example: 1,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Successfully created availability records',
    type: [TeacherAvailabilityVm],
  })
  successes: TeacherAvailabilityVm[];

  @ApiProperty({
    description: 'Failed creation attempts with error messages',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        index: { type: 'number', description: 'Index in original array' },
        error: { type: 'string', description: 'Error message' },
        data: { type: 'object', description: 'Original data that failed' }
      }
    }
  })
  failures: Array<{
    index: number;
    error: string;
    data: any;
  }>;
}

export class AvailabilitySummaryVm {
  @ApiProperty({
    description: 'Weekly availability schedule',
    type: [TeacherAvailabilityVm],
  })
  schedule: TeacherAvailabilityVm[];

  @ApiProperty({
    description: 'Availability statistics',
    type: AvailabilityStatsVm,
  })
  stats: AvailabilityStatsVm;

  @ApiProperty({
    description: 'Upcoming week schedules',
    type: [WeeklyAvailabilityVm],
  })
  upcomingWeeks: WeeklyAvailabilityVm[];
}
