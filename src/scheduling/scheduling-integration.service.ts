import { Injectable, Logger } from '@nestjs/common';
import { BookingStatusScheduler } from './booking-status.scheduler';
import { LessonStatusScheduler } from './lesson-status.scheduler';
import { NotificationScheduler } from './notification.scheduler';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class SchedulingIntegrationService {
  private readonly logger = new Logger(SchedulingIntegrationService.name);

  constructor(
    private readonly bookingStatusScheduler: BookingStatusScheduler,
    private readonly lessonStatusScheduler: LessonStatusScheduler,
    private readonly notificationScheduler: NotificationScheduler,
  ) {}

  /**
   * Setup all scheduling for a new booking
   */
  async setupBookingScheduling(booking: any) {
    this.logger.log(`Setting up scheduling for booking ${booking.id}`);

    try {
      // 1. Schedule booking expiration (48 hours from creation)
      const expirationDate = new Date(booking.createdAt.getTime() + 48 * 60 * 60 * 1000);
      await this.bookingStatusScheduler.scheduleBookingExpiration(booking.id, expirationDate);

      // 2. Schedule teacher response reminders
      await this.scheduleTeacherResponseReminders(booking);

      // 3. Schedule booking expiration warnings
      await this.scheduleBookingExpirationWarnings(booking);

      // 4. If instant booking is allowed, schedule auto-confirmation
      if (booking.teacher?.allowInstantBooking) {
        await this.bookingStatusScheduler.scheduleInstantBookingConfirmation(booking.id);
      }

      this.logger.log(`Successfully setup scheduling for booking ${booking.id}`);
    } catch (error) {
      this.logger.error(`Error setting up scheduling for booking ${booking.id}:`, error);
      throw error;
    }
  }

  /**
   * Setup scheduling when a booking is confirmed
   */
  async setupConfirmedBookingScheduling(booking: any) {
    this.logger.log(`Setting up confirmed booking scheduling for booking ${booking.id}`);

    try {
      // 1. Cancel pending booking expiration jobs
      await this.bookingStatusScheduler.cancelBookingJobs(booking.id);

      // 2. Schedule lesson creation
      await this.lessonStatusScheduler.scheduleLessonCreation(booking.id, booking.scheduledAt);

      // 3. Schedule no-show check
      await this.bookingStatusScheduler.scheduleNoShowCheck(booking.id, booking.scheduledAt);

      // 4. Schedule lesson reminders
      await this.scheduleLessonReminders(booking);

      this.logger.log(`Successfully setup confirmed booking scheduling for booking ${booking.id}`);
    } catch (error) {
      this.logger.error(`Error setting up confirmed booking scheduling for booking ${booking.id}:`, error);
      throw error;
    }
  }

  /**
   * Setup scheduling when a lesson is created
   */
  async setupLessonScheduling(lesson: any) {
    this.logger.log(`Setting up lesson scheduling for lesson ${lesson.id}`);

    try {
      // 1. Schedule lesson start
      await this.lessonStatusScheduler.scheduleLessonStart(lesson.id, lesson.scheduledAt);

      // 2. Schedule lesson completion
      await this.lessonStatusScheduler.scheduleLessonCompletion(
        lesson.id, 
        lesson.scheduledAt, 
        lesson.duration
      );

      // 3. Schedule attendance check
      await this.lessonStatusScheduler.scheduleAttendanceCheck(lesson.id, lesson.scheduledAt);

      // 4. Schedule lesson reminders
      await this.lessonStatusScheduler.scheduleLessonReminders(lesson.id, lesson.scheduledAt);

      this.logger.log(`Successfully setup lesson scheduling for lesson ${lesson.id}`);
    } catch (error) {
      this.logger.error(`Error setting up lesson scheduling for lesson ${lesson.id}:`, error);
      throw error;
    }
  }

  /**
   * Setup scheduling when a lesson is completed
   */
  async setupLessonCompletionScheduling(lesson: any) {
    this.logger.log(`Setting up lesson completion scheduling for lesson ${lesson.id}`);

    try {
      // 1. Cancel any pending lesson jobs
      await this.lessonStatusScheduler.cancelLessonJobs(lesson.id);

      // 2. Schedule feedback request
      if (lesson.booking?.isTrialLesson) {
        await this.notificationScheduler.scheduleFeedbackRequest({
          lessonId: lesson.id,
          studentId: lesson.studentId,
          teacherId: lesson.teacherId,
          teacherName: `${lesson.teacher.user.firstName} ${lesson.teacher.user.lastName}`,
          lessonCompletedAt: new Date(),
        });
      }

      this.logger.log(`Successfully setup lesson completion scheduling for lesson ${lesson.id}`);
    } catch (error) {
      this.logger.error(`Error setting up lesson completion scheduling for lesson ${lesson.id}:`, error);
      throw error;
    }
  }

  /**
   * Cancel all scheduling for a booking (when cancelled or rescheduled)
   */
  async cancelBookingScheduling(bookingId: string, lessonId?: string) {
    this.logger.log(`Cancelling scheduling for booking ${bookingId}${lessonId ? ` and lesson ${lessonId}` : ''}`);

    try {
      // Cancel booking-related jobs
      await this.bookingStatusScheduler.cancelBookingJobs(bookingId);

      // Cancel lesson-related jobs if lesson exists
      if (lessonId) {
        await this.lessonStatusScheduler.cancelLessonJobs(lessonId);
      } else {
        // Cancel any lesson jobs associated with this booking
        await this.lessonStatusScheduler.cancelBookingLessonJobs(bookingId);
      }

      // Cancel notifications
      await this.notificationScheduler.cancelNotifications({ 
        bookingId, 
        lessonId: lessonId || undefined 
      });

      this.logger.log(`Successfully cancelled scheduling for booking ${bookingId}`);
    } catch (error) {
      this.logger.error(`Error cancelling scheduling for booking ${bookingId}:`, error);
      throw error;
    }
  }

  /**
   * Reschedule all jobs for a booking to a new time
   */
  async rescheduleBooking(booking: any, oldScheduledAt: Date) {
    this.logger.log(`Rescheduling booking ${booking.id} from ${oldScheduledAt} to ${booking.scheduledAt}`);

    try {
      // First cancel all existing scheduling
      await this.cancelBookingScheduling(booking.id, booking.lesson?.id);

      // Then setup new scheduling based on current status
      if (booking.status === BookingStatus.CONFIRMED) {
        await this.setupConfirmedBookingScheduling(booking);
      } else if (booking.status === BookingStatus.PENDING) {
        await this.setupBookingScheduling(booking);
      }

      this.logger.log(`Successfully rescheduled booking ${booking.id}`);
    } catch (error) {
      this.logger.error(`Error rescheduling booking ${booking.id}:`, error);
      throw error;
    }
  }

  /**
   * Send immediate notification
   */
  async sendImmediateNotification(notificationData: {
    userId: string;
    type: 'email' | 'push' | 'sms' | 'in_app';
    notificationType: string;
    subject: string;
    message: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    metadata?: any;
  }) {
    return this.notificationScheduler.sendImmediateNotification({
      priority: 'medium',
      ...notificationData,
    });
  }

  // Private helper methods

  private async scheduleTeacherResponseReminders(booking: any) {
    if (booking.status === BookingStatus.PENDING) {
      await this.notificationScheduler.scheduleTeacherResponseReminders({
        bookingId: booking.id,
        teacherId: booking.teacherId,
        studentName: `${booking.student.user.firstName} ${booking.student.user.lastName}`,
        lessonDateTime: booking.scheduledAt,
      });
    }
  }

  private async scheduleBookingExpirationWarnings(booking: any) {
    if (booking.status === BookingStatus.PENDING) {
      const expirationTime = new Date(booking.createdAt.getTime() + 48 * 60 * 60 * 1000);
      
      await this.notificationScheduler.scheduleBookingExpirationWarning({
        bookingId: booking.id,
        studentId: booking.studentId,
        teacherId: booking.teacherId,
        studentName: `${booking.student.user.firstName} ${booking.student.user.lastName}`,
        teacherName: `${booking.teacher.user.firstName} ${booking.teacher.user.lastName}`,
        expirationTime,
      });
    }
  }

  private async scheduleLessonReminders(booking: any) {
    if (booking.status === BookingStatus.CONFIRMED) {
      await this.notificationScheduler.scheduleLessonReminders({
        lessonId: booking.lesson?.id || 'pending',
        studentId: booking.studentId,
        teacherId: booking.teacherId,
        lessonStartTime: booking.scheduledAt,
        studentName: `${booking.student.user.firstName} ${booking.student.user.lastName}`,
        teacherName: `${booking.teacher.user.firstName} ${booking.teacher.user.lastName}`,
        duration: booking.duration,
      });
    }
  }

  /**
   * Get integration status for a specific booking
   */
  async getBookingSchedulingStatus(bookingId: string) {
    try {
      const [
        bookingStats,
        lessonStats,
        notificationStats,
      ] = await Promise.all([
        this.bookingStatusScheduler.getSchedulerStats(),
        this.lessonStatusScheduler.getSchedulerStats(),
        this.notificationScheduler.getSchedulerStats(),
      ]);

      // Filter jobs related to this booking
      const relatedJobs = {
        booking: {
          upcoming: bookingStats.upcomingJobs.filter(job => job.bookingId === bookingId),
          recent: bookingStats.recentFailures.filter(job => job.bookingId === bookingId),
        },
        lesson: {
          upcoming: lessonStats.upcomingJobs.filter(job => 
            job.bookingId === bookingId || job.lessonId?.includes(bookingId)
          ),
          recent: lessonStats.recentFailures.filter(job => 
            job.lessonId?.includes(bookingId)
          ),
        },
        notifications: {
          upcoming: notificationStats.upcomingNotifications.filter(
            job => job.subject?.includes(bookingId) || job.notificationType?.includes('booking')
          ),
          recent: notificationStats.recentFailures.filter(
            job => job.notificationType?.includes('booking')
          ),
        },
      };

      return {
        bookingId,
        hasActiveScheduling: 
          relatedJobs.booking.upcoming.length > 0 ||
          relatedJobs.lesson.upcoming.length > 0 ||
          relatedJobs.notifications.upcoming.length > 0,
        totalUpcomingJobs: 
          relatedJobs.booking.upcoming.length +
          relatedJobs.lesson.upcoming.length +
          relatedJobs.notifications.upcoming.length,
        totalRecentFailures:
          relatedJobs.booking.recent.length +
          relatedJobs.lesson.recent.length +
          relatedJobs.notifications.recent.length,
        details: relatedJobs,
      };
    } catch (error) {
      this.logger.error(`Error getting booking scheduling status for ${bookingId}:`, error);
      throw error;
    }
  }
}
