import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsEmail,
  IsPhoneNumber,
  MinLength,
  MaxLength,
  IsNumber,
  IsPositive,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentUrlDto {
  @ApiProperty({
    description: 'Course ID to purchase',
    example: 'cm3course123def456',
  })
  @IsNotEmpty()
  @IsString()
  
  courseId: string;

  @ApiProperty({
    description: 'Student first name',
    example: 'John',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({
    description: 'Student last name',
    example: 'Doe',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    description: 'Student email address',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Student phone number',
    example: '+84901234567',
  })
  @IsNotEmpty()
  @IsPhoneNumber('VN')
  phoneNumber: string;

  @ApiPropertyOptional({
    description: 'Preferred start date for the course',
    example: '2024-03-01',
  })
  @IsOptional()
  @IsString()
  preferredStartDate?: string;

  @ApiPropertyOptional({
    description: 'Special requests or learning objectives',
    example: 'Focus on business English and presentation skills',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialRequests?: string;

  @ApiPropertyOptional({
    description: 'Coupon code for discount',
    example: 'WELCOME10',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  couponCode?: string;

  @ApiPropertyOptional({
    description: 'Bank code for VNPAY payment',
    example: 'NCB',
  })
  @IsOptional()
  @IsString()
  bankCode?: string;
}

export class CreateLessonPackagePaymentUrlDto {
  @ApiProperty({
    description: 'Teacher ID',
    example: 'cm3teacher123def456',
  })
  @IsNotEmpty()
  @IsString()
  
  teacherId: string;

  @ApiProperty({
    description: 'Number of lessons in the package',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(50)
  numberOfLessons: number;

  @ApiProperty({
    description: 'Duration per lesson in minutes',
    example: 60,
    minimum: 30,
    maximum: 120,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Min(30)
  @Max(120)
  durationPerLesson: number;

  @ApiPropertyOptional({
    description: 'Package type',
    example: 'PACKAGE_10',
  })
  @IsOptional()
  @IsString()
  packageType?: string;

  @ApiPropertyOptional({
    description: 'Coupon code for discount',
    example: 'WELCOME10',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  couponCode?: string;

  @ApiPropertyOptional({
    description: 'Bank code for VNPAY payment',
    example: 'NCB',
  })
  @IsOptional()
  @IsString()
  bankCode?: string;

  @ApiPropertyOptional({
    description: 'Special notes for the package',
    example: 'Focus on business communication skills',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class PaymentWebhookDto {
  @ApiProperty({
    description: 'VNPAY response code',
    example: '00',
  })
  @IsNotEmpty()
  @IsString()
  vnp_ResponseCode: string;

  @ApiProperty({
    description: 'VNPAY transaction number',
    example: '13795031',
  })
  @IsNotEmpty()
  @IsString()
  vnp_TxnRef: string;

  @ApiProperty({
    description: 'VNPAY amount (in VND * 100)',
    example: '1000000',
  })
  @IsNotEmpty()
  @IsString()
  vnp_Amount: string;

  @ApiProperty({
    description: 'VNPAY order info',
    example: 'Course payment for Business English',
  })
  @IsNotEmpty()
  @IsString()
  vnp_OrderInfo: string;

  @ApiProperty({
    description: 'VNPAY bank transaction number',
    example: 'VNP14250618',
  })
  @IsOptional()
  @IsString()
  vnp_BankTranNo?: string;

  @ApiProperty({
    description: 'VNPAY card type',
    example: 'ATM',
  })
  @IsOptional()
  @IsString()
  vnp_CardType?: string;

  @ApiProperty({
    description: 'VNPAY payment date',
    example: '20240301140030',
  })
  @IsNotEmpty()
  @IsString()
  vnp_PayDate: string;

  @ApiProperty({
    description: 'VNPAY transaction status',
    example: '00',
  })
  @IsNotEmpty()
  @IsString()
  vnp_TransactionStatus: string;

  @ApiProperty({
    description: 'VNPAY terminal code',
    example: 'LYZH6DX6',
  })
  @IsNotEmpty()
  @IsString()
  vnp_TmnCode: string;

  @ApiProperty({
    description: 'VNPAY secure hash',
    example: 'df123456789abcdef...',
  })
  @IsNotEmpty()
  @IsString()
  vnp_SecureHash: string;

  @ApiPropertyOptional({
    description: 'VNPAY bank code',
    example: 'NCB',
  })
  @IsOptional()
  @IsString()
  vnp_BankCode?: string;

  // Allow additional dynamic properties for VNPAY
  [key: string]: any;
}

export class PaymentUrlResponseDto {
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
}

export class PaymentWebhookResponseDto {
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

export class PaymentSuccessResultDto {
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
  };

  @ApiProperty({
    description: 'Course information',
    type: 'object',
  })
  course: {
    id: string;
    name: string;
    description: string;
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
    description: 'Timestamp when payment was completed',
    example: '2024-03-01T10:15:00Z',
  })
  completedAt: string;
}
