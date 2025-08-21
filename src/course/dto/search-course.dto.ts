import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EnglishLevel } from '@prisma/client';

export class SearchCourseDto {
  @ApiPropertyOptional({
    description: 'Search query for course name or description',
    example: 'business english',
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
    description: 'Minimum price filter in VND',
    example: 500000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price filter in VND',
    example: 2000000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Minimum duration per lesson in minutes',
    example: 30,
    minimum: 30,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(30)
  @Max(180)
  minDuration?: number;

  @ApiPropertyOptional({
    description: 'Maximum duration per lesson in minutes',
    example: 120,
    minimum: 30,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(30)
  @Max(180)
  maxDuration?: number;

  @ApiPropertyOptional({
    description: 'Minimum number of lessons',
    example: 5,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minLessons?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of lessons',
    example: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxLessons?: number;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Teacher ID to filter courses by specific teacher',
    example: 'cm3teacher123def456',
  })
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'price',
    enum: ['name', 'price', 'duration', 'totalLessons', 'level', 'createdAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'price' | 'duration' | 'totalLessons' | 'level' | 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
