import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDecimal,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  Max,
  IsPositive,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SetupTeacherProfileDto {
  @ApiProperty({
    description: 'Teacher biography and introduction',
    example: 'Experienced English teacher with 5 years of teaching experience...',
    minLength: 50,
    maxLength: 1000,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(50, { message: 'Bio must be at least 50 characters long' })
  @MaxLength(1000, { message: 'Bio cannot exceed 1000 characters' })
  bio: string;

  @ApiProperty({
    description: 'Years of teaching experience',
    example: 5,
    minimum: 0,
    maximum: 50,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Max(50)
  experience: number;

  @ApiProperty({
    description: 'Educational background',
    example: 'Bachelor of Arts in English Literature, University of Cambridge',
    minLength: 10,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10, { message: 'Education must be at least 10 characters long' })
  education: string;

  @ApiProperty({
    description: 'Teaching certifications (at least one required)',
    example: ['TESOL', 'CELTA', 'IELTS Certified'],
    type: [String],
  })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  certifications: string[];

  @ApiProperty({
    description: 'Teaching specialties (at least one required)',
    example: ['Business English', 'IELTS Preparation', 'Conversational English'],
    type: [String],
  })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  specialties: string[];

  @ApiProperty({
    description: 'Hourly rate in USD',
    example: 25.00,
    minimum: 5,
    maximum: 200,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsPositive()
  @Min(5, { message: 'Hourly rate must be at least $5' })
  @Max(200, { message: 'Hourly rate cannot exceed $200' })
  hourlyRate: number;

  @ApiPropertyOptional({
    description: 'Teacher timezone',
    example: 'Asia/Ho_Chi_Minh',
    default: 'Asia/Ho_Chi_Minh',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    description: 'Languages the teacher can teach in (at least English required)',
    example: ['English', 'Vietnamese'],
    type: [String],
  })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  languages: string[];

  @ApiPropertyOptional({
    description: 'URL to teacher introduction video',
    example: 'https://youtube.com/watch?v=abc123',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid video URL' })
  videoIntroUrl?: string;

  @ApiPropertyOptional({
    description: 'Average response time in minutes',
    example: 30,
    minimum: 1,
    maximum: 1440,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440, { message: 'Response time cannot exceed 24 hours (1440 minutes)' })
  responseTime?: number;

  @ApiPropertyOptional({
    description: 'Agree to terms and conditions',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  agreeToTerms?: boolean;
}
