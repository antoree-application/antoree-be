import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnglishLevel } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateStudentAccountDto {
  @ApiProperty({
    description: 'Student\'s email address',
    example: 'student@example.com',
    required: true,
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Student\'s password (min 8 characters, at least 1 letter and 1 number)',
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
    description: 'Student\'s first name',
    example: 'John',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z\s-']+$/, {
    message: 'First name can only contain letters, spaces, hyphens, and apostrophes',
  })
  firstName: string;

  @ApiProperty({
    description: 'Student\'s last name',
    example: 'Doe',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z\s-']+$/, {
    message: 'Last name can only contain letters, spaces, hyphens, and apostrophes',
  })
  lastName: string;

  @ApiPropertyOptional({
    description: 'Student\'s phone number',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Student\'s avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Student\'s current English level',
    enum: EnglishLevel,
    default: EnglishLevel.BEGINNER,
    required: false,
  })
  @IsOptional()
  @IsEnum(EnglishLevel)
  englishLevel?: EnglishLevel;

  @ApiPropertyOptional({
    description: 'Student\'s learning goals',
    example: 'I want to improve my conversation skills for business meetings',
    required: false,
  })
  @IsOptional()
  @IsString()
  learningGoals?: string;

  @ApiPropertyOptional({
    description: 'Student\'s timezone',
    example: 'Asia/Ho_Chi_Minh',
    default: 'Asia/Ho_Chi_Minh',
    required: false,
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
