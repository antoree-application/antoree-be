import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsInt,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsUUID,
  IsEmail,
  IsPhoneNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { EnglishLevel } from '@prisma/client';

export class StudentContactInfoDto {
  @ApiProperty({
    description: 'Student first name',
    example: 'John',
  })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'Student last name',
    example: 'Doe',
  })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiPropertyOptional({
    description: 'Student phone number',
    example: '+84901234567',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Student email (if different from account email)',
    example: 'john.doe.student@gmail.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Student timezone',
    example: 'Asia/Ho_Chi_Minh',
    default: 'Asia/Ho_Chi_Minh',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class LearningGoalsDto {
  @ApiProperty({
    description: 'Current English level',
    enum: EnglishLevel,
    example: EnglishLevel.INTERMEDIATE,
  })
  @IsNotEmpty()
  @IsEnum(EnglishLevel)
  currentLevel: EnglishLevel;

  @ApiPropertyOptional({
    description: 'Desired English level',
    enum: EnglishLevel,
    example: EnglishLevel.UPPER_INTERMEDIATE,
  })
  @IsOptional()
  @IsEnum(EnglishLevel)
  targetLevel?: EnglishLevel;

  @ApiProperty({
    description: 'Primary learning objectives',
    example: ['Improve speaking fluency', 'Business English', 'IELTS preparation'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  learningObjectives: string[];

  @ApiPropertyOptional({
    description: 'Specific areas to focus on',
    example: ['Pronunciation', 'Grammar', 'Vocabulary', 'Listening'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  focusAreas?: string[];

  @ApiPropertyOptional({
    description: 'Previous English learning experience',
    example: 'Self-taught for 2 years, took some online courses',
  })
  @IsOptional()
  @IsString()
  previousExperience?: string;

  @ApiPropertyOptional({
    description: 'Timeline for achieving goals',
    example: '3-6 months',
  })
  @IsOptional()
  @IsString()
  timeline?: string;

  @ApiPropertyOptional({
    description: 'Preferred lesson frequency per week',
    example: 2,
    minimum: 1,
    maximum: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  preferredFrequency?: number;

  @ApiPropertyOptional({
    description: 'Additional notes about learning goals',
    example: 'I need to prepare for a job interview in English next month',
  })
  @IsOptional()
  @IsString()
  additionalNotes?: string;
}

export class BookingTimeSlotDto {
  @ApiProperty({
    description: 'Teacher ID',
    example: 'cm3teacher123def456',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  teacherId: string;

  @ApiProperty({
    description: 'Selected date and time (ISO 8601 format)',
    example: '2024-02-15T10:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({
    description: 'Lesson duration in minutes',
    example: 30,
    minimum: 15,
    maximum: 180,
  })
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(180)
  duration: number;

  @ApiPropertyOptional({
    description: 'Lesson type preference',
    example: 'trial',
  })
  @IsOptional()
  @IsString()
  lessonType?: string;
}

export class CreateBookingWithDetailsDto {
  @ApiProperty({
    description: 'Booking time slot information',
    type: BookingTimeSlotDto,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => BookingTimeSlotDto)
  timeSlot: BookingTimeSlotDto;

  @ApiProperty({
    description: 'Student contact information',
    type: StudentContactInfoDto,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => StudentContactInfoDto)
  contactInfo: StudentContactInfoDto;

  @ApiProperty({
    description: 'Learning goals and objectives',
    type: LearningGoalsDto,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LearningGoalsDto)
  learningGoals: LearningGoalsDto;

  @ApiPropertyOptional({
    description: 'Whether this is a trial lesson',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isTrialLesson?: boolean;

  @ApiPropertyOptional({
    description: 'Additional message for the teacher',
    example: 'Looking forward to our lesson! I am particularly interested in improving my speaking skills.',
  })
  @IsOptional()
  @IsString()
  messageToTeacher?: string;

  @ApiPropertyOptional({
    description: 'How the student found this teacher',
    example: 'Search results',
  })
  @IsOptional()
  @IsString()
  howFoundTeacher?: string;
}

export class ConfirmBookingDto {
  @ApiProperty({
    description: 'Booking ID to confirm',
    example: 'cm3booking123def456',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  bookingId: string;

  @ApiPropertyOptional({
    description: 'Final confirmation notes',
    example: 'Confirmed payment and ready for the lesson',
  })
  @IsOptional()
  @IsString()
  confirmationNotes?: string;

  @ApiPropertyOptional({
    description: 'Terms and conditions acceptance',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  acceptTerms?: boolean;
}

export class GetAvailableSlotsDto {
  @ApiProperty({
    description: 'Teacher ID to get available slots for',
    example: 'cm3teacher123def456',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  teacherId: string;

  @ApiPropertyOptional({
    description: 'Start date for availability search (YYYY-MM-DD)',
    example: '2024-02-15',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for availability search (YYYY-MM-DD)',
    example: '2024-02-22',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Lesson duration in minutes',
    example: 30,
    minimum: 15,
    maximum: 180,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(180)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Student timezone for slot display',
    example: 'Asia/Ho_Chi_Minh',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class BookingNotificationDto {
  @ApiProperty({
    description: 'Notification type',
    example: 'NEW_BOOKING_REQUEST',
  })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Booking ID',
    example: 'cm3booking123def456',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  bookingId: string;

  @ApiPropertyOptional({
    description: 'Additional notification data',
  })
  @IsOptional()
  metadata?: any;
}

export class TeacherBookingActionDto {
  @ApiProperty({
    description: 'Action to take on the booking',
    enum: ['ACCEPT', 'DECLINE', 'REQUEST_RESCHEDULE'],
    example: 'ACCEPT',
  })
  @IsNotEmpty()
  @IsString()
  action: 'ACCEPT' | 'DECLINE' | 'REQUEST_RESCHEDULE';

  @ApiPropertyOptional({
    description: 'Response message to student',
    example: 'I look forward to our lesson! Please prepare some topics you would like to discuss.',
  })
  @IsOptional()
  @IsString()
  responseMessage?: string;

  @ApiPropertyOptional({
    description: 'Alternative time slots if requesting reschedule',
    example: ['2024-02-16T10:00:00Z', '2024-02-16T14:00:00Z'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternativeSlots?: string[];

  @ApiPropertyOptional({
    description: 'Reason for declining (if action is DECLINE)',
    example: 'Schedule conflict',
  })
  @IsOptional()
  @IsString()
  declineReason?: string;
}
