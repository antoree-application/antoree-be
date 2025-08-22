import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LessonPackageVm {
  @ApiProperty({
    description: 'Lesson package ID',
    example: 'cm3package123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Student ID',
    example: 'cm3student123def456',
  })
  studentId: string;

  @ApiProperty({
    description: 'Teacher ID',
    example: 'cm3teacher123def456',
  })
  teacherId: string;

  @ApiProperty({
    description: 'Package type',
    example: 'PACKAGE_10',
  })
  packageType: string;

  @ApiProperty({
    description: 'Total number of lessons in package',
    example: 10,
  })
  totalLessons: number;

  @ApiProperty({
    description: 'Number of lessons used',
    example: 3,
  })
  usedLessons: number;

  @ApiProperty({
    description: 'Number of lessons remaining',
    example: 7,
  })
  remainingLessons: number;

  @ApiProperty({
    description: 'Duration per lesson in minutes',
    example: 60,
  })
  durationPerLesson: number;

  @ApiProperty({
    description: 'Price per lesson',
    example: '450000',
  })
  pricePerLesson: string;

  @ApiProperty({
    description: 'Total package price',
    example: '4500000',
  })
  totalPrice: string;

  @ApiPropertyOptional({
    description: 'Discount percentage applied',
    example: 10,
  })
  discountPercentage?: number;

  @ApiProperty({
    description: 'Payment ID associated with this package',
    example: 'cm3payment123def456',
  })
  paymentId: string;

  @ApiProperty({
    description: 'Package expiration date',
    example: '2024-05-15T23:59:59Z',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Whether package is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Package creation date',
    example: '2024-02-15T10:00:00Z',
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Student information',
  })
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    englishLevel: string;
  };

  @ApiPropertyOptional({
    description: 'Teacher information',
  })
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };

  @ApiPropertyOptional({
    description: 'Payment information',
  })
  payment?: {
    id: string;
    status: string;
    transactionId?: string;
  };

  @ApiPropertyOptional({
    description: 'Scheduled bookings from this package',
    type: [Object],
  })
  bookings?: Array<{
    id: string;
    scheduledAt: string;
    duration: number;
    status: string;
    isCompleted: boolean;
  }>;
}

export class StudentLessonPackagesVm {
  @ApiProperty({
    description: 'List of student lesson packages',
    type: [LessonPackageVm],
  })
  packages: LessonPackageVm[];

  @ApiProperty({
    description: 'Package summary statistics',
  })
  summary: {
    totalPackages: number;
    activePackages: number;
    totalLessonsRemaining: number;
    totalValueRemaining: string;
    expiringPackages: number; // Packages expiring within 30 days
  };
}

export class LessonPackageBookingVm {
  @ApiProperty({
    description: 'Booking ID',
    example: 'cm3booking123def456',
  })
  bookingId: string;

  @ApiProperty({
    description: 'Lesson package ID',
    example: 'cm3package123def456',
  })
  lessonPackageId: string;

  @ApiProperty({
    description: 'Scheduled date and time',
    example: '2024-02-15T10:00:00Z',
  })
  scheduledAt: string;

  @ApiProperty({
    description: 'Lesson duration in minutes',
    example: 60,
  })
  duration: number;

  @ApiProperty({
    description: 'Booking status',
    example: 'CONFIRMED',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Lesson notes',
    example: 'Focus on pronunciation',
  })
  notes?: string;

  @ApiProperty({
    description: 'Teacher information',
  })
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };

  @ApiProperty({
    description: 'Package information',
  })
  package: {
    id: string;
    packageType: string;
    remainingLessons: number;
    expiresAt: string;
  };

  @ApiProperty({
    description: 'Meeting information (if lesson is confirmed)',
  })
  meeting?: {
    url?: string;
    instructions?: string;
  };
}

export class PackageUsageStatsVm {
  @ApiProperty({
    description: 'Lesson package ID',
    example: 'cm3package123def456',
  })
  packageId: string;

  @ApiProperty({
    description: 'Usage statistics',
  })
  stats: {
    totalLessons: number;
    completedLessons: number;
    scheduledLessons: number;
    cancelledLessons: number;
    usagePercentage: number;
    averageLessonRating?: number;
    daysUntilExpiry: number;
  };

  @ApiProperty({
    description: 'Recent lesson history',
    type: [Object],
  })
  recentLessons: Array<{
    id: string;
    scheduledAt: string;
    status: string;
    rating?: number;
    feedback?: string;
  }>;

  @ApiProperty({
    description: 'Upcoming scheduled lessons',
    type: [Object],
  })
  upcomingLessons: Array<{
    id: string;
    scheduledAt: string;
    status: string;
    notes?: string;
  }>;
}
