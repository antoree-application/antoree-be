import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../common/prisma/prisma.service';
import { LessonStatus, BookingStatus } from '@prisma/client';

export interface LessonStatusJobData {
  lessonId?: string;
  bookingId?: string;
  action: 'start_lesson' | 'complete_lesson' | 'send_reminder' | 'create_lesson' | 'check_attendance';
  scheduledFor: Date;
  metadata?: any;
}

@Injectable()
export class LessonStatusScheduler {
  private readonly logger = new Logger(LessonStatusScheduler.name);

  constructor(
    @InjectQueue('lesson-status-queue') private lessonStatusQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Schedule automatic lesson creation from confirmed booking
   */
  async scheduleLessonCreation(bookingId: string, lessonStartTime: Date) {
    // Create lesson 24 hours before start time
    const creationTime = new Date(lessonStartTime.getTime() - 24 * 60 * 60 * 1000);
    const delay = Math.max(0, creationTime.getTime() - Date.now());
    
    const job = await this.lessonStatusQueue.add(
      'create-lesson',
      {
        bookingId,
        action: 'create_lesson',
        scheduledFor: creationTime,
        metadata: { originalStartTime: lessonStartTime },
      } as LessonStatusJobData,
      {
        delay,
        attempts: 3,
      }
    );

    this.logger.log(`Scheduled lesson creation for booking ${bookingId}`);
    return job;
  }

  /**
   * Schedule automatic lesson start
   */
  async scheduleLessonStart(lessonId: string, startTime: Date) {
    const delay = startTime.getTime() - Date.now();
    
    if (delay > 0) {
      const job = await this.lessonStatusQueue.add(
        'start-lesson',
        {
          lessonId,
          action: 'start_lesson',
          scheduledFor: startTime,
        } as LessonStatusJobData,
        {
          delay,
          attempts: 2,
        }
      );

      this.logger.log(`Scheduled lesson start for lesson ${lessonId}`);
      return job;
    }
  }

  /**
   * Schedule automatic lesson completion
   */
  async scheduleLessonCompletion(lessonId: string, startTime: Date, duration: number) {
    const completionTime = new Date(startTime.getTime() + (duration + 15) * 60 * 1000); // 15 minutes buffer
    const delay = completionTime.getTime() - Date.now();
    
    if (delay > 0) {
      const job = await this.lessonStatusQueue.add(
        'complete-lesson',
        {
          lessonId,
          action: 'complete_lesson',
          scheduledFor: completionTime,
          metadata: { originalDuration: duration },
        } as LessonStatusJobData,
        {
          delay,
          attempts: 2,
        }
      );

      this.logger.log(`Scheduled lesson completion for lesson ${lessonId}`);
      return job;
    }
  }

  /**
   * Schedule lesson reminder notifications
   */
  async scheduleLessonReminders(lessonId: string, startTime: Date) {
    const reminders = [
      { name: '24h-reminder', hours: 24 },
      { name: '1h-reminder', hours: 1 },
      { name: '15m-reminder', minutes: 15 },
    ];

    const jobs = [];

    for (const reminder of reminders) {
      const reminderTime = new Date(startTime);
      if (reminder.hours) {
        reminderTime.setHours(reminderTime.getHours() - reminder.hours);
      } else if (reminder.minutes) {
        reminderTime.setMinutes(reminderTime.getMinutes() - reminder.minutes);
      }

      const delay = reminderTime.getTime() - Date.now();
      
      if (delay > 0) {
        const job = await this.lessonStatusQueue.add(
          'lesson-reminder',
          {
            lessonId,
            action: 'send_reminder',
            scheduledFor: reminderTime,
            metadata: { reminderType: reminder.name, originalStartTime: startTime },
          } as LessonStatusJobData,
          {
            delay,
            attempts: 1,
          }
        );

        jobs.push(job);
        this.logger.log(`Scheduled ${reminder.name} for lesson ${lessonId}`);
      }
    }

    return jobs;
  }

  /**
   * Schedule attendance check
   */
  async scheduleAttendanceCheck(lessonId: string, startTime: Date) {
    const checkTime = new Date(startTime.getTime() + 5 * 60 * 1000); // 5 minutes after start
    const delay = checkTime.getTime() - Date.now();
    
    if (delay > 0) {
      const job = await this.lessonStatusQueue.add(
        'check-attendance',
        {
          lessonId,
          action: 'check_attendance',
          scheduledFor: checkTime,
          metadata: { originalStartTime: startTime },
        } as LessonStatusJobData,
        {
          delay,
          attempts: 1,
        }
      );

      this.logger.log(`Scheduled attendance check for lesson ${lessonId}`);
      return job;
    }
  }

  /**
   * Cancel all scheduled jobs for a specific lesson
   */
  async cancelLessonJobs(lessonId: string) {
    const jobs = await this.lessonStatusQueue.getJobs(['delayed', 'waiting']);
    
    for (const job of jobs) {
      const jobData = job.data as LessonStatusJobData;
      if (jobData.lessonId === lessonId) {
        await job.remove();
        this.logger.log(`Cancelled scheduled job ${job.id} for lesson ${lessonId}`);
      }
    }
  }

  /**
   * Cancel all scheduled jobs for a specific booking
   */
  async cancelBookingLessonJobs(bookingId: string) {
    const jobs = await this.lessonStatusQueue.getJobs(['delayed', 'waiting']);
    
    for (const job of jobs) {
      const jobData = job.data as LessonStatusJobData;
      if (jobData.bookingId === bookingId) {
        await job.remove();
        this.logger.log(`Cancelled scheduled job ${job.id} for booking ${bookingId}`);
      }
    }
  }

  /**
   * Process lesson status jobs
   */
  async processLessonStatusJob(job: any) {
    const data = job.data as LessonStatusJobData;
    const { lessonId, bookingId, action, metadata } = data;

    try {
      this.logger.log(`Processing lesson status job: ${action} for lesson ${lessonId || 'N/A'}, booking ${bookingId || 'N/A'}`);

      switch (action) {
        case 'create_lesson':
          await this.handleCreateLesson(bookingId!, metadata);
          break;
        
        case 'start_lesson':
          await this.handleStartLesson(lessonId!, metadata);
          break;
        
        case 'complete_lesson':
          await this.handleCompleteLesson(lessonId!, metadata);
          break;
        
        case 'send_reminder':
          await this.handleSendReminder(lessonId!, metadata);
          break;
        
        case 'check_attendance':
          await this.handleCheckAttendance(lessonId!, metadata);
          break;
        
        default:
          this.logger.warn(`Unknown lesson action: ${action}`);
      }

      this.logger.log(`Successfully processed lesson status job: ${action}`);
    } catch (error) {
      this.logger.error(`Error processing lesson status job:`, error);
      throw error;
    }
  }

  private async handleCreateLesson(bookingId: string, metadata: any) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { lesson: true },
    });

    if (!booking) {
      this.logger.warn(`Booking ${bookingId} not found, skipping lesson creation`);
      return;
    }

    // Only create lesson if booking is confirmed and no lesson exists yet
    if (booking.status === BookingStatus.CONFIRMED && !booking.lesson) {
      const lesson = await this.prisma.lesson.create({
        data: {
          bookingId: booking.id,
          studentId: booking.studentId,
          teacherId: booking.teacherId,
          courseId: booking.courseId,
          scheduledAt: booking.scheduledAt,
          duration: booking.duration,
          status: LessonStatus.SCHEDULED,
          notes: 'Lesson created automatically from confirmed booking',
        },
      });

      // Schedule subsequent lesson events
      await this.scheduleLessonStart(lesson.id, booking.scheduledAt);
      await this.scheduleLessonCompletion(lesson.id, booking.scheduledAt, booking.duration);
      await this.scheduleLessonReminders(lesson.id, booking.scheduledAt);
      await this.scheduleAttendanceCheck(lesson.id, booking.scheduledAt);

      this.logger.log(`Created lesson ${lesson.id} for booking ${bookingId}`);
    } else {
      this.logger.log(`Booking ${bookingId} is not ready for lesson creation`);
    }
  }

  private async handleStartLesson(lessonId: string, metadata: any) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        booking: true,
        student: { include: { user: true } },
        teacher: { include: { user: true } },
      },
    });

    if (!lesson) {
      this.logger.warn(`Lesson ${lessonId} not found, skipping start`);
      return;
    }

    // Only start if lesson is scheduled
    if (lesson.status === LessonStatus.SCHEDULED) {
      await this.prisma.lesson.update({
        where: { id: lessonId },
        data: {
          status: LessonStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
      });

      // Notify participants that lesson has started
      await this.notifyLessonStarted(lesson);
      
      this.logger.log(`Started lesson ${lessonId}`);
    } else {
      this.logger.log(`Lesson ${lessonId} is not in scheduled status, skipping start`);
    }
  }

  private async handleCompleteLesson(lessonId: string, metadata: any) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        booking: true,
        student: { include: { user: true } },
        teacher: { include: { user: true } },
      },
    });

    if (!lesson) {
      this.logger.warn(`Lesson ${lessonId} not found, skipping completion`);
      return;
    }

    // Only complete if lesson is in progress and hasn't been manually completed
    if (lesson.status === LessonStatus.IN_PROGRESS) {
      const completionTime = new Date();
      
      await this.prisma.lesson.update({
        where: { id: lessonId },
        data: {
          status: LessonStatus.COMPLETED,
          endedAt: completionTime,
          notes: `${lesson.notes || ''}\nAuto-completed after ${metadata.originalDuration} minutes`,
        },
      });

      // Update associated booking
      if (lesson.bookingId) {
        await this.prisma.booking.update({
          where: { id: lesson.bookingId },
          data: {
            status: BookingStatus.COMPLETED,
          },
        });
      }

      // Notify participants and trigger feedback requests
      await this.notifyLessonCompleted(lesson);
      
      this.logger.log(`Auto-completed lesson ${lessonId}`);
    } else {
      this.logger.log(`Lesson ${lessonId} is not in progress, skipping auto-completion`);
    }
  }

  private async handleSendReminder(lessonId: string, metadata: any) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        booking: true,
      },
    });

    if (!lesson) {
      this.logger.warn(`Lesson ${lessonId} not found, skipping reminder`);
      return;
    }

    // Only send reminders for scheduled lessons
    if (lesson.status === LessonStatus.SCHEDULED) {
      const { reminderType } = metadata;
      
      switch (reminderType) {
        case '24h-reminder':
          await this.send24HourReminder(lesson);
          break;
        case '1h-reminder':
          await this.send1HourReminder(lesson);
          break;
        case '15m-reminder':
          await this.send15MinuteReminder(lesson);
          break;
      }
      
      this.logger.log(`Sent ${reminderType} for lesson ${lessonId}`);
    }
  }

  private async handleCheckAttendance(lessonId: string, metadata: any) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        booking: true,
        student: { include: { user: true } },
        teacher: { include: { user: true } },
      },
    });

    if (!lesson) {
      this.logger.warn(`Lesson ${lessonId} not found, skipping attendance check`);
      return;
    }

    // Check if lesson started (status changed from SCHEDULED)
    if (lesson.status === LessonStatus.SCHEDULED) {
      // Neither participant joined - mark as no show
      await this.prisma.lesson.update({
        where: { id: lessonId },
        data: {
          status: LessonStatus.CANCELLED,
          notes: `${lesson.notes || ''}\nMarked as no-show - no participants joined`,
        },
      });

      // Update booking status
      if (lesson.bookingId) {
        await this.prisma.booking.update({
          where: { id: lesson.bookingId },
          data: {
            status: BookingStatus.CANCELLED,
          },
        });
      }

      await this.notifyNoShow(lesson);
      this.logger.log(`Marked lesson ${lessonId} as no-show`);
    } else {
      this.logger.log(`Lesson ${lessonId} has participants, attendance check passed`);
    }
  }

  // Notification helper methods
  private async notifyLessonStarted(lesson: any) {
    this.logger.log(`Sending lesson started notification for lesson ${lesson.id}`);
    // Implementation for lesson started notifications
  }

  private async notifyLessonCompleted(lesson: any) {
    this.logger.log(`Sending lesson completed notification for lesson ${lesson.id}`);
    // Implementation for lesson completed notifications
    // This could trigger feedback requests, payment processing, etc.
  }

  private async send24HourReminder(lesson: any) {
    this.logger.log(`Sending 24-hour reminder for lesson ${lesson.id}`);
    // Implementation for 24-hour reminder
  }

  private async send1HourReminder(lesson: any) {
    this.logger.log(`Sending 1-hour reminder for lesson ${lesson.id}`);
    // Implementation for 1-hour reminder with meeting link
  }

  private async send15MinuteReminder(lesson: any) {
    this.logger.log(`Sending 15-minute reminder for lesson ${lesson.id}`);
    // Implementation for final reminder
  }

  private async notifyNoShow(lesson: any) {
    this.logger.log(`Sending no-show notification for lesson ${lesson.id}`);
    // Implementation for no-show notifications
  }

  /**
   * Get lesson scheduler statistics
   */
  async getSchedulerStats() {
    const waitingJobs = await this.lessonStatusQueue.getJobs(['waiting']);
    const delayedJobs = await this.lessonStatusQueue.getJobs(['delayed']);
    const activeJobs = await this.lessonStatusQueue.getJobs(['active']);
    const completedJobs = await this.lessonStatusQueue.getJobs(['completed'], 0, 10);
    const failedJobs = await this.lessonStatusQueue.getJobs(['failed'], 0, 10);

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
        lessonId: (job.data as LessonStatusJobData).lessonId,
        bookingId: (job.data as LessonStatusJobData).bookingId,
        action: (job.data as LessonStatusJobData).action,
        scheduledFor: (job.data as LessonStatusJobData).scheduledFor,
        delay: job.opts.delay,
      })),
      recentFailures: failedJobs.slice(0, 3).map(job => ({
        id: job.id,
        lessonId: (job.data as LessonStatusJobData).lessonId,
        action: (job.data as LessonStatusJobData).action,
        error: job.failedReason,
        failedAt: job.processedOn,
      })),
    };
  }
}
