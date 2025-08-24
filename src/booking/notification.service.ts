import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface NotificationData {
  type: 'TRIAL_REQUEST' | 'TRIAL_ACCEPTED' | 'TRIAL_DECLINED' | 'TRIAL_REMINDER' | 'TRIAL_COMPLETED';
  title: string;
  message: string;
  recipientId: string;
  bookingId?: string;
  metadata?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high';
}

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send notification to user
   */
  async sendNotification(data: NotificationData): Promise<void> {
    // In a real implementation, this would:
    // 1. Store notification in database
    // 2. Send email notification
    // 3. Send push notification
    // 4. Send SMS if urgent
    // 5. Send real-time notification via WebSocket

    console.log(`📧 Sending ${data.type} notification to user ${data.recipientId}:`, {
      title: data.title,
      message: data.message,
      bookingId: data.bookingId,
      priority: data.priority || 'medium',
    });

    // For now, we'll just log the notification
    await this.logNotification(data);
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(
    recipientEmail: string,
    subject: string,
    template: string,
    templateData: Record<string, any>
  ): Promise<void> {
    // In a real implementation, this would integrate with email service (SendGrid, Mailgun, etc.)
    console.log(`📧 Email notification sent to ${recipientEmail}:`, {
      subject,
      template,
      data: templateData,
    });
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(
    phoneNumber: string,
    message: string
  ): Promise<void> {
    // In a real implementation, this would integrate with SMS service (Twilio, etc.)
    console.log(`📱 SMS notification sent to ${phoneNumber}: ${message}`);
  }

  /**
   * Send push notification
   */
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    // In a real implementation, this would integrate with push notification service (Firebase, etc.)
    console.log(`🔔 Push notification sent to user ${userId}:`, {
      title,
      body,
      data,
    });
  }

  /**
   * Send real-time notification via WebSocket
   */
  async sendRealTimeNotification(
    userId: string,
    event: string,
    data: any
  ): Promise<void> {
    // In a real implementation, this would send via WebSocket connection
    console.log(`🔄 Real-time notification sent to user ${userId}:`, {
      event,
      data,
    });
  }

  /**
   * Send trial lesson request notification to teacher
   */
  async sendTrialRequestToTeacher(
    teacherId: string,
    teacherEmail: string,
    studentName: string,
    bookingId: string,
    scheduledAt: Date,
    learningGoals?: string
  ): Promise<void> {
    const notification: NotificationData = {
      type: 'TRIAL_REQUEST',
      title: 'New Trial Lesson Request',
      message: `${studentName} has requested a trial lesson with you`,
      recipientId: teacherId,
      bookingId,
      priority: 'high',
      metadata: {
        studentName,
        scheduledAt: scheduledAt.toISOString(),
        learningGoals,
      },
    };

    await this.sendNotification(notification);

    // Send email notification
    await this.sendEmailNotification(
      teacherEmail,
      'New Trial Lesson Request - Action Required',
      'trial-request-teacher',
      {
        studentName,
        scheduledAt: scheduledAt.toLocaleDateString(),
        scheduledTime: scheduledAt.toLocaleTimeString(),
        learningGoals: learningGoals || 'Not specified',
        acceptUrl: `${process.env.FRONTEND_URL}/teacher/bookings/${bookingId}/respond?action=accept`,
        declineUrl: `${process.env.FRONTEND_URL}/teacher/bookings/${bookingId}/respond?action=decline`,
      }
    );

    // Send push notification
    await this.sendPushNotification(
      teacherId,
      'New Trial Lesson Request',
      `${studentName} wants to book a trial lesson with you`
    );
  }

  /**
   * Send trial lesson acceptance notification to student
   */
  async sendTrialAcceptanceToStudent(
    studentId: string,
    studentEmail: string,
    teacherName: string,
    bookingId: string,
    scheduledAt: Date,
    meetingLink: string,
    instructions?: string
  ): Promise<void> {
    const notification: NotificationData = {
      type: 'TRIAL_ACCEPTED',
      title: 'Trial Lesson Confirmed!',
      message: `${teacherName} has accepted your trial lesson request`,
      recipientId: studentId,
      bookingId,
      priority: 'high',
      metadata: {
        teacherName,
        scheduledAt: scheduledAt.toISOString(),
        meetingLink,
        instructions,
      },
    };

    await this.sendNotification(notification);

    // Send email notification
    await this.sendEmailNotification(
      studentEmail,
      'Trial Lesson Confirmed - Get Ready!',
      'trial-accepted-student',
      {
        teacherName,
        scheduledAt: scheduledAt.toLocaleDateString(),
        scheduledTime: scheduledAt.toLocaleTimeString(),
        meetingLink,
        instructions: instructions || 'Join the lesson 5 minutes before the scheduled time.',
        joinUrl: `${process.env.FRONTEND_URL}/lessons/join/${bookingId}`,
        rescheduleUrl: `${process.env.FRONTEND_URL}/bookings/${bookingId}/reschedule`,
      }
    );

    // Send push notification
    await this.sendPushNotification(
      studentId,
      'Trial Lesson Confirmed!',
      `Your trial lesson with ${teacherName} is confirmed for ${scheduledAt.toLocaleDateString()}`
    );
  }

  /**
   * Send trial lesson decline notification to student
   */
  async sendTrialDeclineToStudent(
    studentId: string,
    studentEmail: string,
    teacherName: string,
    bookingId: string,
    reason?: string
  ): Promise<void> {
    const notification: NotificationData = {
      type: 'TRIAL_DECLINED',
      title: 'Trial Lesson Request Update',
      message: `${teacherName} is unable to conduct the trial lesson`,
      recipientId: studentId,
      bookingId,
      priority: 'medium',
      metadata: {
        teacherName,
        reason,
      },
    };

    await this.sendNotification(notification);

    // Send email notification
    await this.sendEmailNotification(
      studentEmail,
      'Trial Lesson Request Update',
      'trial-declined-student',
      {
        teacherName,
        reason: reason || 'The teacher is unavailable at the requested time.',
        findOtherTeachersUrl: `${process.env.FRONTEND_URL}/teachers`,
        rescheduleUrl: `${process.env.FRONTEND_URL}/teachers/${bookingId.split('_')[1]}/book`,
      }
    );

    // Send push notification
    await this.sendPushNotification(
      studentId,
      'Trial Lesson Update',
      `Your trial lesson request was declined. Find other available teachers.`
    );
  }

  /**
   * Send trial lesson reminder notifications
   */
  async sendTrialLessonReminder(
    bookingId: string,
    studentId: string,
    teacherId: string,
    studentEmail: string,
    teacherEmail: string,
    studentName: string,
    teacherName: string,
    scheduledAt: Date,
    meetingLink: string,
    reminderType: '24h' | '1h' | '15min'
  ): Promise<void> {
    const reminderTimes = {
      '24h': '24 hours',
      '1h': '1 hour',
      '15min': '15 minutes',
    };

    const timeUntil = reminderTimes[reminderType];

    // Send to student
    await this.sendNotification({
      type: 'TRIAL_REMINDER',
      title: `Trial Lesson Reminder - ${timeUntil}`,
      message: `Your trial lesson with ${teacherName} is in ${timeUntil}`,
      recipientId: studentId,
      bookingId,
      priority: reminderType === '15min' ? 'high' : 'medium',
      metadata: { reminderType, scheduledAt: scheduledAt.toISOString() },
    });

    // Send to teacher
    await this.sendNotification({
      type: 'TRIAL_REMINDER',
      title: `Trial Lesson Reminder - ${timeUntil}`,
      message: `Your trial lesson with ${studentName} is in ${timeUntil}`,
      recipientId: teacherId,
      bookingId,
      priority: reminderType === '15min' ? 'high' : 'medium',
      metadata: { reminderType, scheduledAt: scheduledAt.toISOString() },
    });

    if (reminderType === '15min') {
      // Send email with join link
      await this.sendEmailNotification(
        studentEmail,
        'Trial Lesson Starting Soon - Join Now',
        'trial-reminder-student',
        {
          teacherName,
          scheduledTime: scheduledAt.toLocaleTimeString(),
          meetingLink,
          joinUrl: `${process.env.FRONTEND_URL}/lessons/join/${bookingId}`,
        }
      );

      await this.sendEmailNotification(
        teacherEmail,
        'Trial Lesson Starting Soon',
        'trial-reminder-teacher',
        {
          studentName,
          scheduledTime: scheduledAt.toLocaleTimeString(),
          meetingLink,
          joinUrl: `${process.env.FRONTEND_URL}/lessons/join/${bookingId}`,
        }
      );

      // Send push notifications
      await this.sendPushNotification(
        studentId,
        'Trial Lesson Starting Soon',
        'Your lesson is starting in 15 minutes. Tap to join.',
        { bookingId, action: 'join' }
      );

      await this.sendPushNotification(
        teacherId,
        'Trial Lesson Starting Soon',
        `Lesson with ${studentName} is starting in 15 minutes.`,
        { bookingId, action: 'join' }
      );
    }
  }

  /**
   * Send trial lesson completion notification
   */
  async sendTrialCompletionNotification(
    bookingId: string,
    studentId: string,
    teacherId: string,
    studentEmail: string,
    teacherEmail: string,
    studentName: string,
    teacherName: string,
    feedback?: string,
    recommendations?: string
  ): Promise<void> {
    // Send to student
    await this.sendNotification({
      type: 'TRIAL_COMPLETED',
      title: 'Trial Lesson Completed',
      message: 'Your trial lesson has been completed successfully',
      recipientId: studentId,
      bookingId,
      priority: 'medium',
      metadata: { feedback, recommendations },
    });

    // Send to teacher
    await this.sendNotification({
      type: 'TRIAL_COMPLETED',
      title: 'Trial Lesson Completed',
      message: `Trial lesson with ${studentName} has been completed`,
      recipientId: teacherId,
      bookingId,
      priority: 'low',
      metadata: { feedback, recommendations },
    });

    // Send completion email to student
    await this.sendEmailNotification(
      studentEmail,
      'Trial Lesson Completed - Next Steps',
      'trial-completed-student',
      {
        teacherName,
        feedback: feedback || 'No feedback provided',
        recommendations: recommendations || 'Continue practicing!',
        bookRegularLessonUrl: `${process.env.FRONTEND_URL}/teachers/${teacherId}/book`,
        leaveReviewUrl: `${process.env.FRONTEND_URL}/reviews/${bookingId}`,
        recordingUrl: `${process.env.FRONTEND_URL}/recordings/${bookingId}`,
      }
    );

    // Send summary email to teacher
    await this.sendEmailNotification(
      teacherEmail,
      'Trial Lesson Summary',
      'trial-completed-teacher',
      {
        studentName,
        feedback: feedback || 'No feedback provided',
        studentProfileUrl: `${process.env.FRONTEND_URL}/teacher/students/${studentId}`,
        scheduleUrl: `${process.env.FRONTEND_URL}/teacher/schedule`,
      }
    );
  }

  /**
   * Schedule reminder notifications
   */
  async scheduleTrialLessonReminders(
    bookingId: string,
    scheduledAt: Date
  ): Promise<void> {
    const now = new Date();
    const lessonTime = new Date(scheduledAt);

    // Schedule 24-hour reminder
    const reminder24h = new Date(lessonTime.getTime() - 24 * 60 * 60 * 1000);
    if (reminder24h > now) {
      // In a real implementation, this would schedule with a job queue (Bull, Agenda, etc.)
      console.log(`📅 Scheduled 24h reminder for booking ${bookingId} at ${reminder24h.toISOString()}`);
    }

    // Schedule 1-hour reminder
    const reminder1h = new Date(lessonTime.getTime() - 60 * 60 * 1000);
    if (reminder1h > now) {
      console.log(`📅 Scheduled 1h reminder for booking ${bookingId} at ${reminder1h.toISOString()}`);
    }

    // Schedule 15-minute reminder
    const reminder15min = new Date(lessonTime.getTime() - 15 * 60 * 1000);
    if (reminder15min > now) {
      console.log(`📅 Scheduled 15min reminder for booking ${bookingId} at ${reminder15min.toISOString()}`);
    }
  }

  /**
   * Log notification for audit trail
   */
  private async logNotification(data: NotificationData): Promise<void> {
    // In a real implementation, this would store in a notifications table
    const log = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: data.type,
      title: data.title,
      message: data.message,
      recipientId: data.recipientId,
      bookingId: data.bookingId,
      priority: data.priority || 'medium',
      metadata: data.metadata,
      createdAt: new Date().toISOString(),
      status: 'sent',
    };

    console.log(`📝 Notification logged:`, log);
  }
}
