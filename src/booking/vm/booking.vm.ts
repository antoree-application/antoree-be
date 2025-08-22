import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';

export class BookingVm {
  @ApiProperty({
    description: 'Booking ID',
    example: 'cm3booking123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Student ID',
    example: 'cm3student123def456',
  })
  studentId: string;

  @ApiProperty({
    description: 'Teacher ID',
    example: 'cm3teacher123def456',
  })
  teacherId: string;

  @ApiPropertyOptional({
    description: 'Course ID (if booking for a course)',
    example: 'cm3course123def456',
  })
  courseId?: string;

  @ApiProperty({
    description: 'Scheduled date and time',
    example: '2024-02-15T10:00:00Z',
  })
  scheduledAt: Date;

  @ApiProperty({
    description: 'Lesson duration in minutes',
    example: 60,
  })
  duration: number;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Focus on conversation skills',
  })
  notes?: string;

  @ApiProperty({
    description: 'Booking status',
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
  })
  status: BookingStatus;

  @ApiProperty({
    description: 'Whether this is a trial lesson',
    example: true,
  })
  isTrialLesson: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-02-10T09:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-02-12T14:30:00Z',
  })
  updatedAt: Date;

  // Related data
  @ApiProperty({
    description: 'Student information',
  })
  student: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      avatar?: string;
    };
    englishLevel: string;
    timezone: string;
  };

  @ApiProperty({
    description: 'Teacher information',
  })
  teacher: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      avatar?: string;
    };
    hourlyRate: string;
    timezone: string;
    averageRating?: string;
  };

  @ApiPropertyOptional({
    description: 'Course information (if applicable)',
  })
  course?: {
    id: string;
    name: string;
    description?: string;
    level: string;
    price: string;
  };

  @ApiPropertyOptional({
    description: 'Associated lesson (if created)',
  })
  lesson?: {
    id: string;
    status: string;
    meetingUrl?: string;
  };
}

export class BookingSearchResultVm {
  @ApiProperty({
    description: 'List of bookings',
    type: [BookingVm],
  })
  bookings: BookingVm[];

  @ApiProperty({
    description: 'Total count of bookings matching criteria',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;
}

export class AvailableTimeSlotVm {
  @ApiProperty({
    description: 'Available date (YYYY-MM-DD)',
    example: '2024-02-15',
  })
  date: string;

  @ApiProperty({
    description: 'Day of week (0=Sunday, 6=Saturday)',
    example: 4,
  })
  dayOfWeek: number;

  @ApiProperty({
    description: 'Available time slots for this date',
    type: [String],
    example: ['09:00', '10:00', '11:00', '14:00', '15:00'],
  })
  timeSlots: string[];

  @ApiProperty({
    description: 'Whether this date is today',
    example: false,
  })
  isToday: boolean;

  @ApiProperty({
    description: 'Whether this date is a weekend',
    example: false,
  })
  isWeekend: boolean;
}

export class TeacherAvailabilityVm {
  @ApiProperty({
    description: 'Teacher ID',
    example: 'cm3teacher123def456',
  })
  teacherId: string;

  @ApiProperty({
    description: 'Teacher name',
    example: 'John Smith',
  })
  teacherName: string;

  @ApiProperty({
    description: 'Teacher timezone',
    example: 'Asia/Ho_Chi_Minh',
  })
  timezone: string;

  @ApiProperty({
    description: 'Available dates and time slots',
    type: [AvailableTimeSlotVm],
  })
  availability: AvailableTimeSlotVm[];
}

export class BookingStatsVm {
  @ApiProperty({
    description: 'Total number of bookings',
    example: 150,
  })
  totalBookings: number;

  @ApiProperty({
    description: 'Number of confirmed bookings',
    example: 120,
  })
  confirmedBookings: number;

  @ApiProperty({
    description: 'Number of completed bookings',
    example: 80,
  })
  completedBookings: number;

  @ApiProperty({
    description: 'Number of cancelled bookings',
    example: 20,
  })
  cancelledBookings: number;

  @ApiProperty({
    description: 'Number of trial lessons',
    example: 45,
  })
  trialLessons: number;

  @ApiProperty({
    description: 'Number of course bookings',
    example: 105,
  })
  courseBookings: number;

  @ApiProperty({
    description: 'Booking statistics by status',
  })
  statusBreakdown: {
    [key in BookingStatus]: number;
  };

  @ApiProperty({
    description: 'Recent bookings (last 30 days)',
    example: 25,
  })
  recentBookings: number;

  @ApiProperty({
    description: 'Upcoming bookings (next 30 days)',
    example: 30,
  })
  upcomingBookings: number;
}
