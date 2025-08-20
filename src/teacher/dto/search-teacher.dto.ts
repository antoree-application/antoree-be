import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeacherStatus, EnglishLevel } from '@prisma/client';
import { IsOptional, IsEnum, IsString, IsDecimal, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SearchTeacherDto {
  @ApiPropertyOptional({
    description: 'Search by teacher name or specialties',
    example: 'Business English',
  })
  @IsOptional()
  @IsString()
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
  @IsString()
  @Transform(({ value }) => value?.split(',').map((s: string) => s.trim()))
  specialties?: string[];

  @ApiPropertyOptional({
    description: 'Filter by languages (comma-separated)',
    example: 'English,Vietnamese',
  })
  @IsOptional()
  @IsString()
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
    enum: ['hourlyRate', 'averageRating', 'totalLessons', 'experience', 'createdAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: 'hourlyRate' | 'averageRating' | 'totalLessons' | 'experience' | 'createdAt' = 'averageRating';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
