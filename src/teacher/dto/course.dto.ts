import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnglishLevel } from '@prisma/client';
import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsEnum,
  IsPositive,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCourseDto {
  @ApiProperty({
    description: 'Course name',
    example: 'Business English Fundamentals',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Course description',
    example: 'Learn essential business English skills for professional communication',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Duration of each lesson in minutes',
    example: 60,
    minimum: 15,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  duration: number;

  @ApiProperty({
    description: 'Total number of lessons in the course',
    example: 10,
    minimum: 1,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalLessons: number;

  @ApiProperty({
    description: 'Course price',
    example: 299.99,
    minimum: 0,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsPositive()
  price: number;

  @ApiProperty({
    description: 'Required English level for this course',
    enum: EnglishLevel,
    example: EnglishLevel.INTERMEDIATE,
  })
  @IsNotEmpty()
  @IsEnum(EnglishLevel)
  level: EnglishLevel;

  @ApiPropertyOptional({
    description: 'Whether the course is active and available for booking',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCourseDto {
  @ApiPropertyOptional({
    description: 'Course name',
    example: 'Business English Fundamentals',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Course description',
    example: 'Learn essential business English skills for professional communication',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Duration of each lesson in minutes',
    example: 60,
    minimum: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Total number of lessons in the course',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalLessons?: number;

  @ApiPropertyOptional({
    description: 'Course price',
    example: 299.99,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({
    description: 'Required English level for this course',
    enum: EnglishLevel,
    example: EnglishLevel.INTERMEDIATE,
  })
  @IsOptional()
  @IsEnum(EnglishLevel)
  level?: EnglishLevel;

  @ApiPropertyOptional({
    description: 'Whether the course is active and available for booking',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
