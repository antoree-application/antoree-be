import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeacherStatus, EnglishLevel } from '@prisma/client';
import { DocumentType } from '../dto/verification.dto';
import { AvailabilityType, RateType } from '../dto/availability-rates.dto';

export class TeacherVm {
  @ApiProperty({
    description: 'Teacher ID',
    example: 'cm3abc123def456',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Teacher biography',
    example: 'Experienced English teacher with 5 years of teaching experience...',
  })
  bio?: string;

  @ApiProperty({
    description: 'Years of teaching experience',
    example: 5,
  })
  experience: number;

  @ApiPropertyOptional({
    description: 'Educational background',
    example: 'Bachelor of Arts in English Literature',
  })
  education?: string;

  @ApiProperty({
    description: 'Teaching certifications',
    example: ['TESOL', 'CELTA'],
    type: [String],
  })
  certifications: string[];

  @ApiProperty({
    description: 'Teaching specialties',
    example: ['Business English', 'IELTS Preparation'],
    type: [String],
  })
  specialties: string[];

  @ApiProperty({
    description: 'Hourly rate',
    example: '25.00',
  })
  hourlyRate: string;

  @ApiProperty({
    description: 'Teacher timezone',
    example: 'Asia/Ho_Chi_Minh',
  })
  timezone: string;

  @ApiProperty({
    description: 'Languages taught',
    example: ['English', 'Vietnamese'],
    type: [String],
  })
  languages: string[];

  @ApiPropertyOptional({
    description: 'Video introduction URL',
    example: 'https://youtube.com/watch?v=abc123',
  })
  videoIntroUrl?: string;

  @ApiProperty({
    description: 'Teacher status',
    enum: TeacherStatus,
    example: TeacherStatus.APPROVED,
  })
  status: TeacherStatus;

  @ApiProperty({
    description: 'Total lessons taught',
    example: 150,
  })
  totalLessons: number;

  @ApiPropertyOptional({
    description: 'Average rating (1-5)',
    example: '4.85',
  })
  averageRating?: string;

  @ApiPropertyOptional({
    description: 'Response time in minutes',
    example: 30,
  })
  responseTime?: number;

  @ApiProperty({
    description: 'Whether profile setup is completed',
    example: true,
  })
  profileCompleted: boolean;

  @ApiProperty({
    description: 'Whether verification documents have been submitted',
    example: false,
  })
  verificationSubmitted: boolean;

  @ApiProperty({
    description: 'Whether availability and rates have been setup',
    example: false,
  })
  availabilitySetup: boolean;

  @ApiProperty({
    description: 'Whether teacher profile is live and accepting bookings',
    example: false,
  })
  isLive: boolean;

  @ApiPropertyOptional({
    description: 'Minimum hours advance notice for bookings',
    example: 24,
  })
  advanceNoticeHours?: number;

  @ApiPropertyOptional({
    description: 'Maximum hours in advance bookings can be made',
    example: 720,
  })
  maxAdvanceBookingHours?: number;

  @ApiProperty({
    description: 'Whether teacher allows instant booking',
    example: false,
  })
  allowInstantBooking: boolean;

  @ApiPropertyOptional({
    description: 'Instructions for students when booking',
    example: 'Please prepare any specific topics you want to focus on.',
  })
  bookingInstructions?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-20T15:30:00Z',
  })
  updatedAt: Date;

  // User information
  @ApiProperty({
    description: 'Teacher full name',
    example: 'John Doe',
  })
  fullName: string;

  @ApiProperty({
    description: 'Teacher email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'Teacher avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Teacher phone number',
    example: '+1234567890',
  })
  phone?: string;

  @ApiProperty({
    description: 'Whether teacher account is active',
    example: true,
  })
  isActive: boolean;

  // Enhanced fields for student browsing
  @ApiPropertyOptional({
    description: 'Days when teacher is available (0=Sunday, 1=Monday, etc.)',
    example: [1, 2, 3, 4, 5],
    type: [Number],
  })
  availableDays?: number[];

  @ApiPropertyOptional({
    description: 'Trial lesson rate',
    example: '15.00',
  })
  trialLessonRate?: string;

  @ApiPropertyOptional({
    description: 'Regular lesson rate',
    example: '25.00',
  })
  regularLessonRate?: string;

  @ApiPropertyOptional({
    description: 'Recent student reviews',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        rating: { type: 'number' },
        comment: { type: 'string' },
        studentName: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  recentReviews?: any[];

  @ApiPropertyOptional({
    description: 'Total number of reviews',
    example: 45,
  })
  totalReviews?: number;
}

export class TeacherAvailabilityVm {
  @ApiProperty({
    description: 'Availability ID',
    example: 'cm3avl123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Teacher ID',
    example: 'cm3abc123def456',
  })
  teacherId: string;

  @ApiProperty({
    description: 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
  })
  dayOfWeek: number;

  @ApiProperty({
    description: 'Start time in HH:mm format',
    example: '09:00',
  })
  startTime: string;

  @ApiProperty({
    description: 'End time in HH:mm format',
    example: '17:00',
  })
  endTime: string;

  @ApiProperty({
    description: 'Whether this availability is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:00:00Z',
  })
  createdAt: Date;
}

export class TeacherSearchResultVm {
  @ApiProperty({
    description: 'List of teachers',
    type: [TeacherVm],
  })
  teachers: TeacherVm[];

  @ApiProperty({
    description: 'Total count of teachers matching criteria',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;
}

export class CourseVm {
  @ApiProperty({
    description: 'Course ID',
    example: 'cm3course123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Teacher ID',
    example: 'cm3abc123def456',
  })
  teacherId: string;

  @ApiProperty({
    description: 'Course name',
    example: 'Business English Fundamentals',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Course description',
    example: 'Learn essential business English skills for professional communication',
  })
  description?: string;

  @ApiProperty({
    description: 'Duration of each lesson in minutes',
    example: 60,
  })
  duration: number;

  @ApiProperty({
    description: 'Total number of lessons in the course',
    example: 10,
  })
  totalLessons: number;

  @ApiProperty({
    description: 'Course price',
    example: '299.99',
  })
  price: string;

  @ApiProperty({
    description: 'Required English level',
    enum: EnglishLevel,
    example: EnglishLevel.INTERMEDIATE,
  })
  level: EnglishLevel;

  @ApiProperty({
    description: 'Whether the course is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-20T15:30:00Z',
  })
  updatedAt: Date;
}

export class TeacherVerificationDocumentVm {
  @ApiProperty({
    description: 'Document ID',
    example: 'cm3doc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Document type',
    enum: DocumentType,
    example: DocumentType.TEACHING_CERTIFICATE,
  })
  type: DocumentType;

  @ApiProperty({
    description: 'Document title',
    example: 'TESOL Certificate',
  })
  title: string;

  @ApiProperty({
    description: 'Document URL',
    example: 'https://storage.example.com/documents/tesol-cert.pdf',
  })
  documentUrl: string;

  @ApiPropertyOptional({
    description: 'Document description',
    example: 'TESOL certificate obtained from Cambridge University',
  })
  description?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:00:00Z',
  })
  createdAt: Date;
}

export class TeacherVerificationVm {
  @ApiProperty({
    description: 'Verification ID',
    example: 'cm3ver123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Teacher ID',
    example: 'cm3abc123def456',
  })
  teacherId: string;

  @ApiProperty({
    description: 'Verification documents',
    type: [TeacherVerificationDocumentVm],
  })
  documents: TeacherVerificationDocumentVm[];

  @ApiPropertyOptional({
    description: 'Additional notes from teacher',
    example: 'I have 5 years of experience teaching English to non-native speakers.',
  })
  additionalNotes?: string;

  @ApiPropertyOptional({
    description: 'LinkedIn profile URL',
    example: 'https://linkedin.com/in/teacher-profile',
  })
  linkedinUrl?: string;

  @ApiPropertyOptional({
    description: 'Portfolio website URL',
    example: 'https://myteachingportfolio.com',
  })
  portfolioUrl?: string;

  @ApiPropertyOptional({
    description: 'Admin review notes',
    example: 'Documents verified successfully. Profile approved.',
  })
  reviewNotes?: string;

  @ApiProperty({
    description: 'Submission timestamp',
    example: '2024-01-15T10:00:00Z',
  })
  submittedAt: Date;

  @ApiPropertyOptional({
    description: 'Review timestamp',
    example: '2024-01-16T14:30:00Z',
  })
  reviewedAt?: Date;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-20T15:30:00Z',
  })
  updatedAt: Date;
}

export class ProfileSetupStatusVm {
  @ApiProperty({
    description: 'Whether profile setup is completed',
    example: true,
  })
  profileCompleted: boolean;

  @ApiProperty({
    description: 'Whether verification documents have been submitted',
    example: false,
  })
  verificationSubmitted: boolean;

  @ApiProperty({
    description: 'Whether availability and rates have been setup',
    example: false,
  })
  availabilitySetup: boolean;

  @ApiProperty({
    description: 'Whether teacher profile is live and accepting bookings',
    example: false,
  })
  isLive: boolean;

  @ApiProperty({
    description: 'Teacher status',
    enum: TeacherStatus,
    example: TeacherStatus.PENDING,
  })
  status: TeacherStatus;

  @ApiProperty({
    description: 'Next steps for the teacher',
    example: ['Complete profile setup', 'Submit verification documents'],
    type: [String],
  })
  nextSteps: string[];

  @ApiProperty({
    description: 'Overall completion percentage',
    example: 75,
  })
  completionPercentage: number;
}

export class TeacherRateVm {
  @ApiProperty({
    description: 'Rate ID',
    example: 'cm3rate123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Teacher ID',
    example: 'cm3teacher123',
  })
  teacherId: string;

  @ApiProperty({
    description: 'Rate type',
    enum: RateType,
    example: RateType.TRIAL_LESSON,
  })
  type: RateType;

  @ApiProperty({
    description: 'Rate per hour in USD',
    example: '15.00',
  })
  rate: string;

  @ApiPropertyOptional({
    description: 'Duration in minutes',
    example: 60,
  })
  duration?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of students (for group lessons)',
    example: 4,
  })
  maxStudents?: number;

  @ApiProperty({
    description: 'Whether this rate is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-20T15:30:00Z',
  })
  updatedAt: Date;
}

export class EnhancedTeacherAvailabilityVm extends TeacherAvailabilityVm {
  @ApiProperty({
    description: 'Type of availability',
    enum: AvailabilityType,
    example: AvailabilityType.REGULAR,
  })
  type: AvailabilityType;
}

export class AvailabilityAndRatesVm {
  @ApiProperty({
    description: 'Teacher availability schedule',
    type: [EnhancedTeacherAvailabilityVm],
  })
  availabilities: EnhancedTeacherAvailabilityVm[];

  @ApiProperty({
    description: 'Teacher rates for different lesson types',
    type: [TeacherRateVm],
  })
  rates: TeacherRateVm[];

  @ApiPropertyOptional({
    description: 'Minimum hours advance notice for bookings',
    example: 24,
  })
  advanceNoticeHours?: number;

  @ApiPropertyOptional({
    description: 'Maximum hours in advance bookings can be made',
    example: 720,
  })
  maxAdvanceBookingHours?: number;

  @ApiProperty({
    description: 'Whether teacher allows instant booking',
    example: false,
  })
  allowInstantBooking: boolean;

  @ApiPropertyOptional({
    description: 'Instructions for students when booking',
    example: 'Please prepare any specific topics you want to focus on.',
  })
  bookingInstructions?: string;
}

export class TeacherOnboardingStatusVm {
  @ApiProperty({
    description: 'Current onboarding step',
    example: 'AVAILABILITY_SETUP',
  })
  currentStep: string;

  @ApiProperty({
    description: 'Profile setup completion',
    example: true,
  })
  profileCompleted: boolean;

  @ApiProperty({
    description: 'Verification submission status',
    example: true,
  })
  verificationSubmitted: boolean;

  @ApiProperty({
    description: 'Verification approval status',
    example: true,
  })
  verificationApproved: boolean;

  @ApiProperty({
    description: 'Availability and rates setup status',
    example: false,
  })
  availabilitySetup: boolean;

  @ApiProperty({
    description: 'Profile live status',
    example: false,
  })
  isLive: boolean;

  @ApiProperty({
    description: 'Overall completion percentage',
    example: 80,
  })
  completionPercentage: number;

  @ApiProperty({
    description: 'Next steps to complete onboarding',
    type: [String],
    example: ['Set up availability schedule', 'Go live to receive bookings'],
  })
  nextSteps: string[];

  @ApiProperty({
    description: 'Whether teacher can go live',
    example: false,
  })
  canGoLive: boolean;
}
