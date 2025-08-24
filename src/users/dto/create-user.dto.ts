import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'User\'s email address',
    example: 'user@example.com',
    required: true,
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User\'s password (min 8 characters, at least 1 letter and 1 number)',
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
    description: 'User\'s first name',
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
    description: 'User\'s last name',
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
    description: 'User\'s phone number',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({
    description: 'User\'s avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'User role',
    enum: UserRole,
    default: UserRole.STUDENT,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Whether the user account is active',
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
