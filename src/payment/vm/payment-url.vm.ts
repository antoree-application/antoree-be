import { ApiProperty } from '@nestjs/swagger';

export class PaymentUrlVm {
  @ApiProperty({
    description: 'Payment URL to redirect user',
    example: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...',
  })
  paymentUrl: string;

  @ApiProperty({
    description: 'Payment ID for tracking',
    example: 'cm3payment123def456',
  })
  paymentId: string;

  @ApiProperty({
    description: 'Order ID for VNPAY',
    example: 'PAY123456_20240301',
  })
  orderId: string;

  @ApiProperty({
    description: 'Payment amount in VND',
    example: 8000000,
  })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'VND',
  })
  currency: string;

  @ApiProperty({
    description: 'Payment description',
    example: 'Course payment: Business English Mastery',
  })
  description: string;

  @ApiProperty({
    description: 'Timestamp when payment URL was created',
    example: '2024-03-01T10:00:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Payment expiration time',
    example: '2024-03-01T10:15:00Z',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Course information',
    type: 'object',
    required: false,
  })
  course?: {
    id: string;
    name: string;
    description: string;
    price: number;
    totalLessons: number;
    teacher: {
      id: string;
      name: string;
      avatar?: string;
    };
  };

  @ApiProperty({
    description: 'Lesson package information',
    type: 'object',
    required: false,
  })
  lessonPackage?: {
    type: string;
    numberOfLessons: number;
    durationPerLesson: number;
    pricePerLesson: number;
    totalPrice: number;
    discountPercentage?: number;
    teacher: {
      id: string;
      name: string;
      avatar?: string;
    };
  };

  @ApiProperty({
    description: 'Student information',
    type: 'object',
    required: false,
  })
  student?: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  };
}

export class PaymentSuccessVm {
  @ApiProperty({
    description: 'Whether the payment was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Payment ID',
    example: 'cm3payment123def456',
  })
  paymentId: string;

  @ApiProperty({
    description: 'Transaction ID from payment gateway',
    example: 'VNP14250618',
  })
  transactionId: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 8000000,
  })
  amount: number;

  @ApiProperty({
    description: 'Payment currency',
    example: 'VND',
  })
  currency: string;

  @ApiProperty({
    description: 'Student information',
    type: 'object',
  })
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    isNewUser: boolean;
    dashboardUrl?: string;
  };

  @ApiProperty({
    description: 'Course information',
    type: 'object',
    required: false,
  })
  course?: {
    id: string;
    name: string;
    description: string;
    teacherId: string;
    teacherName: string;
    courseUrl?: string;
  };

  @ApiProperty({
    description: 'Lesson package information',
    type: 'object',
    required: false,
  })
  lessonPackage?: {
    id: string;
    type: string;
    numberOfLessons: number;
    usedLessons: number;
    remainingLessons: number;
    expiresAt: string;
    teacherId: string;
    teacherName: string;
  };

  @ApiProperty({
    description: 'Next steps for the student',
    type: 'array',
    items: { type: 'string' },
  })
  nextSteps: string[];

  @ApiProperty({
    description: 'Contact information',
    type: 'object',
  })
  contactInfo: {
    supportEmail: string;
    supportPhone: string;
    whatsapp?: string;
  };

  @ApiProperty({
    description: 'Timestamp when payment was completed',
    example: '2024-03-01T10:15:00Z',
  })
  completedAt: string;

  @ApiProperty({
    description: 'Error message if payment failed',
    required: false,
  })
  errorMessage?: string;
}

export class PaymentWebhookVm {
  @ApiProperty({
    description: 'Response code for VNPAY',
    example: '00',
  })
  RspCode: string;

  @ApiProperty({
    description: 'Response message for VNPAY',
    example: 'Confirm Success',
  })
  Message: string;
}

export class PaymentCacheStatsVm {
  @ApiProperty({
    description: 'Number of cached payments',
    example: 15,
  })
  payments: number;

  @ApiProperty({
    description: 'Number of cached courses',
    example: 8,
  })
  courses: number;

  @ApiProperty({
    description: 'Number of cached students',
    example: 12,
  })
  students: number;

  @ApiProperty({
    description: 'Number of cached teachers',
    example: 5,
  })
  teachers: number;

  @ApiProperty({
    description: 'Total cached items',
    example: 40,
  })
  total: number;

  @ApiProperty({
    description: 'Cache hit rate percentage',
    example: 85.5,
  })
  hitRate?: number;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-03-01T10:15:00Z',
  })
  lastUpdated: string;
}
