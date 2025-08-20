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
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'Teacher ID to book',
    example: 'cm3teacher123def456',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  teacherId: string;

  @ApiPropertyOptional({
    description: 'Course ID (optional for trial lessons)',
    example: 'cm3course123def456',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  courseId?: string;

  @ApiProperty({
    description: 'Scheduled date and time (ISO 8601 format)',
    example: '2024-02-15T10:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  scheduledAt: string;

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
    description: 'Additional notes for the teacher',
    example: 'I would like to focus on business English conversation',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Whether this is a trial lesson',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isTrialLesson?: boolean;
}

export class BookTrialLessonDto {
  @ApiProperty({
    description: 'Teacher ID to book trial lesson with',
    example: 'cm3teacher123def456',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  teacherId: string;

  @ApiProperty({
    description: 'Scheduled date and time (ISO 8601 format)',
    example: '2024-02-15T10:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({
    description: 'Trial lesson duration in minutes (15-60)',
    example: 30,
    minimum: 15,
    maximum: 60,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(60)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Learning goals or specific topics to discuss',
    example: 'I want to improve my pronunciation and speaking confidence',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BookCourseDto {
  @ApiProperty({
    description: 'Course ID to book',
    example: 'cm3course123def456',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  courseId: string;

  @ApiProperty({
    description: 'Preferred start date and time (ISO 8601 format)',
    example: '2024-02-15T10:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  preferredStartDate: string;

  @ApiPropertyOptional({
    description: 'Special requests or learning objectives',
    example: 'I need to prepare for IELTS exam in 3 months',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
