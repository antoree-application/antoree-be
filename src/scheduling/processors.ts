import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { BookingStatusScheduler, BookingStatusJobData } from './booking-status.scheduler';
import { LessonStatusScheduler, LessonStatusJobData } from './lesson-status.scheduler';
import { NotificationScheduler, NotificationJobData } from './notification.scheduler';

@Processor('booking-status-queue')
export class BookingStatusProcessor {
  private readonly logger = new Logger(BookingStatusProcessor.name);

  constructor(private readonly bookingStatusScheduler: BookingStatusScheduler) {}

  @Process('auto-cancel-booking')
  async handleAutoCancelBooking(job: Job<BookingStatusJobData>) {
    this.logger.log(`Processing auto-cancel-booking job ${job.id}`);
    return this.bookingStatusScheduler.processBookingStatusJob(job);
  }

  @Process('auto-confirm-booking')
  async handleAutoConfirmBooking(job: Job<BookingStatusJobData>) {
    this.logger.log(`Processing auto-confirm-booking job ${job.id}`);
    return this.bookingStatusScheduler.processBookingStatusJob(job);
  }

  @Process('teacher-response-reminder')
  async handleTeacherResponseReminder(job: Job<BookingStatusJobData>) {
    this.logger.log(`Processing teacher-response-reminder job ${job.id}`);
    return this.bookingStatusScheduler.processBookingStatusJob(job);
  }

  @Process('check-no-show')
  async handleCheckNoShow(job: Job<BookingStatusJobData>) {
    this.logger.log(`Processing check-no-show job ${job.id}`);
    return this.bookingStatusScheduler.processBookingStatusJob(job);
  }
}

@Processor('lesson-status-queue')
export class LessonStatusProcessor {
  private readonly logger = new Logger(LessonStatusProcessor.name);

  constructor(private readonly lessonStatusScheduler: LessonStatusScheduler) {}

  @Process('create-lesson')
  async handleCreateLesson(job: Job<LessonStatusJobData>) {
    this.logger.log(`Processing create-lesson job ${job.id}`);
    return this.lessonStatusScheduler.processLessonStatusJob(job);
  }

  @Process('start-lesson')
  async handleStartLesson(job: Job<LessonStatusJobData>) {
    this.logger.log(`Processing start-lesson job ${job.id}`);
    return this.lessonStatusScheduler.processLessonStatusJob(job);
  }

  @Process('complete-lesson')
  async handleCompleteLesson(job: Job<LessonStatusJobData>) {
    this.logger.log(`Processing complete-lesson job ${job.id}`);
    return this.lessonStatusScheduler.processLessonStatusJob(job);
  }

  @Process('lesson-reminder')
  async handleLessonReminder(job: Job<LessonStatusJobData>) {
    this.logger.log(`Processing lesson-reminder job ${job.id}`);
    return this.lessonStatusScheduler.processLessonStatusJob(job);
  }

  @Process('check-attendance')
  async handleCheckAttendance(job: Job<LessonStatusJobData>) {
    this.logger.log(`Processing check-attendance job ${job.id}`);
    return this.lessonStatusScheduler.processLessonStatusJob(job);
  }
}

@Processor('notification-queue')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationScheduler: NotificationScheduler) {}

  @Process('send-notification')
  async handleSendNotification(job: Job<NotificationJobData>) {
    this.logger.log(`Processing send-notification job ${job.id}`);
    return this.notificationScheduler.processNotificationJob(job);
  }
}
