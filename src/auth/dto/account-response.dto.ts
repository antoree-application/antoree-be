import { ApiProperty } from '@nestjs/swagger';

export class StudentAccountResponseDto {
  @ApiProperty({
    description: 'Student user ID',
    example: 'clxxxxx123',
  })
  id: string;

  // @ApiProperty({
  //   description: 'Student ID from student table',
  //   example: 'clxxxxx456',
  // })
  // studentId: string;

  @ApiProperty({
    description: 'Student\'s email address',
    example: 'student@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Student\'s first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'Student\'s last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'Student\'s full name',
    example: 'John Doe',
  })
  fullName: string;

  @ApiProperty({
    description: 'Student\'s phone number',
    example: '+1234567890',
    nullable: true,
  })
  phone?: string;

  @ApiProperty({
    description: 'Student\'s avatar URL',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  avatar?: string;

  @ApiProperty({
    description: 'Student\'s English level',
    example: 'BEGINNER',
  })
  englishLevel: string;

  @ApiProperty({
    description: 'Student\'s learning goals',
    example: 'I want to improve my conversation skills',
    nullable: true,
  })
  learningGoals?: string;

  @ApiProperty({
    description: 'Student\'s timezone',
    example: 'Asia/Ho_Chi_Minh',
  })
  timezone: string;

  @ApiProperty({
    description: 'User role',
    example: 'STUDENT',
  })
  role: string;

  @ApiProperty({
    description: 'Whether the account is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Account creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Account last update date',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class TeacherAccountResponseDto {
  @ApiProperty({
    description: 'Teacher user ID',
    example: 'clxxxxx123',
  })
  id: string;

  // @ApiProperty({
  //   description: 'Teacher ID from teacher table',
  //   example: 'clxxxxx456',
  // })
  // teacherId: string;

  @ApiProperty({
    description: 'Teacher\'s email address',
    example: 'teacher@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Teacher\'s first name',
    example: 'Jane',
  })
  firstName: string;

  @ApiProperty({
    description: 'Teacher\'s last name',
    example: 'Smith',
  })
  lastName: string;

  @ApiProperty({
    description: 'Teacher\'s full name',
    example: 'Jane Smith',
  })
  fullName: string;

  @ApiProperty({
    description: 'Teacher\'s phone number',
    example: '+1234567890',
    nullable: true,
  })
  phone?: string;

  @ApiProperty({
    description: 'Teacher\'s avatar URL',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  avatar?: string;

  @ApiProperty({
    description: 'Teacher\'s bio',
    example: 'Experienced English teacher...',
    nullable: true,
  })
  bio?: string;

  @ApiProperty({
    description: 'Years of teaching experience',
    example: 5,
  })
  experience: number;

  @ApiProperty({
    description: 'Educational background',
    example: 'Bachelor\'s degree in English Literature',
    nullable: true,
  })
  education?: string;

  @ApiProperty({
    description: 'Teaching certifications',
    example: ['TEFL', 'TESOL'],
    isArray: true,
    type: [String],
  })
  certifications: string[];

  @ApiProperty({
    description: 'Teaching specialties',
    example: ['Business English', 'Conversation'],
    isArray: true,
    type: [String],
  })
  specialties: string[];

  @ApiProperty({
    description: 'Hourly rate in USD',
    example: '25.00',
    default: '25.00',
  })
  hourlyRate: string;

  @ApiProperty({
    description: 'Teacher\'s timezone',
    example: 'Asia/Ho_Chi_Minh',
  })
  timezone: string;

  @ApiProperty({
    description: 'Languages the teacher can teach',
    example: ['English', 'Spanish'],
    isArray: true,
    type: [String],
  })
  languages: string[];

  @ApiProperty({
    description: 'Video introduction URL',
    example: 'https://youtube.com/watch?v=example',
    nullable: true,
  })
  videoIntroUrl?: string;

  @ApiProperty({
    description: 'Teacher status',
    example: 'PENDING',
  })
  status: string;

  @ApiProperty({
    description: 'Total lessons taught',
    example: 0,
  })
  totalLessons: number;

  @ApiProperty({
    description: 'Average rating',
    example: null,
    nullable: true,
  })
  averageRating?: string;

  @ApiProperty({
    description: 'Response time in minutes',
    example: 60,
    nullable: true,
  })
  responseTime?: number;

  @ApiProperty({
    description: 'Whether profile setup is completed',
    example: true,
  })
  profileCompleted: boolean;

  @ApiProperty({
    description: 'Whether verification documents are submitted',
    example: false,
  })
  verificationSubmitted: boolean;

  @ApiProperty({
    description: 'Whether availability and rates are setup',
    example: false,
  })
  availabilitySetup: boolean;

  @ApiProperty({
    description: 'Whether teacher profile is live',
    example: false,
  })
  isLive: boolean;

  @ApiProperty({
    description: 'User role',
    example: 'TEACHER',
  })
  role: string;

  @ApiProperty({
    description: 'Whether the account is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Account creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Account last update date',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
