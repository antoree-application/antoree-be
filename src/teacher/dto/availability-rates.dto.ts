import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsNotEmpty, 
  IsString, 
  IsInt, 
  Min, 
  Max, 
  IsBoolean, 
  IsOptional,
  IsArray,
  ValidateNested,
  IsPositive,
  IsEnum,
  IsDecimal
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AvailabilityType {
  REGULAR = 'REGULAR',        // Weekly recurring
  ONE_TIME = 'ONE_TIME',      // Specific date
  BLACKOUT = 'BLACKOUT'       // Unavailable periods
}

export enum RateType {
  TRIAL_LESSON = 'TRIAL_LESSON',
  REGULAR_LESSON = 'REGULAR_LESSON',
  GROUP_LESSON = 'GROUP_LESSON',
  INTENSIVE_COURSE = 'INTENSIVE_COURSE'
}

export class AvailabilitySlotDto {
  @ApiProperty({
    description: 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({
    description: 'Start time in HH:mm format',
    example: '09:00',
  })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty({
    description: 'End time in HH:mm format',
    example: '17:00',
  })
  @IsNotEmpty()
  @IsString()
  endTime: string;

  @ApiPropertyOptional({
    description: 'Type of availability',
    enum: AvailabilityType,
    example: AvailabilityType.REGULAR,
    default: AvailabilityType.REGULAR,
  })
  @IsOptional()
  @IsEnum(AvailabilityType)
  type?: AvailabilityType;

  @ApiPropertyOptional({
    description: 'Whether this slot is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TeacherRateDto {
  @ApiProperty({
    description: 'Type of rate',
    enum: RateType,
    example: RateType.TRIAL_LESSON,
  })
  @IsNotEmpty()
  @IsEnum(RateType)
  type: RateType;

  @ApiProperty({
    description: 'Rate per hour in USD',
    example: 15.00,
    minimum: 1,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  rate: number;

  @ApiPropertyOptional({
    description: 'Duration in minutes',
    example: 60,
    minimum: 15,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(180)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of students (for group lessons)',
    example: 4,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  maxStudents?: number;

  @ApiPropertyOptional({
    description: 'Whether this rate is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetupAvailabilityAndRatesDto {
  @ApiProperty({
    description: 'Weekly availability schedule',
    type: [AvailabilitySlotDto],
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availabilitySlots: AvailabilitySlotDto[];

  @ApiProperty({
    description: 'Teaching rates for different lesson types',
    type: [TeacherRateDto],
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeacherRateDto)
  rates: TeacherRateDto[];

  @ApiPropertyOptional({
    description: 'Minimum hours advance notice for bookings',
    example: 24,
    minimum: 1,
    maximum: 168, // 1 week
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  advanceNoticeHours?: number;

  @ApiPropertyOptional({
    description: 'Maximum hours in advance bookings can be made',
    example: 720, // 30 days
    minimum: 24,
    maximum: 2160, // 90 days
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(24)
  @Max(2160)
  maxAdvanceBookingHours?: number;

  @ApiPropertyOptional({
    description: 'Whether teacher allows instant booking',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowInstantBooking?: boolean;

  @ApiPropertyOptional({
    description: 'Special instructions for students',
    example: 'Please prepare any specific topics you want to focus on before the lesson.',
  })
  @IsOptional()
  @IsString()
  bookingInstructions?: string;
}

export class UpdateRateDto {
  @ApiPropertyOptional({
    description: 'Rate per hour in USD',
    example: 15.00,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  rate?: number;

  @ApiPropertyOptional({
    description: 'Duration in minutes',
    example: 60,
    minimum: 15,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(180)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of students (for group lessons)',
    example: 4,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  maxStudents?: number;

  @ApiPropertyOptional({
    description: 'Whether this rate is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GoLiveRequestDto {
  @ApiProperty({
    description: 'Confirmation that teacher has reviewed all information',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  confirmReady: boolean;

  @ApiPropertyOptional({
    description: 'Additional message from teacher',
    example: 'I am ready to start teaching and receiving booking requests.',
  })
  @IsOptional()
  @IsString()
  message?: string;
}
