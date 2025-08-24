import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, LessonStatus } from '@prisma/client';

export class CoursePaymentVm {
  @ApiProperty({
    description: 'Course ID',
    example: 'cm3course123def456',
  })
  courseId: string;

  @ApiProperty({
    description: 'Course name',
    example: 'Business English Mastery',
  })
  courseName: string;

  @ApiProperty({
    description: 'Total number of lessons in course',
    example: 20,
  })
  totalLessons: number;

  @ApiProperty({
    description: 'Duration per lesson in minutes',
    example: 60,
  })
  durationPerLesson: number;

  @ApiProperty({
    description: 'Course price',
    example: '8000000',
  })
  totalPrice: string;

  @ApiPropertyOptional({
    description: 'Preferred start date',
    example: '2024-03-01T09:00:00Z',
  })
  preferredStartDate?: string;

  @ApiPropertyOptional({
    description: 'Special requests',
    example: 'Focus on presentation skills',
  })
  specialRequests?: string;
}

export class LessonPackageVm {
  @ApiProperty({
    description: 'Package type',
    example: 'PACKAGE_10',
  })
  type: string;

  @ApiProperty({
    description: 'Number of lessons',
    example: 10,
  })
  numberOfLessons: number;

  @ApiProperty({
    description: 'Duration per lesson in minutes',
    example: 60,
  })
  durationPerLesson: number;

  @ApiProperty({
    description: 'Price per lesson',
    example: '500000',
  })
  pricePerLesson: string;

  @ApiProperty({
    description: 'Total package price',
    example: '5000000',
  })
  totalPrice: string;

  @ApiPropertyOptional({
    description: 'Discount percentage',
    example: 10,
  })
  discountPercentage?: number;

  @ApiPropertyOptional({
    description: 'Package description',
    example: '10 lessons package with 10% discount',
  })
  description?: string;

  @ApiProperty({
    description: 'Savings amount compared to individual lessons',
    example: '500000',
  })
  savings: string;
}

export class PaymentVm {
  @ApiProperty({
    description: 'Payment ID',
    example: 'cm3payment123def456',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: 'cm3user123def456',
  })
  userId: string;

  @ApiProperty({
    description: 'Payment amount',
    example: '5000000',
  })
  amount: string;

  @ApiProperty({
    description: 'Currency',
    example: 'VND',
  })
  currency: string;

  @ApiProperty({
    description: 'Payment method',
    example: 'VNPAY',
  })
  paymentMethod: string;

  @ApiPropertyOptional({
    description: 'Transaction ID from payment gateway',
    example: 'VNP20240215123456789',
  })
  transactionId?: string;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED,
  })
  status: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Payment description',
    example: 'Payment for 10-lesson package',
  })
  description?: string;

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
    description: 'Lesson package details',
    type: LessonPackageVm,
  })
  lessonPackage?: LessonPackageVm;

  @ApiPropertyOptional({
    description: 'Course purchase details',
    type: CoursePaymentVm,
  })
  coursePurchase?: CoursePaymentVm;

  @ApiProperty({
    description: 'Payment creation date',
    example: '2024-02-15T10:00:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Payment update date',
    example: '2024-02-15T10:05:00Z',
  })
  updatedAt: string;
}

export class VnpayUrlVm {
  @ApiProperty({
    description: 'VNPAY payment URL',
    example: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...',
  })
  paymentUrl: string;

  @ApiProperty({
    description: 'Payment ID',
    example: 'cm3payment123def456',
  })
  paymentId: string;

  @ApiProperty({
    description: 'Order ID',
    example: 'ORDER_20240215_001',
  })
  orderId: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 5000000,
  })
  amount: number;

  @ApiProperty({
    description: 'Payment description',
    example: 'Payment for 10-lesson package',
  })
  description: string;
}

export class PaymentResultVm {
  @ApiProperty({
    description: 'Payment ID',
    example: 'cm3payment123def456',
  })
  paymentId: string;

  @ApiProperty({
    description: 'Order ID',
    example: 'ORDER_1708012345_123',
  })
  orderId: string;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED,
  })
  status: PaymentStatus;

  @ApiProperty({
    description: 'Transaction ID',
    example: 'VNP20240215123456789',
  })
  transactionId: string;

  @ApiProperty({
    description: 'Payment amount',
    example: '5000000',
  })
  amount: string;

  @ApiProperty({
    description: 'Payment success',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Result message',
    example: 'Payment completed successfully',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Error message if payment failed',
    example: 'Insufficient funds',
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Created bookings from this payment',
  })
  bookings?: Array<{
    id: string;
    scheduledAt: string;
    status: string;
  }>;
}

export class LessonPackageOptionVm {
  @ApiProperty({
    description: 'Package type',
    example: 'PACKAGE_10',
  })
  type: string;

  @ApiProperty({
    description: 'Package name',
    example: '10 Lessons Package',
  })
  name: string;

  @ApiProperty({
    description: 'Number of lessons',
    example: 10,
  })
  numberOfLessons: number;

  @ApiProperty({
    description: 'Duration per lesson in minutes',
    example: 60,
  })
  durationPerLesson: number;

  @ApiProperty({
    description: 'Regular price per lesson',
    example: '500000',
  })
  regularPricePerLesson: string;

  @ApiProperty({
    description: 'Package price per lesson',
    example: '450000',
  })
  packagePricePerLesson: string;

  @ApiProperty({
    description: 'Total package price',
    example: '4500000',
  })
  totalPrice: string;

  @ApiProperty({
    description: 'Total savings',
    example: '500000',
  })
  savings: string;

  @ApiProperty({
    description: 'Discount percentage',
    example: 10,
  })
  discountPercentage: number;

  @ApiProperty({
    description: 'Package description',
    example: 'Perfect for consistent learning with 10% discount',
  })
  description: string;

  @ApiProperty({
    description: 'Package benefits',
    type: [String],
    example: ['10% discount', 'Priority booking', 'Free materials'],
  })
  benefits: string[];

  @ApiProperty({
    description: 'Is this package recommended',
    example: true,
  })
  isRecommended: boolean;

  @ApiProperty({
    description: 'Package validity in days',
    example: 90,
  })
  validityDays: number;
}

export class TeacherPackagesVm {
  @ApiProperty({
    description: 'Teacher information',
  })
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    hourlyRate: string;
    averageRating?: string;
    totalLessons: number;
  };

  @ApiProperty({
    description: 'Available lesson packages',
    type: [LessonPackageOptionVm],
  })
  packages: LessonPackageOptionVm[];

  @ApiProperty({
    description: 'Custom package options',
  })
  customPackageOptions: {
    minLessons: number;
    maxLessons: number;
    pricePerLesson: string;
    discountThresholds: Array<{
      minLessons: number;
      discountPercentage: number;
    }>;
  };
}

export class PaymentHistoryVm {
  @ApiProperty({
    description: 'List of payments',
    type: [PaymentVm],
  })
  payments: PaymentVm[];

  @ApiProperty({
    description: 'Total number of payments',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Current page',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total pages',
    example: 3,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Summary statistics',
  })
  summary: {
    totalSpent: string;
    totalLessons: number;
    averagePerLesson: string;
    lastPaymentDate?: string;
  };
}
