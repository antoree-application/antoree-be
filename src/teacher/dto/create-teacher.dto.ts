import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeacherStatus, EnglishLevel } from '@prisma/client';
import {
  IsArray,
  IsDecimal,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  Max,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTeacherDto {
  @ApiProperty({
    description: 'User ID to create teacher profile for',
    example: 'cm3abc123def456',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiPropertyOptional({
    description: 'Teacher biography and introduction',
    example: 'Experienced English teacher with 5 years of teaching experience...',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: 'Years of teaching experience',
    example: 5,
    minimum: 0,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  experience?: number;

  @ApiPropertyOptional({
    description: 'Educational background',
    example: 'Bachelor of Arts in English Literature, University of Cambridge',
  })
  @IsOptional()
  @IsString()
  education?: string;

  @ApiPropertyOptional({
    description: 'Teaching certifications',
    example: ['TESOL', 'CELTA', 'IELTS Certified'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({
    description: 'Teaching specialties',
    example: ['Business English', 'IELTS Preparation', 'Conversational English'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @ApiProperty({
    description: 'Hourly rate in USD',
    example: 25.00,
    minimum: 1,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsPositive()
  hourlyRate: number;

  @ApiPropertyOptional({
    description: 'Teacher timezone',
    example: 'Asia/Ho_Chi_Minh',
    default: 'Asia/Ho_Chi_Minh',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Languages the teacher can teach in',
    example: ['English', 'Vietnamese'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({
    description: 'URL to teacher introduction video',
    example: 'https://youtube.com/watch?v=abc123',
  })
  @IsOptional()
  @IsUrl()
  videoIntroUrl?: string;

  @ApiPropertyOptional({
    description: 'Average response time in minutes',
    example: 30,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  responseTime?: number;
}
