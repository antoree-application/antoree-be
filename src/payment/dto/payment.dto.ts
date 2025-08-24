import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsPositive,
  Min,
  Max,
  IsUUID,
  IsArray,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum LessonPackageType {
  TRIAL = 'TRIAL',
  PACKAGE_5 = 'PACKAGE_5',
  PACKAGE_10 = 'PACKAGE_10',
  PACKAGE_20 = 'PACKAGE_20',
  CUSTOM = 'CUSTOM',
}

export class CoursePaymentDto {
  @ApiProperty({
    description: 'Course ID to purchase',
    example: 'cm3course123def456',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  courseId: string;

  @ApiProperty({
    description: 'Course name',
    example: 'Business English Mastery',
  })
  @IsNotEmpty()
  @IsString()
  courseName: string;

  @ApiProperty({
    description: 'Total number of lessons in course',
    example: 20,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  totalLessons: number;

  @ApiProperty({
    description: 'Duration per lesson in minutes',
    example: 60,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  durationPerLesson: number;

  @ApiProperty({
    description: 'Course price in VND',
    example: 8000000,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  totalPrice: number;

  @ApiPropertyOptional({
    description: 'Preferred start date for the course',
    example: '2024-03-01T09:00:00Z',
  })
  @IsOptional()
  @IsString()
  preferredStartDate?: string;

  @ApiPropertyOptional({
    description: 'Scheduled lesson times for the course',
    type: [String],
    example: ['2024-03-01T09:00:00Z', '2024-03-08T09:00:00Z'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scheduledLessons?: string[];

  @ApiPropertyOptional({
    description: 'Special requests or learning objectives',
    example: 'Focus on presentation skills and business vocabulary',
  })
  @IsOptional()
  @IsString()
  specialRequests?: string;
}

export class LessonPackageDto {
  @ApiProperty({
    description: 'Type of lesson package',
    enum: LessonPackageType,
    example: LessonPackageType.PACKAGE_10,
  })
  @IsNotEmpty()
  @IsEnum(LessonPackageType)
  type: LessonPackageType;

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

  @ApiProperty({
    description: 'Price per lesson in VND',
    example: 500000,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  pricePerLesson: number;

  @ApiProperty({
    description: 'Total package price in VND',
    example: 5000000,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  totalPrice: number;

  @ApiPropertyOptional({
    description: 'Discount percentage for the package',
    example: 10,
    minimum: 0,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(50)
  discountPercentage?: number;

  @ApiPropertyOptional({
    description: 'Package description',
    example: '10 lessons package with 10% discount',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Teacher ID',
    example: 'cm3teacher123def456',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  teacherId: string;

  @ApiPropertyOptional({
    description: 'Lesson package details (for lesson package purchase)',
    type: LessonPackageDto,
  })
  @ValidateIf(o => !o.coursePurchase)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LessonPackageDto)
  lessonPackage?: LessonPackageDto;

  @ApiPropertyOptional({
    description: 'Course purchase details (for course purchase)',
    type: CoursePaymentDto,
  })
  @ValidateIf(o => !o.lessonPackage)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CoursePaymentDto)
  coursePurchase?: CoursePaymentDto;

  @ApiPropertyOptional({
    description: 'Scheduled lesson times for the package',
    type: [String],
    example: ['2024-02-15T10:00:00Z', '2024-02-17T10:00:00Z'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scheduledLessons?: string[];

  @ApiPropertyOptional({
    description: 'Additional notes for the payment',
    example: 'Payment for 10-lesson package',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Coupon code for discount',
    example: 'WELCOME10',
  })
  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class VnpayPaymentDto {
  @ApiProperty({
    description: 'Payment amount in VND',
    example: 5000000,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Payment description',
    example: 'Payment for 10-lesson package with Teacher John',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Order ID',
    example: 'ORDER_20240215_001',
  })
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @ApiPropertyOptional({
    description: 'Return URL after payment',
    example: 'https://antoree.com/payment/success',
  })
  @IsOptional()
  @IsString()
  returnUrl?: string;

  @ApiPropertyOptional({
    description: 'Bank code for VNPAY',
    example: 'NCB',
  })
  @IsOptional()
  @IsString()
  bankCode?: string;
}

export class ProcessPaymentDto {
  @ApiProperty({
    description: 'Payment ID to process',
    example: 'cm3payment123def456',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  paymentId: string;

  @ApiProperty({
    description: 'Payment method',
    example: 'VNPAY',
  })
  @IsNotEmpty()
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({
    description: 'Additional payment data',
    example: { bankCode: 'NCB' },
  })
  @IsOptional()
  paymentData?: any;
}

export class PaymentCallbackDto {
  @ApiProperty({
    description: 'Transaction ID from payment gateway',
    example: 'VNP20240215123456789',
  })
  @IsNotEmpty()
  @IsString()
  transactionId: string;

  @ApiProperty({
    description: 'Payment status',
    example: 'SUCCESS',
  })
  @IsNotEmpty()
  @IsString()
  status: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 5000000,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Order ID',
    example: 'ORDER_20240215_001',
  })
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @ApiPropertyOptional({
    description: 'Additional callback data',
  })
  @IsOptional()
  callbackData?: any;
}
