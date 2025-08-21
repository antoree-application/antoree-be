import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsPositive,
  Min,
  Max,
  IsUUID,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { LessonPackageType } from '../../payment/dto/payment.dto';

export class BookLessonPackageDto {
  @ApiProperty({
    description: 'Teacher ID',
    example: 'cm3teacher123def456',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  teacherId: string;

  @ApiProperty({
    description: 'Type of lesson package',
    enum: LessonPackageType,
    example: LessonPackageType.PACKAGE_10,
  })
  @IsNotEmpty()
  @IsEnum(LessonPackageType)
  packageType: LessonPackageType;

  @ApiProperty({
    description: 'Number of lessons in the package',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(50)
  numberOfLessons: number;

  @ApiProperty({
    description: 'Duration per lesson in minutes',
    example: 60,
    minimum: 30,
    maximum: 120,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Min(30)
  @Max(120)
  durationPerLesson: number;

  @ApiPropertyOptional({
    description: 'Preferred lesson schedule times (ISO 8601 format)',
    type: [String],
    example: ['2024-02-15T10:00:00Z', '2024-02-17T10:00:00Z'],
  })
  @IsOptional()
  @IsArray()
  @IsDateString({}, { each: true })
  preferredSchedule?: string[];

  @ApiPropertyOptional({
    description: 'Special requests or learning objectives',
    example: 'Focus on business English and presentation skills',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Student learning goals',
  })
  @IsOptional()
  learningGoals?: {
    currentLevel?: string;
    targetLevel?: string;
    specificGoals?: string[];
    timeframe?: string;
  };

  @ApiPropertyOptional({
    description: 'Student contact information updates',
  })
  @IsOptional()
  contactInfo?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    timezone?: string;
  };
}

export class ScheduleLessonFromPackageDto {
  @ApiProperty({
    description: 'Lesson package ID',
    example: 'cm3package123def456',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  lessonPackageId: string;

  @ApiProperty({
    description: 'Scheduled date and time (ISO 8601 format)',
    example: '2024-02-15T10:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({
    description: 'Lesson duration in minutes (will use package default if not specified)',
    example: 60,
    minimum: 30,
    maximum: 120,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Min(30)
  @Max(120)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Specific lesson notes or objectives',
    example: 'Focus on pronunciation this lesson',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
