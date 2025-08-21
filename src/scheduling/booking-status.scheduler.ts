import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../common/prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

export interface BookingStatusJobData {
  bookingId: string;
  action: 'auto_cancel' | 'auto_confirm' | 'send_reminder' | 'mark_no_show';
  scheduledFor: Date;
  metadata?: any;
}

@Injectable()
export class BookingStatusScheduler {
  private readonly logger = new Logger(BookingStatusScheduler.name);

  constructor(
    @InjectQueue('booking-status-queue') private bookingStatusQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Schedule automatic cancellation of a booking if not confirmed within timeframe
   */
  async scheduleBookingExpiration(bookingId: string, expirationDate: Date) {
    const delay = expirationDate.getTime() - Date.now();
    
    if (delay > 0) {
      const job = await this.bookingStatusQueue.add(
        'auto-cancel-booking',
        {
          bookingId,
          action: 'auto_cancel',
          scheduledFor: expirationDate,
          metadata: { reason: 'No teacher response within timeframe' },
        } as BookingStatusJobData,
        {
          delay,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      );

      this.logger.log(`Scheduled auto-cancellation for booking ${bookingId} at ${expirationDate}`);
      return job;
    }
  }

  /**
   * Schedule automatic confirmation for instant bookings
   */
  async scheduleInstantBookingConfirmation(bookingId: string, delayMinutes: number = 5) {
    const confirmationDate = new Date(Date.now() + delayMinutes * 60 * 1000);
    
    const job = await this.bookingStatusQueue.add(
      'auto-confirm-booking',
      {
        bookingId,
        action: 'auto_confirm',
        scheduledFor: confirmationDate,
        metadata: { reason: 'Instant booking auto-confirmation' },
      } as BookingStatusJobData,
      {
        delay: delayMinutes * 60 * 1000,
        attempts: 2,
      }
    );

    this.logger.log(`Scheduled auto-confirmation for instant booking ${bookingId}`);
    return job;
  }

  /**
   * Schedule reminder for teacher to respond to booking
   */
  async scheduleTeacherResponseReminder(bookingId: string, reminderDate: Date) {
    const delay = reminderDate.getTime() - Date.now();
    
    if (delay > 0) {
      const job = await this.bookingStatusQueue.add(
        'teacher-response-reminder',
        {
          bookingId,
          action: 'send_reminder',
          scheduledFor: reminderDate,
          metadata: { reminderType: 'teacher_response' },
        } as BookingStatusJobData,
        {
          delay,
          attempts: 1, // Only send reminder once
        }
      );

      this.logger.log(`Scheduled teacher response reminder for booking ${bookingId}`);
      return job;
    }
  }

  /**
   * Schedule no-show marking for bookings where student doesn't attend
   */
  async scheduleNoShowCheck(bookingId: string, lessonStartTime: Date) {
    const noShowCheckTime = new Date(lessonStartTime.getTime() + 30 * 60 * 1000); // 30 minutes after start
    const delay = noShowCheckTime.getTime() - Date.now();
    
    if (delay > 0) {
      const job = await this.bookingStatusQueue.add(
        'check-no-show',
        {
          bookingId,
          action: 'mark_no_show',
          scheduledFor: noShowCheckTime,
          metadata: { originalStartTime: lessonStartTime },
        } as BookingStatusJobData,
        {
          delay,
          attempts: 1,
        }
      );

      this.logger.log(`Scheduled no-show check for booking ${bookingId}`);
      return job;
    }
  }

  /**
   * Cancel all scheduled jobs for a specific booking
   */
  async cancelBookingJobs(bookingId: string) {
    const jobs = await this.bookingStatusQueue.getJobs(['delayed', 'waiting']);
    
    for (const job of jobs) {
      const jobData = job.data as BookingStatusJobData;
      if (jobData.bookingId === bookingId) {
        await job.remove();
        this.logger.log(`Cancelled scheduled job ${job.id} for booking ${bookingId}`);
      }
    }
  }

  /**
   * Process booking status jobs
   */
  async processBookingStatusJob(job: any) {
    const data = job.data as BookingStatusJobData;
    const { bookingId, action, metadata } = data;

    try {
      this.logger.log(`Processing booking status job: ${action} for booking ${bookingId}`);

      // Get current booking status to ensure it's still valid to process
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          student: { include: { user: true } },
          teacher: { include: { user: true } },
          lesson: true,
        },
      });

      if (!booking) {
        this.logger.warn(`Booking ${bookingId} not found, skipping job`);
        return;
      }

      switch (action) {
        case 'auto_cancel':
          await this.handleAutoCancelBooking(booking, metadata);
          break;
        
        case 'auto_confirm':
          await this.handleAutoConfirmBooking(booking, metadata);
          break;
        
        case 'send_reminder':
          await this.handleSendReminder(booking, metadata);
          break;
        
        case 'mark_no_show':
          await this.handleMarkNoShow(booking, metadata);
          break;
        
        default:
          this.logger.warn(`Unknown booking action: ${action}`);
      }

      this.logger.log(`Successfully processed booking status job: ${action} for booking ${bookingId}`);
    } catch (error) {
      this.logger.error(`Error processing booking status job for booking ${bookingId}:`, error);
      throw error;
    }
  }

  private async handleAutoCancelBooking(booking: any, metadata: any) {
    // Only cancel if still pending
    if (booking.status === BookingStatus.PENDING) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CANCELLED,
          notes: `${booking.notes || ''}\nAuto-cancelled: ${metadata.reason}`,
        },
      });

      // Notify student of cancellation
      await this.notifyBookingCancellation(booking, metadata.reason);
      
      this.logger.log(`Auto-cancelled booking ${booking.id}: ${metadata.reason}`);
    } else {
      this.logger.log(`Booking ${booking.id} is no longer pending, skipping auto-cancellation`);
    }
  }

  private async handleAutoConfirmBooking(booking: any, metadata: any) {
    // Only confirm if still pending and teacher allows instant booking
    if (booking.status === BookingStatus.PENDING && booking.teacher.allowInstantBooking) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CONFIRMED,
          notes: `${booking.notes || ''}\nAuto-confirmed: ${metadata.reason}`,
        },
      });

      // Notify both parties of confirmation
      await this.notifyBookingConfirmation(booking);
      
      this.logger.log(`Auto-confirmed booking ${booking.id}: ${metadata.reason}`);
    } else {
      this.logger.log(`Booking ${booking.id} cannot be auto-confirmed, skipping`);
    }
  }

  private async handleSendReminder(booking: any, metadata: any) {
    if (booking.status === BookingStatus.PENDING) {
      if (metadata.reminderType === 'teacher_response') {
        await this.sendTeacherResponseReminder(booking);
      }
    }
  }

  private async handleMarkNoShow(booking: any, metadata: any) {
    // Only mark as no-show if booking is confirmed but no lesson started
    if (booking.status === BookingStatus.CONFIRMED && !booking.lesson) {
      // Create lesson record marked as cancelled (no-show)
      await this.prisma.lesson.create({
        data: {
          bookingId: booking.id,
          studentId: booking.studentId,
          teacherId: booking.teacherId,
          courseId: booking.courseId,
          scheduledAt: booking.scheduledAt,
          duration: booking.duration,
          status: 'CANCELLED',
          notes: 'Student did not show up for the lesson',
        },
      });

      // Update booking status
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CANCELLED,
          notes: `${booking.notes || ''}\nMarked as no-show - student did not attend`,
        },
      });

      // Notify teacher of no-show
      await this.notifyNoShow(booking);
      
      this.logger.log(`Marked booking ${booking.id} as no-show`);
    }
  }

  // Notification helper methods
  private async notifyBookingCancellation(booking: any, reason: string) {
    // Implementation for sending cancellation notifications
    this.logger.log(`Sending cancellation notification for booking ${booking.id}: ${reason}`);
  }

  private async notifyBookingConfirmation(booking: any) {
    // Implementation for sending confirmation notifications
    this.logger.log(`Sending confirmation notification for booking ${booking.id}`);
  }

  private async sendTeacherResponseReminder(booking: any) {
    // Implementation for sending teacher reminder
    this.logger.log(`Sending teacher response reminder for booking ${booking.id}`);
  }

  private async notifyNoShow(booking: any) {
    // Implementation for sending no-show notification
    this.logger.log(`Sending no-show notification for booking ${booking.id}`);
  }

  /**
   * Get booking scheduler statistics
   */
  async getSchedulerStats() {
    const waitingJobs = await this.bookingStatusQueue.getJobs(['waiting']);
    const delayedJobs = await this.bookingStatusQueue.getJobs(['delayed']);
    const activeJobs = await this.bookingStatusQueue.getJobs(['active']);
    const completedJobs = await this.bookingStatusQueue.getJobs(['completed'], 0, 10);
    const failedJobs = await this.bookingStatusQueue.getJobs(['failed'], 0, 10);

    return {
      queueStats: {
        waiting: waitingJobs.length,
        delayed: delayedJobs.length,
        active: activeJobs.length,
        completed: completedJobs.length,
        failed: failedJobs.length,
      },
      upcomingJobs: delayedJobs.slice(0, 5).map(job => ({
        id: job.id,
        bookingId: (job.data as BookingStatusJobData).bookingId,
        action: (job.data as BookingStatusJobData).action,
        scheduledFor: (job.data as BookingStatusJobData).scheduledFor,
        delay: job.opts.delay,
      })),
      recentFailures: failedJobs.slice(0, 3).map(job => ({
        id: job.id,
        bookingId: (job.data as BookingStatusJobData).bookingId,
        action: (job.data as BookingStatusJobData).action,
        error: job.failedReason,
        failedAt: job.processedOn,
      })),
    };
  }
}
