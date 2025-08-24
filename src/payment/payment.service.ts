import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../common/prisma/prisma.service';
import { MomoService } from './momo.service';
import { PaymentCacheService } from './cache.service';
import { EnrollmentService } from '../enrollment/enrollment.service';
import {
  SimpleCoursePaymentDto,
} from './dto';
import { MomoPaymentMethod } from './dto/simple-course-payment.dto';
import {
  SimpleCoursePaymentVm,
  PaymentResultVm,
} from './vm';
import {
  Payment,
  PaymentStatus,
  UserRole,
} from '@prisma/client';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly momoService: MomoService,
    private readonly cacheService: PaymentCacheService,
    private readonly enrollmentService: EnrollmentService,
    @InjectQueue('payment-processing') private paymentQueue: Queue,
  ) {}

  /**
   * Simple course payment flow - student provides courseId and their info, gets payment URL
   */
  async createSimpleCoursePayment(
    simpleCoursePaymentDto: SimpleCoursePaymentDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<SimpleCoursePaymentVm> {
    // Try to get course from cache first
    let course = await this.cacheService.getCachedCourseInfo(simpleCoursePaymentDto.courseId);
    
    if (!course) {
      // Validate course exists and is active
      course = await this.prisma.course.findUnique({
        where: { id: simpleCoursePaymentDto.courseId },
        include: { 
          teacher: { 
            include: { user: true }
          } 
        },
      });

      if (!course) {
        throw new NotFoundException(`Course with ID ${simpleCoursePaymentDto.courseId} not found`);
      }

      // Cache course info for future requests
      await this.cacheService.cacheCourseInfo(course.id, course);
    }

    if (!course.isActive) {
      throw new BadRequestException('Course is not active');
    }

    // Check if user already exists, if not create a temporary user record
    let user = await this.prisma.user.findUnique({
      where: { email: simpleCoursePaymentDto.email },
      include: { student: true },
    });

    const isNewUser = !user;

    if (!user) {
      // Create temporary user for guest payment
      user = await this.prisma.user.create({
        data: {
          email: simpleCoursePaymentDto.email,
          firstName: simpleCoursePaymentDto.firstName,
          lastName: simpleCoursePaymentDto.lastName,
          phone: simpleCoursePaymentDto.phoneNumber,
          role: UserRole.STUDENT,
          isActive: true,
          password: '', // Will be set after payment success
        },
        include: { student: true },
      });

      // Create student profile
      await this.prisma.student.create({
        data: {
          id: user.id, // Use same ID as user
          englishLevel: 'BEGINNER', // Default level
        },
      });

      // Cache new user info
      await this.cacheService.cacheStudentInfo(user.id, {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phone || '',
        englishLevel: 'BEGINNER',
        isNewUser: true,
      });
    }

    let totalPrice = Number(course.price);
    const originalAmount = totalPrice;

    // Apply coupon if provided
    let discountAmount = 0;
    if (simpleCoursePaymentDto.couponCode) {
      discountAmount = this.calculateSimpleCouponDiscount(
        simpleCoursePaymentDto.couponCode,
        totalPrice,
      );
      totalPrice = Math.max(totalPrice - discountAmount, 1000); // Minimum 1,000 VND for MoMo
    }

    // Validate MoMo amount limits
    if (!this.momoService.validateAmount(totalPrice)) {
      throw new BadRequestException(`Payment amount ${totalPrice} VND is outside MoMo limits (1,000 - 20,000,000 VND)`);
    }

    const description = `Course payment: ${course.name} by ${simpleCoursePaymentDto.firstName} ${simpleCoursePaymentDto.lastName}`;

    // Determine payment method
    const paymentMethod = simpleCoursePaymentDto.paymentMethod || MomoPaymentMethod.WALLET;

    // Validate payment method
    if (!this.momoService.isValidPaymentMethod(paymentMethod)) {
      throw new BadRequestException(`Invalid payment method: ${paymentMethod}`);
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        userId: user.id,
        amount: totalPrice,
        currency: 'VND',
        paymentMethod: 'MOMO',
        status: PaymentStatus.PENDING,
        description,
        metadata: {
          courseId: course.id,
          courseName: course.name,
          teacherId: course.teacherId,
          paymentType: 'simple_course_payment',
          studentInfo: {
            firstName: simpleCoursePaymentDto.firstName,
            lastName: simpleCoursePaymentDto.lastName,
            email: simpleCoursePaymentDto.email,
            phoneNumber: simpleCoursePaymentDto.phoneNumber,
          },
          preferredStartDate: simpleCoursePaymentDto.preferredStartDate,
          specialRequests: simpleCoursePaymentDto.specialRequests,
          couponCode: simpleCoursePaymentDto.couponCode,
          originalAmount: originalAmount,
          discountAmount: discountAmount,
          userAgent,
          ipAddress,
          paymentMethod: paymentMethod,
        } as any,
      },
    });

    // Generate order ID using MoMo pattern and create MoMo payment URL
    const orderId = this.momoService.generateOrderId(`PAY${payment.id.slice(-6)}`);

    const momoRequest = {
      amount: totalPrice,
      orderId,
      orderInfo: description,
    };

    try {
      const momoResponse = await this.momoService.createPaymentUrl(momoRequest, paymentMethod);

      // Update payment with order ID
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          metadata: {
            ...((payment.metadata as any) || {}),
            orderId,
          } as any,
        },
      });

      // Cache payment data for quick access when callback arrives
      await this.cacheService.cachePaymentData({
        paymentId: payment.id,
        studentInfo: {
          id: user.id,
          firstName: simpleCoursePaymentDto.firstName,
          lastName: simpleCoursePaymentDto.lastName,
          email: simpleCoursePaymentDto.email,
          phoneNumber: simpleCoursePaymentDto.phoneNumber,
          englishLevel: 'BEGINNER',
          isNewUser: isNewUser,
        },
        courseInfo: {
          id: course.id,
          name: course.name,
          description: course.description || '',
          price: Number(course.price),
          totalLessons: course.totalLessons,
          duration: course.duration,
          level: course.level || 'BEGINNER',
          teacherId: course.teacherId,
          teacherName: `${course.teacher.user.firstName} ${course.teacher.user.lastName}`,
          teacherAvatar: course.teacher.user.avatar || undefined,
        },
        paymentInfo: {
          amount: totalPrice,
          currency: 'VND',
          orderId,
          originalAmount: originalAmount,
          discountAmount: discountAmount,
          couponCode: simpleCoursePaymentDto.couponCode,
        },
        metadata: {
          preferredStartDate: simpleCoursePaymentDto.preferredStartDate,
          specialRequests: simpleCoursePaymentDto.specialRequests,
          ipAddress,
          userAgent,
          createdAt: new Date().toISOString(),
        },
      });

      return {
        paymentUrl: momoResponse.paymentUrl,
        qrCodeUrl: momoResponse.qrCodeUrl,
        deeplink: momoResponse.deeplink,
        paymentId: payment.id,
        orderId,
        amount: totalPrice,
        paymentMethod: paymentMethod,
        course: {
          id: course.id,
          name: course.name,
          description: course.description || '',
          price: course.price.toString(),
          totalLessons: course.totalLessons,
          duration: course.duration,
          teacher: {
            id: course.teacher.id,
            name: `${course.teacher.user.firstName} ${course.teacher.user.lastName}`,
            avatar: course.teacher.user.avatar,
          },
        },
        student: {
          firstName: simpleCoursePaymentDto.firstName,
          lastName: simpleCoursePaymentDto.lastName,
          email: simpleCoursePaymentDto.email,
          phoneNumber: simpleCoursePaymentDto.phoneNumber,
          isNewUser: isNewUser,
        },
      };
    } catch (error) {
      // Delete the payment record if MoMo URL creation fails
      await this.prisma.payment.delete({ where: { id: payment.id } });
      throw new BadRequestException(`Failed to create MoMo payment URL: ${error.message}`);
    }
  }

  /**
   * Handle MoMo payment callback
   */
  async handleMomoCallback(callbackData: any): Promise<PaymentResultVm> {
    // Verify callback signature
    if (!this.momoService.verifyCallback(callbackData)) {
      throw new BadRequestException('Invalid MoMo callback signature');
    }

    const transactionInfo = this.momoService.getTransactionInfo(callbackData);

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
          include: {
            student: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment not found for order ID: ${transactionInfo.orderId}`);
    }

    if (transactionInfo.isSuccess) {
      // Get cached payment data before processing
      const cachedData = await this.cacheService.getCachedPaymentData(payment.id);
      
      // Update payment status to completed
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          transactionId: transactionInfo.transactionId,
          metadata: {
            ...((payment.metadata as any) || {}),
            momoTransactionId: transactionInfo.transactionId,
            payType: transactionInfo.payType,
            responseTime: transactionInfo.responseTime,
            completedAt: new Date().toISOString(),
          } as any,
        },
      });

      console.log(`✅ Payment ${payment.id} completed successfully`);

      // Create course enrollment if this is a course payment
      const paymentMetadata = payment.metadata as any;
      if (paymentMetadata?.paymentType === 'simple_course_payment' && paymentMetadata?.courseId) {
        try {
          const enrollment = await this.enrollmentService.createCourseEnrollment(
            payment.id,
            payment.userId,
            paymentMetadata.courseId,
          );
          
          console.log(`✅ Created enrollment ${enrollment.id} for payment ${payment.id}`);
        } catch (error) {
          console.error(`❌ Failed to create enrollment for payment ${payment.id}:`, error);
          // Don't throw error as payment is already completed
        }
      }

      // Delete cached payment data after successful processing
      try {
        await this.cacheService.removeCachedPaymentData(payment.id);
        console.log(`🗑️ Deleted cache for payment ${payment.id}`);
      } catch (error) {
        console.error(`❌ Failed to delete cache for payment ${payment.id}:`, error);
        // Don't throw error as enrollment and payment are already processed
      }

      // Queue notifications if we have cached data
      if (cachedData) {
        try {
          await this.cacheService.queuePaymentNotifications(payment.id, cachedData);
          console.log(`📧 Queued notifications for payment ${payment.id}`);
        } catch (error) {
          console.error(`❌ Failed to queue notifications for payment ${payment.id}:`, error);
        }
      }
    } else {
      // Handle failed payment
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          metadata: {
            ...((payment.metadata as any) || {}),
            failureReason: transactionInfo.message,
            failedAt: new Date().toISOString(),
          } as any,
        },
      });

      // Also clean up cache for failed payments
      try {
        await this.cacheService.removeCachedPaymentData(payment.id);
        console.log(`🗑️ Deleted cache for failed payment ${payment.id}`);
      } catch (error) {
        console.error(`❌ Failed to delete cache for failed payment ${payment.id}:`, error);
      }
    }

    return {
      success: transactionInfo.isSuccess,
      paymentId: payment.id,
      orderId: transactionInfo.orderId,
      status: transactionInfo.isSuccess ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
      transactionId: transactionInfo.transactionId || '',
      amount: transactionInfo.amount.toString(),
      message: transactionInfo.isSuccess 
        ? 'Payment completed successfully' 
        : this.momoService.getErrorMessage(transactionInfo.resultCode),
      errorMessage: transactionInfo.isSuccess ? undefined : this.momoService.getErrorMessage(transactionInfo.resultCode),
    };
  }

  /**
   * Handle MoMo return URL
   */
  async handleMomoReturn(callbackData: any) {
    return this.handleMomoCallback(callbackData);
  }

  /**
   * Handle MoMo webhook for payment processing
   */
  async handleMomoWebhook(callbackData: any) {
    return this.handleMomoCallback(callbackData);
  }

  /**
   * Calculate simple coupon discount for guest payments
   */
  private calculateSimpleCouponDiscount(
    couponCode: string,
    amount: number,
  ): number {
    // Simple coupon logic - in real implementation, check against database
    const coupons: Record<string, number> = {
      'WELCOME10': 0.1, // 10% discount
      'SAVE20': 0.2, // 20% discount
      'STUDENT15': 0.15, // 15% discount
    };

    const discountPercent = coupons[couponCode.toUpperCase()];
    return discountPercent ? Math.floor(amount * discountPercent) : 0;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return this.cacheService.getCacheStats();
  }

  /**
   * Clear cache by type
   */
  async clearCacheByType(type: 'payment' | 'course' | 'student' | 'teacher'): Promise<void> {
    await this.cacheService.clearCacheByType(type);
  }

  /**
   * Send enrollment confirmation notifications
   */
  async sendEnrollmentNotifications(enrollmentId: string): Promise<void> {
    try {
      const enrollment = await this.prisma.courseEnrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          student: {
            include: { user: true },
          },
          course: {
            include: {
              teacher: {
                include: { user: true },
              },
            },
          },
          payment: true,
        },
      });

      if (!enrollment) {
        throw new NotFoundException('Enrollment not found');
      }

      // Log enrollment details (in a real app, you'd send emails here)
      console.log(`📧 Enrollment Confirmation:
        Student: ${enrollment.student.user.firstName} ${enrollment.student.user.lastName}
        Email: ${enrollment.student.user.email}
        Course: ${enrollment.course.name}
        Teacher: ${enrollment.course.teacher.user.firstName} ${enrollment.course.teacher.user.lastName}
        Amount Paid: ${enrollment.payment.amount} ${enrollment.payment.currency}
        Enrollment Date: ${enrollment.enrolledAt}
      `);

      // TODO: Implement actual email/SMS notifications
      // - Send welcome email to student
      // - Send enrollment notification to teacher
      // - Send course access instructions
      
    } catch (error) {
      console.error('Error sending enrollment notifications:', error);
      throw error;
    }
  }

  /**
   * Get enrollment analytics for dashboard
   */
  async getEnrollmentAnalytics(): Promise<{
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    monthlyEnrollments: number;
    revenue: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      monthlyEnrollments,
      revenueResult,
    ] = await Promise.all([
      this.prisma.courseEnrollment.count(),
      this.prisma.courseEnrollment.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.courseEnrollment.count({
        where: { status: 'COMPLETED' },
      }),
      this.prisma.courseEnrollment.count({
        where: {
          enrolledAt: {
            gte: startOfMonth,
          },
        },
      }),
      this.prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: 'COMPLETED',
          courseEnrollment: {
            isNot: null,
          },
        },
      }),
    ]);

    return {
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      monthlyEnrollments,
      revenue: Number(revenueResult._sum.amount) || 0,
    };
  }
}
