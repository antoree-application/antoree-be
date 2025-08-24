import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeacherStatus, EnglishLevel } from '@prisma/client';
import { IsOptional, IsEnum, IsString, IsDecimal, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class  SearchTeacherDto {
  @ApiPropertyOptional({
    description: 'Search by teacher name, specialties, or bio',
    example: 'Business English',
  })
  @IsOptional()
  
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by English level',
    enum: EnglishLevel,
    example: EnglishLevel.INTERMEDIATE,
  })
  @IsOptional()
  @IsEnum(EnglishLevel)
  level?: EnglishLevel;

  @ApiPropertyOptional({
    description: 'Filter by teacher status',
    enum: TeacherStatus,
    example: TeacherStatus.APPROVED,
  })
  @IsOptional()
  @IsEnum(TeacherStatus)
  status?: TeacherStatus;

  @ApiPropertyOptional({
    description: 'Minimum hourly rate',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minRate?: number;

  @ApiPropertyOptional({
    description: 'Maximum hourly rate',
    example: 50,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxRate?: number;

  @ApiPropertyOptional({
    description: 'Filter by specialties (comma-separated)',
    example: 'Business English,IELTS Preparation',
  })
  @IsOptional()
  @Transform(({ value }) => value?.split(',').map((s: string) => s.trim()))
  specialties?: string[];

  @ApiPropertyOptional({
    description: 'Filter by certifications (comma-separated)',
    example: 'TESOL,TEFL,CELTA',
  })
  @IsOptional()
  @Transform(({ value }) => value?.split(',').map((s: string) => s.trim()))
  certifications?: string[];

  @ApiPropertyOptional({
    description: 'Filter by languages (comma-separated)',
    example: 'English,Vietnamese',
  })
  @IsOptional()
  
  @Transform(({ value }) => value?.split(',').map((s: string) => s.trim()))
  languages?: string[];

  @ApiPropertyOptional({
    description: 'Minimum years of experience',
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minExperience?: number;

  @ApiPropertyOptional({
    description: 'Minimum rating (1-5)',
    example: 4.0,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({
    description: 'Filter by teacher timezone',
    example: 'Asia/Ho_Chi_Minh',
  })
  @IsOptional()
  
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Filter teachers who accept instant booking',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  instantBooking?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by availability on specific day (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(6)
  availableOnDay?: number;

  @ApiPropertyOptional({
    description: 'Filter teachers available at specific time (HH:mm format)',
    example: '14:00',
  })
  @IsOptional()
  
  availableAtTime?: string;

  @ApiPropertyOptional({
    description: 'Filter teachers with video introduction',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasVideoIntro?: boolean;

  @ApiPropertyOptional({
    description: 'Only show live teachers accepting bookings',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyLive?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum response time in minutes',
    example: 60,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxResponseTime?: number;

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
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'averageRating',
    enum: ['hourlyRate', 'averageRating', 'totalLessons', 'experience', 'createdAt', 'responseTime'],
  })
  @IsOptional()
  
  sortBy?: 'hourlyRate' | 'averageRating' | 'totalLessons' | 'experience' | 'createdAt' | 'responseTime' = 'averageRating';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  
  sortOrder?: 'asc' | 'desc' = 'desc';
}
