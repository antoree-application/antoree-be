import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: 'cm123abc',
  })
  id: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  avatar?: string;

  @ApiProperty({
    description: 'User role',
    example: UserRole.STUDENT,
    enum: UserRole,
  })
  role: UserRole;

  @ApiProperty({
    description: 'Whether the user is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Last login date',
    example: '2023-01-01T00:00:00.000Z',
    required: false,
  })
  lastLogin?: Date;

  @ApiProperty({
    description: 'Date when the user was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the user was last updated',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
