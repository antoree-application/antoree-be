import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface PaymentCacheData {
  paymentId: string;
  studentInfo: {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    englishLevel?: string;
    isNewUser: boolean;
    tempPassword?: string;
  };
  courseInfo: {
    id: string;
    name: string;
    description?: string;
    price: number;
    totalLessons: number;
    duration: number;
    level: string;
    teacherId: string;
    teacherName: string;
    teacherAvatar?: string;
  };
  paymentInfo: {
    amount: number;
    currency: string;
    orderId: string;
    originalAmount?: number;
    discountAmount?: number;
    couponCode?: string;
  };
  metadata: {
    preferredStartDate?: string;
    specialRequests?: string;
    ipAddress: string;
    userAgent?: string;
    createdAt: string;
  };
}

@Injectable()
export class PaymentCacheService implements OnModuleInit {
  constructor(
    @InjectQueue('payment-processing') private paymentQueue: Queue,
  ) {}

  async onModuleInit() {
    // Schedule periodic cache cleanup on module initialization
    await this.scheduleCacheCleanup();
    console.log('🚀 PaymentCacheService initialized with scheduled cleanup');
  }

  /**
   * Cache payment data for processing when payment succeeds
   */
  async cachePaymentData(data: PaymentCacheData): Promise<void> {
    const key = `payment:${data.paymentId}`;
    
    // Add job to Redis queue with TTL (24 hours)
    await this.paymentQueue.add(
      'cache-payment-data',
      {
        key,
        data,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      },
      {
        delay: 0,
        attempts: 1,
        removeOnComplete: false, // Keep for debugging
        removeOnFail: false,
        jobId: key,
      }
    );

    console.log(`✅ Cached payment data for payment: ${data.paymentId}`);
  }

  /**
   * Get cached payment data
   */
  async getCachedPaymentData(paymentId: string): Promise<PaymentCacheData | null> {
    try {
      const key = `payment:${paymentId}`;
      const job = await this.paymentQueue.getJob(key);
      
      if (job && job.data?.data) {
        // Check if data is expired
        if (job.data.expiresAt && Date.now() > job.data.expiresAt) {
          await job.remove();
          return null;
        }
        return job.data.data as PaymentCacheData;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached payment data:', error);
      return null;
    }
  }

  /**
   * Remove cached payment data after processing
   */
  async removeCachedPaymentData(paymentId: string): Promise<void> {
    try {
      const key = `payment:${paymentId}`;
      const job = await this.paymentQueue.getJob(key);
      
      if (job) {
        await job.remove();
        console.log(`🗑️ Removed cached payment data for payment: ${paymentId}`);
      }
    } catch (error) {
      console.error('Error removing cached payment data:', error);
    }
  }

  /**
   * Cache course information for quick access
   */
  async cacheCourseInfo(courseId: string, courseData: any): Promise<void> {
    const key = `course:${courseId}`;
    
    await this.paymentQueue.add(
      'cache-course-info',
      {
        key,
        data: courseData,
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
      },
      {
        delay: 0,
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true,
        jobId: key,
      }
    );
  }

  /**
   * Get cached course information
   */
  async getCachedCourseInfo(courseId: string): Promise<any | null> {
    try {
      const key = `course:${courseId}`;
      const job = await this.paymentQueue.getJob(key);
      
      if (job && job.data?.data) {
        return job.data.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached course info:', error);
      return null;
    }
  }

  /**
   * Cache student information for quick access
   */
  async cacheStudentInfo(studentId: string, studentData: any): Promise<void> {
    const key = `student:${studentId}`;
    
    await this.paymentQueue.add(
      'cache-student-info',
      {
        key,
        data: studentData,
        expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
      },
      {
        delay: 0,
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true,
        jobId: key,
      }
    );
  }

  /**
   * Get cached student information
   */
  async getCachedStudentInfo(studentId: string): Promise<any | null> {
    try {
      const key = `student:${studentId}`;
      const job = await this.paymentQueue.getJob(key);
      
      if (job && job.data?.data) {
        return job.data.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached student info:', error);
      return null;
    }
  }

  /**
   * Cache teacher information for quick access
   */
  async cacheTeacherInfo(teacherId: string, teacherData: any): Promise<void> {
    const key = `teacher:${teacherId}`;
    
    await this.paymentQueue.add(
      'cache-teacher-info',
      {
        key,
        data: teacherData,
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
      },
      {
        delay: 0,
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true,
        jobId: key,
      }
    );
  }

  /**
   * Get cached teacher information
   */
  async getCachedTeacherInfo(teacherId: string): Promise<any | null> {
    try {
      const key = `teacher:${teacherId}`;
      const job = await this.paymentQueue.getJob(key);
      
      if (job && job.data?.data) {
        return job.data.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached teacher info:', error);
      return null;
    }
  }

  /**
   * Clear all cached data for a specific type
   */
  async clearCacheByType(type: 'payment' | 'course' | 'student' | 'teacher'): Promise<void> {
    try {
      const jobs = await this.paymentQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      
      for (const job of jobs) {
        if (job.data?.key?.startsWith(`${type}:`)) {
          await job.remove();
        }
      }
      
      console.log(`🧹 Cleared all ${type} cache data`);
    } catch (error) {
      console.error(`Error clearing ${type} cache:`, error);
    }
  }

  /**
   * Queue payment success processing
   */
  async queuePaymentSuccessProcessing(
    paymentId: string,
    cachedData: PaymentCacheData,
    transactionInfo: any,
  ): Promise<void> {
    await this.paymentQueue.add(
      'process-payment-success',
      {
        paymentId,
        cachedData,
        transactionInfo,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 5, // Keep last 5 failed jobs
      },
    );

    console.log(`🔄 Queued payment success processing for payment: ${paymentId}`);
  }

  /**
   * Queue payment notifications
   */
  async queuePaymentNotifications(
    paymentId: string,
    cachedData: PaymentCacheData,
  ): Promise<void> {
    await this.paymentQueue.add(
      'send-payment-notifications',
      {
        paymentId,
        cachedData,
      },
      {
        delay: 5000, // Send notifications 5 seconds after payment success
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 20,
        removeOnFail: 10,
      },
    );

    console.log(`📧 Queued payment notifications for payment: ${paymentId}`);
  }

  /**
   * Schedule cache cleanup
   */
  async scheduleCacheCleanup(): Promise<void> {
    await this.paymentQueue.add(
      'cleanup-expired-cache',
      {},
      {
        repeat: {
          cron: '0 */6 * * *', // Every 6 hours
        },
        removeOnComplete: 1,
        removeOnFail: 1,
      },
    );

    console.log('🧹 Scheduled periodic cache cleanup');
  }
  async getCacheStats(): Promise<{
    payments: number;
    courses: number;
    students: number;
    teachers: number;
    total: number;
  }> {
    try {
      const jobs = await this.paymentQueue.getJobs(['waiting', 'active', 'completed']);
      
      const stats = {
        payments: 0,
        courses: 0,
        students: 0,
        teachers: 0,
        total: jobs.length,
      };

      for (const job of jobs) {
        if (job.data?.key) {
          const key = job.data.key as string;
          if (key.startsWith('payment:')) stats.payments++;
          else if (key.startsWith('course:')) stats.courses++;
          else if (key.startsWith('student:')) stats.students++;
          else if (key.startsWith('teacher:')) stats.teachers++;
        }
      }

      return stats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        payments: 0,
        courses: 0,
        students: 0,
        teachers: 0,
        total: 0,
      };
    }
  }
}
