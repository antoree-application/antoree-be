import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDecimal, IsEnum, Min, Max, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { EnglishLevel } from '@prisma/client';

export class CreateCourseDto {
  @ApiProperty({
    description: 'Course name',
    example: 'Business English Mastery',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Course description',
    example: 'A comprehensive course designed to improve your business English skills, including presentations, meetings, and professional communication.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Duration of each lesson in minutes',
    example: 60,
    minimum: 30,
    maximum: 180,
  })
  @IsNumber()
  @Min(30)
  @Max(180)
  duration: number;

  @ApiProperty({
    description: 'Total number of lessons in the course',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  totalLessons: number;

  @ApiProperty({
    description: 'Course price in VND',
    example: 1500000,
    minimum: 0,
  })
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'English level required for this course',
    enum: EnglishLevel,
    example: EnglishLevel.INTERMEDIATE,
  })
  @IsEnum(EnglishLevel)
  level: EnglishLevel;

  @ApiPropertyOptional({
    description: 'Whether the course is active and bookable',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
