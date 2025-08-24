import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsNotEmpty, 
  IsString, 
  IsDateString,
  IsOptional,
  IsEnum,
  Min,
  Max,
  IsInt,
  ValidateNested,
  IsArray,
  ArrayNotEmpty
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class GetAvailableTimeSlotsDto {
  @ApiProperty({
    description: 'Start date in YYYY-MM-DD format',
    example: '2025-08-25',
  })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date in YYYY-MM-DD format',
    example: '2025-08-31',
  })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Duration of each time slot in minutes',
    example: 60,
    minimum: 15,
    maximum: 180,
    default: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(180)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Minimum break time between slots in minutes',
    example: 15,
    minimum: 0,
    maximum: 60,
    default: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  breakTime?: number;

  @ApiPropertyOptional({
    description: 'Include slots that are less than advance notice hours',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  includeShortNotice?: boolean;
}

export class CheckTeacherAvailableDto {
  @ApiProperty({
    description: 'Date and time of the proposed lesson (ISO 8601)',
    example: '2025-08-25T10:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  dateTime: string;

  @ApiProperty({
    description: 'Duration of the lesson in minutes',
    example: 60,
    minimum: 15,
    maximum: 180,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(180)
  duration: number;

  @ApiPropertyOptional({
    description: 'Exclude this booking ID from conflict checking (for rescheduling)',
    example: 'clm123abc456',
  })
  @IsOptional()
  @IsString()
  excludeBookingId?: string;
}

export class BulkAvailabilityCheckDto {
  @ApiProperty({
    description: 'Array of date-time and duration pairs to check',
    type: [CheckTeacherAvailableDto],
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CheckTeacherAvailableDto)
  slots: CheckTeacherAvailableDto[];
}

export class WeeklyScheduleQueryDto {
  @ApiPropertyOptional({
    description: 'Week start date in YYYY-MM-DD format (defaults to current week)',
    example: '2025-08-25',
  })
  @IsOptional()
  @IsDateString()
  weekStartDate?: string;

  @ApiPropertyOptional({
    description: 'Number of weeks to include',
    example: 4,
    minimum: 1,
    maximum: 12,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  weeksCount?: number;

  @ApiPropertyOptional({
    description: 'Include existing bookings',
    example: true,
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  includeBookings?: boolean;

  @ApiPropertyOptional({
    description: 'Time slot duration for availability breakdown',
    example: 60,
    minimum: 15,
    maximum: 180,
    default: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(180)
  slotDuration?: number;
}
