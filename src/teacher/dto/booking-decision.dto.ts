import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';

export enum BookingAction {
  BOOK_TRIAL_LESSON = 'BOOK_TRIAL_LESSON',
  BOOK_REGULAR_LESSON = 'BOOK_REGULAR_LESSON',
  VIEW_AVAILABILITY = 'VIEW_AVAILABILITY',
  BACK_TO_LIST = 'BACK_TO_LIST',
  SAVE_FOR_LATER = 'SAVE_FOR_LATER',
}

export class BookingDecisionDto {
  @ApiProperty({
    description: 'Teacher ID the student is interested in',
    example: 'clp123abc456def789ghi012',
  })
  @IsUUID()
  teacherId: string;

  @ApiPropertyOptional({
    description: 'Student user ID for personalized options',
    example: 'usr123abc456def789ghi012',
  })
  @IsOptional()
  @IsUUID()
  studentUserId?: string;

  @ApiPropertyOptional({
    description: 'Include availability information',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeAvailability?: boolean;

  @ApiPropertyOptional({
    description: 'Number of review samples to include',
    default: 3,
  })
  @IsOptional()
  @IsString()
  reviewSamples?: number;
}

export class ExecuteBookingActionDto {
  @ApiProperty({
    description: 'Action to execute',
    enum: BookingAction,
  })
  @IsEnum(BookingAction)
  action: BookingAction;

  @ApiProperty({
    description: 'Teacher ID',
    example: 'clp123abc456def789ghi012',
  })
  @IsUUID()
  teacherId: string;

  @ApiPropertyOptional({
    description: 'Additional parameters for the action',
  })
  @IsOptional()
  parameters?: Record<string, any>;
}

export class TeacherInterestResponseDto {
  @ApiProperty({ description: 'Teacher basic information' })
  teacher: {
    id: string;
    fullName: string;
    avatar?: string;
    bio?: string;
    experience: number;
    specialties: string[];
    languages: string[];
    hourlyRate: string;
    averageRating?: string;
    totalLessons: number;
    responseTime?: number;
    timezone: string;
    videoIntroUrl?: string;
  };

  @ApiProperty({ description: 'Booking-related information' })
  bookingInfo: {
    canBookTrial: boolean;
    hasTrialLesson: boolean;
    trialLessonRate?: string;
    trialLessonDuration: number;
    regularLessonRate?: string;
    regularLessonDuration: number;
    advanceNoticeHours: number;
    allowInstantBooking: boolean;
    bookingInstructions?: string;
  };

  @ApiProperty({ description: 'Availability information' })
  availability: {
    nextAvailableSlots: any[];
    totalSlotsAvailable: number;
  };

  @ApiProperty({ description: 'Recent reviews' })
  reviews: Array<{
    id: string;
    rating: number;
    comment?: string;
    createdAt: Date;
    studentName: string;
    studentAvatar?: string;
  }>;

  @ApiProperty({ description: 'Teacher statistics' })
  stats: {
    totalLessons: number;
    totalReviews: number;
    averageRating: number;
    responseTime?: number;
  };

  @ApiProperty({ description: 'Available action options' })
  actionOptions: {
    canBookTrialLesson: boolean;
    canBookRegularLesson: boolean;
    trialLessonPrice?: string;
    regularLessonPrice?: string;
    recommendedAction: 'BOOK_TRIAL' | 'BOOK_REGULAR';
  };
}

export class BookingOptionsResponseDto {
  @ApiProperty({ description: 'Basic teacher information' })
  teacherInfo: {
    id: string;
    name: string;
    avatar?: string;
    rating?: string;
    specialties: string[];
  };

  @ApiProperty({ description: 'Recommended action' })
  recommendedAction: 'BOOK_TRIAL' | 'BOOK_REGULAR';

  @ApiProperty({ description: 'Number of available time slots' })
  availableSlots: number;

  @ApiProperty({ description: 'Available action options' })
  options: Array<{
    action: string;
    title: string;
    description: string;
    price?: string;
    currency?: string;
    duration?: number;
    buttonText: string;
    buttonStyle: 'primary' | 'secondary' | 'outline' | 'text';
    benefits?: string[];
    endpoint: string;
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    payload?: Record<string, any>;
  }>;

  @ApiProperty({ description: 'Decision flow information' })
  decisionFlow: {
    title: string;
    subtitle: string;
    primaryRecommendation: string;
  };
}
