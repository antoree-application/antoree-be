import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { VnpayService } from './vnpay.service';
import {
  CreatePaymentDto,
  VnpayPaymentDto,
  ProcessPaymentDto,
  PaymentCallbackDto,
  LessonPackageType,
} from './dto';
import {
  PaymentVm,
  VnpayUrlVm,
  PaymentResultVm,
  LessonPackageOptionVm,
  TeacherPackagesVm,
  PaymentHistoryVm,
} from './vm';
import {
  Payment,
  PaymentStatus,
  BookingStatus,
  User,
  Teacher,
  Student,
} from '@prisma/client';

type PaymentWithRelations = Payment & {
  user: User & {
    student?: Student;
  };
};

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vnpayService: VnpayService,
  ) {}

  /**
   * Get available lesson packages for a teacher
   */
  async getTeacherPackages(teacherId: string): Promise<TeacherPackagesVm> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        user: true,
        rates: { where: { isActive: true } },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Get base rate (regular lesson rate)
    const regularRate = teacher.rates.find(r => r.type === 'REGULAR_LESSON');
    const basePrice = regularRate ? Number(regularRate.rate) : Number(teacher.hourlyRate);

    // Define package options
    const packageOptions: LessonPackageOptionVm[] = [
      {
        type: LessonPackageType.PACKAGE_5,
        name: '5 Lessons Package',
        numberOfLessons: 5,
        durationPerLesson: 60,
        regularPricePerLesson: basePrice.toString(),
        packagePricePerLesson: (basePrice * 0.95).toString(), // 5% discount
        totalPrice: (basePrice * 5 * 0.95).toString(),
        savings: (basePrice * 5 * 0.05).toString(),
        discountPercentage: 5,
        description: 'Perfect for getting started with consistent learning',
        benefits: ['5% discount', 'Flexible scheduling', 'Progress tracking'],
        isRecommended: false,
        validityDays: 60,
      },
      {
        type: LessonPackageType.PACKAGE_10,
        name: '10 Lessons Package',
        numberOfLessons: 10,
        durationPerLesson: 60,
        regularPricePerLesson: basePrice.toString(),
        packagePricePerLesson: (basePrice * 0.9).toString(), // 10% discount
        totalPrice: (basePrice * 10 * 0.9).toString(),
        savings: (basePrice * 10 * 0.1).toString(),
        discountPercentage: 10,
        description: 'Most popular choice for steady progress',
        benefits: ['10% discount', 'Priority booking', 'Free materials', 'Progress reports'],
        isRecommended: true,
        validityDays: 90,
      },
      {
        type: LessonPackageType.PACKAGE_20,
        name: '20 Lessons Package',
        numberOfLessons: 20,
        durationPerLesson: 60,
        regularPricePerLesson: basePrice.toString(),
        packagePricePerLesson: (basePrice * 0.85).toString(), // 15% discount
        totalPrice: (basePrice * 20 * 0.85).toString(),
        savings: (basePrice * 20 * 0.15).toString(),
        discountPercentage: 15,
        description: 'Best value for serious learners',
        benefits: ['15% discount', 'Priority booking', 'Free materials', 'Weekly progress reports', 'Bonus resources'],
        isRecommended: false,
        validityDays: 120,
      },
    ];

    return {
      teacher: {
        id: teacher.id,
        firstName: teacher.user.firstName,
        lastName: teacher.user.lastName,
        avatar: teacher.user.avatar,
        hourlyRate: teacher.hourlyRate.toString(),
        averageRating: teacher.averageRating?.toString(),
        totalLessons: teacher.totalLessons,
      },
      packages: packageOptions,
      customPackageOptions: {
        minLessons: 1,
        maxLessons: 50,
        pricePerLesson: basePrice.toString(),
        discountThresholds: [
          { minLessons: 5, discountPercentage: 5 },
          { minLessons: 10, discountPercentage: 10 },
          { minLessons: 20, discountPercentage: 15 },
          { minLessons: 30, discountPercentage: 20 },
        ],
      },
    };
  }

  /**
   * Create a payment for lesson package
   */
  async createPayment(
    createPaymentDto: CreatePaymentDto,
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<PaymentVm> {
    // Validate teacher exists
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: createPaymentDto.teacherId },
      include: { user: true },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { student: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate total price and validate
    const packagePrice = this.calculatePackagePrice(
      createPaymentDto.lessonPackage.numberOfLessons,
      createPaymentDto.lessonPackage.pricePerLesson,
      createPaymentDto.lessonPackage.discountPercentage || 0,
    );

    if (Math.abs(packagePrice - createPaymentDto.lessonPackage.totalPrice) > 1) {
      throw new BadRequestException('Invalid package price calculation');
    }

    // Validate VNPAY amount limits
    if (!this.vnpayService.validateAmount(packagePrice)) {
      throw new BadRequestException('Payment amount is outside VNPAY limits');
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: packagePrice,
        currency: 'VND',
        paymentMethod: 'VNPAY',
        status: PaymentStatus.PENDING,
        description: `Payment for ${createPaymentDto.lessonPackage.numberOfLessons} lessons with ${teacher.user.firstName} ${teacher.user.lastName}`,
        metadata: {
          teacherId: createPaymentDto.teacherId,
          lessonPackage: createPaymentDto.lessonPackage as any,
          scheduledLessons: createPaymentDto.scheduledLessons || [],
          couponCode: createPaymentDto.couponCode,
          userAgent,
          ipAddress,
        } as any,
      },
      include: {
        user: {
          include: { student: true },
        },
      },
    });

    return this.toPaymentVm(payment, createPaymentDto.teacherId);
  }

  /**
   * Create VNPAY payment URL
   */
  async createVnpayPaymentUrl(
    paymentId: string,
    ipAddress: string,
    bankCode?: string,
  ): Promise<VnpayUrlVm> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment is not in pending status');
    }

    // Generate order ID
    const orderId = this.vnpayService.generateOrderId(`PAY${paymentId.slice(-6)}`);

    // Create VNPAY payment request
    const vnpayRequest = {
      amount: Number(payment.amount),
      orderId,
      orderInfo: payment.description || 'Lesson package payment',
      ipAddr: ipAddress,
      bankCode,
    };

    const vnpayResponse = this.vnpayService.createPaymentUrl(vnpayRequest);

    // Update payment with order ID
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        metadata: {
          ...(payment.metadata as any || {}),
          orderId,
        } as any,
      },
    });

    return {
      paymentUrl: vnpayResponse.paymentUrl,
      paymentId,
      orderId,
      amount: Number(payment.amount),
      description: payment.description || 'Lesson package payment',
    };
  }

  /**
   * Handle VNPAY payment callback
   */
  async handleVnpayCallback(callbackData: any): Promise<PaymentResultVm> {
    // Verify callback data
    if (!this.vnpayService.verifyReturnData(callbackData)) {
      throw new BadRequestException('Invalid callback data signature');
    }

    const transactionInfo = this.vnpayService.getTransactionInfo(callbackData);
    
    // Find payment by order ID
    const payment = await this.prisma.payment.findFirst({
      where: {
        metadata: {
          path: ['orderId'],
          equals: transactionInfo.orderId,
        },
      },
      include: {
        user: {
          include: { student: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Update payment status
    const updatedStatus = transactionInfo.isSuccess 
      ? PaymentStatus.COMPLETED 
      : PaymentStatus.FAILED;

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: updatedStatus,
        transactionId: transactionInfo.transactionId,
        metadata: {
          ...(payment.metadata as any || {}),
          vnpayResponse: transactionInfo,
        } as any,
      },
    });

    let bookings: any[] = [];
    let errorMessage: string | undefined;

    if (transactionInfo.isSuccess) {
      // Create lesson package if payment successful
      try {
        const lessonPackage = await this.createLessonPackageFromPayment(payment);
        bookings = await this.createBookingsFromPayment(payment, lessonPackage.id);
      } catch (error) {
        console.error('Error creating lesson package:', error);
        errorMessage = 'Payment successful but failed to create lesson package. Please contact support.';
      }
    } else {
      errorMessage = this.vnpayService.getErrorMessage(transactionInfo.responseCode);
      // For failed payments, redirect back to payment page with error
      await this.handleFailedPayment(payment.id, transactionInfo);
    }

    return {
      paymentId: payment.id,
      status: updatedStatus,
      transactionId: transactionInfo.transactionId,
      amount: payment.amount.toString(),
      success: transactionInfo.isSuccess,
      errorMessage,
      bookings: bookings.map(booking => ({
        id: booking.id,
        scheduledAt: booking.scheduledAt.toISOString(),
        status: booking.status,
      })),
    };
  }

  /**
   * Get payment by ID
   */
  async findOne(id: string, userId?: string): Promise<PaymentVm> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        user: {
          include: { student: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Check authorization
    if (userId && payment.userId !== userId) {
      throw new BadRequestException('You can only access your own payments');
    }

    const teacherId = payment.metadata?.['teacherId'] as string;
    return this.toPaymentVm(payment, teacherId);
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: PaymentStatus,
  ): Promise<PaymentHistoryVm> {
    const where: any = { userId };
    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          user: {
            include: { student: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    // Calculate summary statistics
    const allPayments = await this.prisma.payment.findMany({
      where: { userId, status: PaymentStatus.COMPLETED },
      select: { amount: true, createdAt: true, metadata: true },
    });

    const totalSpent = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalLessons = allPayments.reduce((sum, p) => {
      const lessonPackage = p.metadata?.['lessonPackage'] as any;
      return sum + (lessonPackage?.numberOfLessons || 0);
    }, 0);
    const averagePerLesson = totalLessons > 0 ? totalSpent / totalLessons : 0;
    const lastPaymentDate = allPayments.length > 0 ? allPayments[0].createdAt : undefined;

    return {
      payments: payments.map(payment => {
        const teacherId = payment.metadata?.['teacherId'] as string;
        return this.toPaymentVm(payment, teacherId);
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalSpent: totalSpent.toString(),
        totalLessons,
        averagePerLesson: averagePerLesson.toString(),
        lastPaymentDate: lastPaymentDate?.toISOString(),
      },
    };
  }

  /**
   * Get payment statistics for admin
   */
  async getPaymentStats(): Promise<any> {
    const [
      totalPayments,
      completedPayments,
      failedPayments,
      totalRevenue,
      monthlyStats,
    ] = await Promise.all([
      this.prisma.payment.count(),
      this.prisma.payment.count({ where: { status: PaymentStatus.COMPLETED } }),
      this.prisma.payment.count({ where: { status: PaymentStatus.FAILED } }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
      }),
      this.getMonthlyPaymentStats(),
    ]);

    return {
      totalPayments,
      completedPayments,
      failedPayments,
      pendingPayments: totalPayments - completedPayments - failedPayments,
      totalRevenue: totalRevenue._sum.amount?.toString() || '0',
      successRate: totalPayments > 0 ? (completedPayments / totalPayments * 100).toFixed(2) : '0',
      monthlyStats,
    };
  }

  // Private helper methods

  private calculatePackagePrice(
    numberOfLessons: number,
    pricePerLesson: number,
    discountPercentage: number,
  ): number {
    const subtotal = numberOfLessons * pricePerLesson;
    const discount = subtotal * (discountPercentage / 100);
    return Math.round(subtotal - discount);
  }

  private async createBookingsFromPayment(payment: PaymentWithRelations, lessonPackageId?: string): Promise<any[]> {
    const metadata = payment.metadata as any;
    const lessonPackage = metadata.lessonPackage;
    const teacherId = metadata.teacherId;
    const scheduledLessons = metadata.scheduledLessons || [];

    if (!payment.user.student) {
      throw new BadRequestException('User is not a student');
    }

    const bookings = [];

    // Create bookings for scheduled lessons
    for (const scheduledAt of scheduledLessons) {
      const booking = await this.prisma.booking.create({
        data: {
          studentId: payment.user.student.id,
          teacherId,
          ...(lessonPackageId && { lessonPackageId }),
          scheduledAt: new Date(scheduledAt),
          duration: lessonPackage.durationPerLesson,
          status: BookingStatus.CONFIRMED,
          isTrialLesson: false,
          notes: `Lesson from ${lessonPackage.numberOfLessons}-lesson package (Payment: ${payment.id})`,
        },
      });
      bookings.push(booking);
    }

    return bookings;
  }

  private async createLessonPackageFromPayment(payment: PaymentWithRelations): Promise<any> {
    const metadata = payment.metadata as any;
    const lessonPackage = metadata.lessonPackage;
    const teacherId = metadata.teacherId;

    if (!payment.user.student) {
      throw new BadRequestException('User is not a student');
    }

    // Calculate expiration date based on package type
    const expirationDays = this.getPackageExpirationDays(lessonPackage.numberOfLessons);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    const createdPackage = await this.prisma.lessonPackage.create({
      data: {
        studentId: payment.user.student.id,
        teacherId,
        packageType: lessonPackage.type || 'CUSTOM',
        totalLessons: lessonPackage.numberOfLessons,
        usedLessons: 0,
        remainingLessons: lessonPackage.numberOfLessons,
        durationPerLesson: lessonPackage.durationPerLesson,
        pricePerLesson: lessonPackage.pricePerLesson,
        totalPrice: payment.amount,
        discountPercentage: lessonPackage.discountPercentage || 0,
        paymentId: payment.id,
        expiresAt,
        isActive: true,
      },
    });

    return createdPackage;
  }

  private async handleFailedPayment(paymentId: string, transactionInfo: any): Promise<void> {
    // Log the failed payment for analysis
    console.error('Payment failed:', {
      paymentId,
      responseCode: transactionInfo.responseCode,
      transactionId: transactionInfo.transactionId,
      reason: transactionInfo.isSuccess ? 'Unknown' : 'Payment gateway error',
    });

    // You could implement retry logic here or send notifications
    // For now, we just update the payment record with failure details
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        metadata: {
          ...(await this.prisma.payment.findUnique({ where: { id: paymentId } }))?.metadata as any || {},
          failureReason: transactionInfo.responseCode,
          failureTime: new Date().toISOString(),
        } as any,
      },
    });
  }

  private getPackageExpirationDays(numberOfLessons: number): number {
    // Calculate expiration based on number of lessons
    if (numberOfLessons <= 5) return 60;   // 2 months
    if (numberOfLessons <= 10) return 90;  // 3 months
    if (numberOfLessons <= 20) return 120; // 4 months
    return 180; // 6 months for larger packages
  }

  private toPaymentVm(payment: PaymentWithRelations, teacherId?: string): PaymentVm {
    const metadata = payment.metadata as any;
    const lessonPackage = metadata?.lessonPackage;

    return {
      id: payment.id,
      userId: payment.userId,
      amount: payment.amount.toString(),
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      status: payment.status,
      description: payment.description,
      teacher: teacherId ? {
        id: teacherId,
        firstName: 'Teacher', // Would need to fetch teacher data
        lastName: 'Name',
        avatar: undefined,
      } : undefined,
      lessonPackage: lessonPackage ? {
        type: lessonPackage.type,
        numberOfLessons: lessonPackage.numberOfLessons,
        durationPerLesson: lessonPackage.durationPerLesson,
        pricePerLesson: lessonPackage.pricePerLesson?.toString(),
        totalPrice: lessonPackage.totalPrice?.toString(),
        discountPercentage: lessonPackage.discountPercentage,
        description: lessonPackage.description,
        savings: lessonPackage.savings?.toString(),
      } : undefined,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }

  private async getMonthlyPaymentStats(): Promise<any[]> {
    // Get last 12 months of payment data
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - 12);

    const payments = await this.prisma.payment.findMany({
      where: {
        createdAt: { gte: monthsAgo },
        status: PaymentStatus.COMPLETED,
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    // Group by month
    const monthlyStats: Record<string, { month: string; revenue: number; count: number }> = {};

    payments.forEach(payment => {
      const month = payment.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyStats[month]) {
        monthlyStats[month] = { month, revenue: 0, count: 0 };
      }
      monthlyStats[month].revenue += Number(payment.amount);
      monthlyStats[month].count += 1;
    });

    return Object.values(monthlyStats).sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Calculate custom package price with discounts
   */
  calculateCustomPackagePrice(
    numberOfLessons: number,
    basePrice: number,
  ): { totalPrice: number; discountPercentage: number; savings: number } {
    let discountPercentage = 0;

    if (numberOfLessons >= 30) discountPercentage = 20;
    else if (numberOfLessons >= 20) discountPercentage = 15;
    else if (numberOfLessons >= 10) discountPercentage = 10;
    else if (numberOfLessons >= 5) discountPercentage = 5;

    const subtotal = numberOfLessons * basePrice;
    const savings = subtotal * (discountPercentage / 100);
    const totalPrice = subtotal - savings;

    return {
      totalPrice: Math.round(totalPrice),
      discountPercentage,
      savings: Math.round(savings),
    };
  }

  /**
   * Apply coupon code
   */
  async applyCoupon(
    paymentId: string,
    couponCode: string,
    userId: string,
  ): Promise<{ discount: number; newTotal: number }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.userId !== userId) {
      throw new BadRequestException('You can only apply coupons to your own payments');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Can only apply coupons to pending payments');
    }

    // For now, implement simple coupon logic
    const coupons: Record<string, { discount: number; type: 'percentage' | 'fixed' }> = {
      'WELCOME10': { discount: 10, type: 'percentage' },
      'SAVE50K': { discount: 50000, type: 'fixed' },
      'STUDENT15': { discount: 15, type: 'percentage' },
    };

    const coupon = coupons[couponCode.toUpperCase()];
    if (!coupon) {
      throw new BadRequestException('Invalid coupon code');
    }

    const currentAmount = Number(payment.amount);
    let discountAmount = 0;

    if (coupon.type === 'percentage') {
      discountAmount = Math.round(currentAmount * (coupon.discount / 100));
    } else {
      discountAmount = coupon.discount;
    }

    const newTotal = Math.max(currentAmount - discountAmount, 10000); // Minimum 10,000 VND

    // Update payment with coupon
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        amount: newTotal,
        metadata: {
          ...(payment.metadata as any || {}),
          couponCode,
          originalAmount: currentAmount,
          discountAmount,
        } as any,
      },
    });

    return {
      discount: discountAmount,
      newTotal,
    };
  }
}
