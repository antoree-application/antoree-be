import { ApiProperty } from '@nestjs/swagger';

export class SimpleCoursePaymentVm {
  @ApiProperty({
    description: 'Main payment URL for web browsers',
  })
  paymentUrl: string;

  @ApiProperty({
    description: 'QR code URL for scanning (when using QR payment method)',
    required: false,
  })
  qrCodeUrl?: string;

  @ApiProperty({
    description: 'Deep link for MoMo app (when using wallet payment method)',
    required: false,
  })
  deeplink?: string;

  @ApiProperty()
  paymentId: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty({
    description: 'Payment method used',
    enum: ['captureWallet', 'payWithATM', 'payWithCC'],
  })
  paymentMethod: string;

  @ApiProperty()
  course: {
    id: string;
    name: string;
    description: string;
    price: string;
    totalLessons: number;
    duration: number;
    teacher: {
      id: string;
      name: string;
      avatar?: string;
    };
  };

  @ApiProperty()
  student: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    isNewUser: boolean;
  };
}

export class PaymentNotificationVm {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  paymentId: string;

  @ApiProperty()
  courseId: string;

  @ApiProperty()
  studentEmail: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  redirectUrl?: string;
}
