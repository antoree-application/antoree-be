import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDecimal,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  Matches,
  Min,
  MinLength,
  Max,
  ArrayNotEmpty,
  ArrayUnique,
} from 'class-validator';

export class CreateTeacherAccountDto {
  @ApiProperty({
    description: 'Teacher\'s email address',
    example: 'teacher@example.com',
    required: true,
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Teacher\'s password (min 8 characters, at least 1 letter and 1 number)',
    minLength: 8,
    example: 'Password123',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({
    description: 'Teacher\'s first name',
    example: 'Jane',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z\s-']+$/, {
    message: 'First name can only contain letters, spaces, hyphens, and apostrophes',
  })
  firstName: string;

  @ApiProperty({
    description: 'Teacher\'s last name',
    example: 'Smith',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z\s-']+$/, {
    message: 'Last name can only contain letters, spaces, hyphens, and apostrophes',
  })
  lastName: string;

  @ApiPropertyOptional({
    description: 'Teacher\'s phone number',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  // @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Teacher\'s avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Brief bio describing the teacher\'s background and teaching approach',
    example: 'Experienced English teacher with 5 years of online teaching experience. I specialize in business English and conversation skills.',
    required: false,
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: 'Years of teaching experience',
    example: 5,
    minimum: 0,
    maximum: 50,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  experience?: number;

  @ApiPropertyOptional({
    description: 'Educational background',
    example: 'Bachelor\'s degree in English Literature from University of California',
    required: false,
  })
  @IsOptional()
  @IsString()
  education?: string;

  @ApiPropertyOptional({
    description: 'Teaching certifications',
    example: ['TEFL', 'TESOL', 'CELTA'],
    isArray: true,
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  certifications?: string[];

  @ApiPropertyOptional({
    description: 'Teaching specialties',
    example: ['Business English', 'Conversation', 'IELTS Preparation', 'Academic Writing'],
    isArray: true,
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  specialties?: string[];

  @ApiProperty({
    description: 'Hourly rate in USD',
    example: 25,
    minimum: 1,
    maximum: 200,
    required: false,
  })
  @IsNotEmpty()
  // @IsDecimal({ decimal_digits: '0,2' })
  @Min(1)
  @Max(200)
  @Type(() => Number)
  hourlyRate: number = 25.00;

  @ApiPropertyOptional({
    description: 'Teacher\'s timezone',
    example: 'Asia/Ho_Chi_Minh',
    default: 'Asia/Ho_Chi_Minh',
    required: false,
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    description: 'Languages the teacher can teach (English must be included)',
    example: ['English', 'Spanish'],
    isArray: true,
    type: [String],
    required: true,
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @ArrayUnique()
  languages: string[];

  @ApiPropertyOptional({
    description: 'URL to teacher\'s video introduction',
    example: 'https://youtube.com/watch?v=example',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  videoIntroUrl?: string;

  @ApiPropertyOptional({
    description: 'Average response time in minutes',
    example: 60,
    minimum: 1,
    maximum: 1440,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440) // 24 hours max
  @Type(() => Number)
  responseTime?: number;
}
