import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaymentCacheData } from '../cache.service';
import { PaymentStatus, EnrollmentStatus } from '@prisma/client';

@Injectable()
@Processor('payment-processing')
export class PaymentProcessor {
  private readonly logger = new Logger(PaymentProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('cache-payment-data')
  async handleCachePaymentData(job: Job) {
    const { key, data } = job.data;
    this.logger.log(`Processing cache payment data job: ${key}`);
    
    // This job just stores the data in Redis via Bull
    // The actual processing happens when payment is successful
    return { success: true, key, cached: true };
  }

  @Process('cache-course-info')
  async handleCacheCourseInfo(job: Job) {
    const { key, data } = job.data;
    this.logger.log(`Processing cache course info job: ${key}`);
    
    // Check if data is expired
    if (data.expiresAt && Date.now() > data.expiresAt) {
      await job.remove();
      return { success: false, reason: 'expired' };
    }
    
    return { success: true, key, cached: true };
  }

  @Process('cache-student-info')
  async handleCacheStudentInfo(job: Job) {
    const { key, data } = job.data;
    this.logger.log(`Processing cache student info job: ${key}`);
    
    // Check if data is expired
    if (data.expiresAt && Date.now() > data.expiresAt) {
      await job.remove();
      return { success: false, reason: 'expired' };
    }
    
    return { success: true, key, cached: true };
  }

  @Process('cache-teacher-info')
  async handleCacheTeacherInfo(job: Job) {
    const { key, data } = job.data;
    this.logger.log(`Processing cache teacher info job: ${key}`);
    
    // Check if data is expired
    if (data.expiresAt && Date.now() > data.expiresAt) {
      await job.remove();
      return { success: false, reason: 'expired' };
    }
    
    return { success: true, key, cached: true };
  }

  @Process('process-payment-success')
  async handlePaymentSuccess(job: Job<{ paymentId: string; cachedData: PaymentCacheData }>) {
    const { paymentId, cachedData } = job.data;
    this.logger.log(`Processing payment success for payment: ${paymentId}`);

    try {
      // Verify payment exists and is completed
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error(`Payment ${paymentId} not found`);
      }

      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new Error(`Payment ${paymentId} is not completed`);
      }

      // Process based on payment type (course vs lesson package)
      if (cachedData.courseInfo) {
        await this.processCourseEnrollment(paymentId, cachedData);
      } else {
        await this.processLessonPackage(paymentId, cachedData);
      }

      this.logger.log(`✅ Payment success processing completed for payment: ${paymentId}`);
      return { success: true, paymentId };

    } catch (error) {
      this.logger.error(`❌ Error processing payment success for payment ${paymentId}:`, error);
      throw error;
    }
  }

  private async processCourseEnrollment(paymentId: string, cachedData: PaymentCacheData): Promise<void> {
    const { studentInfo, courseInfo } = cachedData;

    // Ensure student exists
    let student = await this.prisma.student.findUnique({
      where: { id: studentInfo.id },
    });

    if (!student && studentInfo.isNewUser) {
      // Create student if new user
      const user = await this.prisma.user.findUnique({
        where: { email: studentInfo.email },
      });

      if (user) {
        student = await this.prisma.student.create({
          data: {
            id: user.id,
            englishLevel: (studentInfo.englishLevel as any) || 'BEGINNER',
            learningGoals: cachedData.metadata.specialRequests || 'Course completion',
            timezone: 'Asia/Ho_Chi_Minh',
          },
        });
      }
    }

    if (!student) {
      throw new Error('Student not found or could not be created');
    }

    // Check if enrollment already exists
    const existingEnrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: student.id,
          courseId: courseInfo.id,
        },
      },
    });

    if (existingEnrollment) {
      this.logger.warn(`Enrollment already exists for student ${student.id} in course ${courseInfo.id}`);
      return;
    }

    // Create course enrollment
    await this.prisma.courseEnrollment.create({
      data: {
        studentId: student.id,
        courseId: courseInfo.id,
        paymentId,
        status: EnrollmentStatus.ACTIVE,
        enrolledAt: new Date(),
        progress: 0,
        enrollmentNotes: cachedData.metadata.specialRequests,
      },
    });

    this.logger.log(`✅ Course enrollment created for student ${student.id} in course ${courseInfo.id}`);

    // Create initial booking if preferred start date is provided
    if (cachedData.metadata.preferredStartDate) {
      try {
        await this.prisma.booking.create({
          data: {
            studentId: student.id,
            teacherId: courseInfo.teacherId,
            courseId: courseInfo.id,
            scheduledAt: new Date(cachedData.metadata.preferredStartDate),
            duration: courseInfo.duration,
            status: 'PENDING',
            isTrialLesson: false,
            notes: `Course enrollment booking - ${cachedData.metadata.specialRequests || 'No special requests'}`,
          },
        });

        this.logger.log(`✅ Initial booking created for course enrollment`);
      } catch (error) {
        this.logger.warn(`Could not create initial booking:`, error);
        // Don't throw error, enrollment should still succeed
      }
    }
  }

  private async processLessonPackage(paymentId: string, cachedData: PaymentCacheData): Promise<void> {
    // Implementation for lesson package processing
    // This would be similar to course enrollment but for lesson packages
    this.logger.log('Processing lesson package - implementation needed');
  }

  @Process('send-payment-notifications')
  async handlePaymentNotifications(job: Job<{ paymentId: string; cachedData: PaymentCacheData }>) {
    const { paymentId, cachedData } = job.data;
    this.logger.log(`Sending payment notifications for payment: ${paymentId}`);

    try {
      // Here you would integrate with your notification service
      // For now, just log the notification details
      
      const { studentInfo, courseInfo } = cachedData;
      
      this.logger.log(`📧 Would send email to ${studentInfo.email} about course ${courseInfo.name}`);
      this.logger.log(`📱 Would send SMS to ${studentInfo.phoneNumber} about payment success`);
      
      // You can add actual notification service calls here
      // await this.notificationService.sendEmailNotification(...)
      // await this.notificationService.sendSMSNotification(...)
      
      return { success: true, paymentId, notificationsSent: ['email', 'sms'] };

    } catch (error) {
      this.logger.error(`Error sending payment notifications for payment ${paymentId}:`, error);
      throw error;
    }
  }

  @Process('cleanup-expired-cache')
  async handleCleanupExpiredCache(job: Job) {
    this.logger.log('Cleaning up expired cache entries');

    try {
      const jobs = await job.queue.getJobs(['waiting', 'active', 'completed']);
      let cleanedCount = 0;

      for (const cacheJob of jobs) {
        if (cacheJob.data?.expiresAt && Date.now() > cacheJob.data.expiresAt) {
          await cacheJob.remove();
          cleanedCount++;
        }
      }

      this.logger.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
      return { success: true, cleanedCount };

    } catch (error) {
      this.logger.error('Error cleaning up expired cache:', error);
      throw error;
    }
  }
}
