import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../common/prisma/prisma.service';

export interface NotificationJobData {
  userId: string;
  type: 'email' | 'push' | 'sms' | 'in_app';
  notificationType: string;
  subject: string;
  message: string;
  scheduledFor: Date;
  metadata?: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    @InjectQueue('notification-queue') private notificationQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Schedule a notification to be sent at a specific time
   */
  async scheduleNotification(notificationData: Omit<NotificationJobData, 'scheduledFor'> & { sendAt: Date }) {
    const delay = notificationData.sendAt.getTime() - Date.now();
    
    if (delay <= 0) {
      // Send immediately if scheduled time has passed
      return this.sendImmediateNotification(notificationData);
    }

    const job = await this.notificationQueue.add(
      'send-notification',
      {
        ...notificationData,
        scheduledFor: notificationData.sendAt,
      } as NotificationJobData,
      {
        delay,
        attempts: this.getRetryAttempts(notificationData.priority),
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        priority: this.getJobPriority(notificationData.priority),
      }
    );

    this.logger.log(`Scheduled ${notificationData.type} notification for user ${notificationData.userId}`);
    return job;
  }

  /**
   * Send immediate notification
   */
  async sendImmediateNotification(notificationData: Omit<NotificationJobData, 'scheduledFor'>) {
    const job = await this.notificationQueue.add(
      'send-notification',
      {
        ...notificationData,
        scheduledFor: new Date(),
      } as NotificationJobData,
      {
        attempts: this.getRetryAttempts(notificationData.priority),
        priority: this.getJobPriority(notificationData.priority),
      }
    );

    this.logger.log(`Queued immediate ${notificationData.type} notification for user ${notificationData.userId}`);
    return job;
  }

  /**
   * Schedule lesson reminder notifications
   */
  async scheduleLessonReminders(lessonData: {
    lessonId: string;
    studentId: string;
    teacherId: string;
    lessonStartTime: Date;
    teacherName: string;
    studentName: string;
    duration: number;
  }) {
    const { lessonId, studentId, teacherId, lessonStartTime, teacherName, studentName, duration } = lessonData;
    
    const reminders = [
      {
        timeOffset: 24 * 60 * 60 * 1000, // 24 hours
        title: 'Lesson Tomorrow',
        studentMessage: `Don't forget! You have a lesson with ${teacherName} tomorrow at ${this.formatTime(lessonStartTime)}.`,
        teacherMessage: `Reminder: You have a lesson with ${studentName} tomorrow at ${this.formatTime(lessonStartTime)}.`,
      },
      {
        timeOffset: 60 * 60 * 1000, // 1 hour
        title: 'Lesson Starting Soon',
        studentMessage: `Your lesson with ${teacherName} starts in 1 hour. Please prepare your materials and test your connection.`,
        teacherMessage: `Your lesson with ${studentName} starts in 1 hour. Please ensure your setup is ready.`,
      },
      {
        timeOffset: 15 * 60 * 1000, // 15 minutes
        title: 'Lesson Starting Soon',
        studentMessage: `Your lesson with ${teacherName} starts in 15 minutes. Join now to test your connection.`,
        teacherMessage: `Your lesson with ${studentName} starts in 15 minutes. The student may join early to test their connection.`,
      },
    ];

    const jobs = [];

    for (const reminder of reminders) {
      const sendTime = new Date(lessonStartTime.getTime() - reminder.timeOffset);
      
      // Student notification
      const studentJob = await this.scheduleNotification({
        userId: studentId,
        type: 'email',
        notificationType: 'lesson_reminder',
        subject: reminder.title,
        message: reminder.studentMessage,
        sendAt: sendTime,
        priority: 'medium',
        metadata: {
          lessonId,
          teacherId,
          reminderType: `${reminder.timeOffset / (60 * 60 * 1000)}h_before`,
          lessonStartTime: lessonStartTime.toISOString(),
        },
      });

      // Teacher notification
      const teacherJob = await this.scheduleNotification({
        userId: teacherId,
        type: 'email',
        notificationType: 'lesson_reminder',
        subject: reminder.title,
        message: reminder.teacherMessage,
        sendAt: sendTime,
        priority: 'medium',
        metadata: {
          lessonId,
          studentId,
          reminderType: `${reminder.timeOffset / (60 * 60 * 1000)}h_before`,
          lessonStartTime: lessonStartTime.toISOString(),
        },
      });

      jobs.push(studentJob, teacherJob);
    }

    this.logger.log(`Scheduled ${jobs.length} lesson reminder notifications for lesson ${lessonId}`);
    return jobs;
  }

  /**
   * Schedule booking expiration warnings
   */
  async scheduleBookingExpirationWarning(bookingData: {
    bookingId: string;
    studentId: string;
    teacherId: string;
    teacherName: string;
    studentName: string;
    expirationTime: Date;
  }) {
    const { bookingId, studentId, teacherId, teacherName, studentName, expirationTime } = bookingData;
    
    // Send warning 8 hours before expiration
    const warningTime = new Date(expirationTime.getTime() - 8 * 60 * 60 * 1000);
    
    const jobs = [];

    // Student warning
    const studentJob = await this.scheduleNotification({
      userId: studentId,
      type: 'email',
      notificationType: 'booking_expiring',
      subject: 'Booking Request Expiring Soon',
      message: `Your booking request with ${teacherName} will expire in 8 hours if not confirmed. Please wait for the teacher's response or contact support if needed.`,
      sendAt: warningTime,
      priority: 'high',
      metadata: {
        bookingId,
        teacherId,
        expirationTime: expirationTime.toISOString(),
      },
    });

    // Teacher urgent reminder
    const teacherJob = await this.scheduleNotification({
      userId: teacherId,
      type: 'push',
      notificationType: 'booking_response_urgent',
      subject: 'Urgent: Booking Request Expiring',
      message: `${studentName}'s booking request expires in 8 hours. Please respond now to avoid automatic cancellation.`,
      sendAt: warningTime,
      priority: 'urgent',
      metadata: {
        bookingId,
        studentId,
        expirationTime: expirationTime.toISOString(),
      },
    });

    jobs.push(studentJob, teacherJob);

    this.logger.log(`Scheduled booking expiration warnings for booking ${bookingId}`);
    return jobs;
  }

  /**
   * Schedule teacher response reminders
   */
  async scheduleTeacherResponseReminders(bookingData: {
    bookingId: string;
    teacherId: string;
    studentName: string;
    lessonDateTime: Date;
  }) {
    const { bookingId, teacherId, studentName, lessonDateTime } = bookingData;
    
    const reminders = [
      { hours: 4, urgency: 'medium' },
      { hours: 12, urgency: 'high' },
      { hours: 24, urgency: 'high' },
    ];

    const jobs = [];

    for (const reminder of reminders) {
      const reminderTime = new Date(Date.now() + reminder.hours * 60 * 60 * 1000);
      
      const job = await this.scheduleNotification({
        userId: teacherId,
        type: reminder.urgency === 'high' ? 'push' : 'email',
        notificationType: 'booking_response_reminder',
        subject: 'Booking Request Awaiting Response',
        message: `${studentName} is waiting for your response to their lesson request for ${this.formatDateTime(lessonDateTime)}. Please respond to confirm or decline.`,
        sendAt: reminderTime,
        priority: reminder.urgency as 'medium' | 'high',
        metadata: {
          bookingId,
          studentName,
          lessonDateTime: lessonDateTime.toISOString(),
          reminderSequence: reminder.hours,
        },
      });

      jobs.push(job);
    }

    this.logger.log(`Scheduled ${jobs.length} teacher response reminders for booking ${bookingId}`);
    return jobs;
  }

  /**
   * Schedule feedback request notifications
   */
  async scheduleFeedbackRequest(feedbackData: {
    lessonId: string;
    studentId: string;
    teacherId: string;
    teacherName: string;
    lessonCompletedAt: Date;
  }) {
    const { lessonId, studentId, teacherId, teacherName, lessonCompletedAt } = feedbackData;
    
    // Send feedback request 2 hours after lesson completion
    const feedbackTime = new Date(lessonCompletedAt.getTime() + 2 * 60 * 60 * 1000);
    
    const job = await this.scheduleNotification({
      userId: studentId,
      type: 'email',
      notificationType: 'feedback_request',
      subject: 'How was your lesson?',
      message: `We hope you enjoyed your lesson with ${teacherName}! Please take a moment to rate your experience and help us improve our service.`,
      sendAt: feedbackTime,
      priority: 'low',
      metadata: {
        lessonId,
        teacherId,
        lessonCompletedAt: lessonCompletedAt.toISOString(),
      },
    });

    this.logger.log(`Scheduled feedback request for lesson ${lessonId}`);
    return job;
  }

  /**
   * Cancel notifications for a specific booking/lesson
   */
  async cancelNotifications(metadata: { bookingId?: string; lessonId?: string }) {
    const jobs = await this.notificationQueue.getJobs(['delayed', 'waiting']);
    
    let cancelledCount = 0;
    for (const job of jobs) {
      const jobData = job.data as NotificationJobData;
      const shouldCancel = 
        (metadata.bookingId && jobData.metadata?.bookingId === metadata.bookingId) ||
        (metadata.lessonId && jobData.metadata?.lessonId === metadata.lessonId);
      
      if (shouldCancel) {
        await job.remove();
        cancelledCount++;
      }
    }

    this.logger.log(`Cancelled ${cancelledCount} notifications for ${JSON.stringify(metadata)}`);
    return cancelledCount;
  }

  /**
   * Process notification jobs
   */
  async processNotificationJob(job: any) {
    const data = job.data as NotificationJobData;
    const { userId, type, notificationType, subject, message, metadata } = data;

    try {
      this.logger.log(`Processing ${type} notification: ${notificationType} for user ${userId}`);

      // Get user information
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          student: true,
          teacher: true,
        },
      });

      if (!user) {
        this.logger.warn(`User ${userId} not found, skipping notification`);
        return;
      }

      switch (type) {
        case 'email':
          await this.sendEmailNotification(user, subject, message, metadata);
          break;
        
        case 'push':
          await this.sendPushNotification(user, subject, message, metadata);
          break;
        
        case 'sms':
          await this.sendSMSNotification(user, message, metadata);
          break;
        
        case 'in_app':
          await this.sendInAppNotification(user, subject, message, metadata);
          break;
        
        default:
          this.logger.warn(`Unknown notification type: ${type}`);
      }

      // Log notification delivery
      await this.logNotificationDelivery(userId, type, notificationType, true);
      
      this.logger.log(`Successfully sent ${type} notification to user ${userId}`);
    } catch (error) {
      this.logger.error(`Error sending notification to user ${userId}:`, error);
      await this.logNotificationDelivery(userId, type, notificationType, false, error.message);
      throw error;
    }
  }

  // Notification delivery methods
  private async sendEmailNotification(user: any, subject: string, message: string, metadata: any) {
    // Implementation for email sending
    // This would integrate with services like SendGrid, AWS SES, etc.
    this.logger.log(`Sending email to ${user.email}: ${subject}`);
    
    // Example integration point:
    // await this.emailService.send({
    //   to: user.email,
    //   subject,
    //   text: message,
    //   html: this.generateEmailHTML(subject, message, metadata),
    //   templateData: metadata,
    // });
  }

  private async sendPushNotification(user: any, title: string, message: string, metadata: any) {
    // Implementation for push notifications
    // This would integrate with services like Firebase Cloud Messaging
    this.logger.log(`Sending push notification to user ${user.id}: ${title}`);
    
    // Example integration point:
    // await this.pushService.send({
    //   userId: user.id,
    //   title,
    //   body: message,
    //   data: metadata,
    // });
  }

  private async sendSMSNotification(user: any, message: string, metadata: any) {
    // Implementation for SMS sending
    // This would integrate with services like Twilio
    if (user.phone) {
      this.logger.log(`Sending SMS to ${user.phone}: ${message.substring(0, 50)}...`);
      
      // Example integration point:
      // await this.smsService.send({
      //   to: user.phone,
      //   message,
      // });
    } else {
      this.logger.warn(`User ${user.id} has no phone number for SMS`);
    }
  }

  private async sendInAppNotification(user: any, title: string, message: string, metadata: any) {
    // Implementation for in-app notifications
    // This would save to a notifications table and use WebSocket/SSE for real-time delivery
    this.logger.log(`Creating in-app notification for user ${user.id}: ${title}`);
    
    // Example implementation:
    // await this.prisma.notification.create({
    //   data: {
    //     userId: user.id,
    //     title,
    //     message,
    //     type: metadata.notificationType,
    //     metadata,
    //     isRead: false,
    //   },
    // });
    
    // Emit via WebSocket
    // this.websocketGateway.sendNotificationToUser(user.id, { title, message, metadata });
  }

  private async logNotificationDelivery(
    userId: string,
    type: string,
    notificationType: string,
    success: boolean,
    error?: string
  ) {
    // Log notification delivery for analytics and debugging
    this.logger.log(`Notification delivery log: User ${userId}, Type ${type}, Success ${success}${error ? `, Error: ${error}` : ''}`);
    
    // This could save to a delivery log table for tracking and analytics
  }

  // Helper methods
  private getRetryAttempts(priority: string): number {
    switch (priority) {
      case 'urgent': return 5;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  private getJobPriority(priority: string): number {
    switch (priority) {
      case 'urgent': return 10;
      case 'high': return 5;
      case 'medium': return 0;
      case 'low': return -5;
      default: return 0;
    }
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }

  /**
   * Get notification scheduler statistics
   */
  async getSchedulerStats() {
    const waitingJobs = await this.notificationQueue.getJobs(['waiting']);
    const delayedJobs = await this.notificationQueue.getJobs(['delayed']);
    const activeJobs = await this.notificationQueue.getJobs(['active']);
    const completedJobs = await this.notificationQueue.getJobs(['completed'], 0, 10);
    const failedJobs = await this.notificationQueue.getJobs(['failed'], 0, 10);

    // Group by notification type
    const notificationTypes = delayedJobs.reduce((acc, job) => {
      const type = (job.data as NotificationJobData).notificationType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      queueStats: {
        waiting: waitingJobs.length,
        delayed: delayedJobs.length,
        active: activeJobs.length,
        completed: completedJobs.length,
        failed: failedJobs.length,
      },
      notificationTypes,
      upcomingNotifications: delayedJobs.slice(0, 10).map(job => ({
        id: job.id,
        userId: (job.data as NotificationJobData).userId,
        type: (job.data as NotificationJobData).type,
        notificationType: (job.data as NotificationJobData).notificationType,
        subject: (job.data as NotificationJobData).subject,
        scheduledFor: (job.data as NotificationJobData).scheduledFor,
        priority: (job.data as NotificationJobData).priority,
      })),
      recentFailures: failedJobs.slice(0, 5).map(job => ({
        id: job.id,
        userId: (job.data as NotificationJobData).userId,
        type: (job.data as NotificationJobData).type,
        notificationType: (job.data as NotificationJobData).notificationType,
        error: job.failedReason,
        failedAt: job.processedOn,
      })),
    };
  }
}
