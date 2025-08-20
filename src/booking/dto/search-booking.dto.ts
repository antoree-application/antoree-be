import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsString,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class SearchBookingDto {
  @ApiPropertyOptional({
    description: 'Filter by booking status',
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({
    description: 'Filter by teacher ID',
    example: 'cm3teacher123def456',
  })
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiPropertyOptional({
    description: 'Filter by student ID',
    example: 'cm3student123def456',
  })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by course ID',
    example: 'cm3course123def456',
  })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({
    description: 'Start date for filtering (ISO 8601 format)',
    example: '2024-02-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering (ISO 8601 format)',
    example: '2024-02-28T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by trial lesson status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isTrialLesson?: boolean;

  @ApiPropertyOptional({
    description: 'Search in notes (partial match)',
    example: 'IELTS',
  })
  @IsOptional()
  @IsString()
  searchNotes?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'scheduledAt',
    enum: ['scheduledAt', 'createdAt', 'status', 'duration'],
  })
  @IsOptional()
  @IsString()
  sortBy?: 'scheduledAt' | 'createdAt' | 'status' | 'duration' = 'scheduledAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class GetAvailableTimesDto {
  @ApiPropertyOptional({
    description: 'Teacher ID to check availability',
    example: 'cm3teacher123def456',
  })
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiPropertyOptional({
    description: 'Date to check availability (YYYY-MM-DD format)',
    example: '2024-02-15',
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Number of days to check ahead',
    example: 7,
    minimum: 1,
    maximum: 30,
    default: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(30)
  daysAhead?: number = 7;

  @ApiPropertyOptional({
    description: 'Preferred lesson duration in minutes',
    example: 60,
    minimum: 15,
    maximum: 180,
    default: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(15)
  @Max(180)
  duration?: number = 60;
}
