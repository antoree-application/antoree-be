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
  IsEnum,
} from 'class-validator';

export enum MomoPaymentMethod {
  WALLET = 'captureWallet',
  ATM = 'payWithATM',
  QR = 'payWithCC'
}

export class SimpleCoursePaymentDto {
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
    description: 'MoMo payment method',
    enum: MomoPaymentMethod,
    example: MomoPaymentMethod.WALLET,
    default: MomoPaymentMethod.WALLET,
  })
  @IsOptional()
  @IsEnum(MomoPaymentMethod)
  paymentMethod?: MomoPaymentMethod;
}

export class SimplePaymentUrlResponseDto {
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
    description: 'Course information',
    type: 'object',
  })
  course: {
    id: string;
    name: string;
    description: string;
    price: string;
    totalLessons: number;
    teacher: {
      id: string;
      name: string;
      avatar?: string;
    };
  };

  @ApiProperty({
    description: 'Student information',
    type: 'object',
  })
  student: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
}
