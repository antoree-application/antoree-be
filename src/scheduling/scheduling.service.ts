import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { BookingStatus, LessonStatus, UserRole } from '@prisma/client';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run every 5 minutes to check and update booking statuses
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleBookingStatusUpdates() {
    this.logger.log('Running booking status updates...');
    
    try {
      await this.updateExpiredPendingBookings();
      await this.markOverdueBookingsAsNoShow();
      await this.autoConfirmInstantBookings();
      
      this.logger.log('Booking status updates completed successfully');
    } catch (error) {
      this.logger.error('Error during booking status updates:', error);
    }
  }

  /**
   * Run every 2 minutes to check and update lesson statuses
   */
  @Cron('*/2 * * * *')
  async handleLessonStatusUpdates() {
    this.logger.log('Running lesson status updates...');
    
    try {
      await this.startScheduledLessons();
      await this.markOverdueLessonsAsCompleted();
      await this.createLessonsFromConfirmedBookings();
      
      this.logger.log('Lesson status updates completed successfully');
    } catch (error) {
      this.logger.error('Error during lesson status updates:', error);
    }
  }

  /**
   * Run every 10 minutes to send notifications
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleNotifications() {
    this.logger.log('Running notification checks...');
    
    try {
      await this.sendUpcomingLessonReminders();
      await this.sendBookingExpirationWarnings();
      await this.sendTeacherResponseReminders();
      
      this.logger.log('Notification checks completed successfully');
    } catch (error) {
      this.logger.error('Error during notification checks:', error);
    }
  }

  /**
   * Run every hour to perform general maintenance tasks
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleMaintenanceTasks() {
    this.logger.log('Running maintenance tasks...');
    
    try {
      await this.cleanupOldNotifications();
      await this.updateTeacherStatistics();
      await this.updateStudentStatistics();
      
      this.logger.log('Maintenance tasks completed successfully');
    } catch (error) {
      this.logger.error('Error during maintenance tasks:', error);
    }
  }

  /**
   * Booking Status Update Methods
   */

  private async updateExpiredPendingBookings() {
    const expirationTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
    
    const expiredBookings = await this.prisma.booking.updateMany({
      where: {
        status: BookingStatus.PENDING,
        createdAt: {
          lt: expirationTime,
        },
      },
      data: {
        status: BookingStatus.CANCELLED,
        notes: {
          set: 'Automatically cancelled due to no teacher response within 48 hours',
        },
      },
    });

    if (expiredBookings.count > 0) {
      this.logger.log(`Cancelled ${expiredBookings.count} expired pending bookings`);
    }

    return expiredBookings.count;
  }

  private async markOverdueBookingsAsNoShow() {
    const overdueTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    
    const overdueBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        scheduledAt: {
          lt: overdueTime,
        },
        lesson: null, // No lesson was created (no show)
      },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
      },
    });

    for (const booking of overdueBookings) {
      // Create a lesson record marked as no-show
      await this.prisma.lesson.create({
        data: {
          bookingId: booking.id,
          studentId: booking.studentId,
          teacherId: booking.teacherId,
          courseId: booking.courseId,
          scheduledAt: booking.scheduledAt,
          duration: booking.duration,
          status: LessonStatus.CANCELLED,
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

      this.logger.log(`Marked booking ${booking.id} as no-show`);
    }

    return overdueBookings.length;
  }

  private async autoConfirmInstantBookings() {
    const instantBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        teacher: {
          allowInstantBooking: true,
        },
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Within last 5 minutes
        },
      },
      include: {
        teacher: true,
      },
    });

    for (const booking of instantBookings) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CONFIRMED,
          notes: `${booking.notes || ''}\nAuto-confirmed via instant booking`,
        },
      });

      this.logger.log(`Auto-confirmed instant booking ${booking.id}`);
    }

    return instantBookings.length;
  }

  /**
   * Lesson Status Update Methods
   */

  private async startScheduledLessons() {
    const currentTime = new Date();
    const lessonStartWindow = new Date(currentTime.getTime() - 5 * 60 * 1000); // 5 minutes ago
    
    const lessonsToStart = await this.prisma.lesson.updateMany({
      where: {
        status: LessonStatus.SCHEDULED,
        scheduledAt: {
          gte: lessonStartWindow,
          lte: currentTime,
        },
      },
      data: {
        status: LessonStatus.IN_PROGRESS,
        startedAt: currentTime,
      },
    });

    if (lessonsToStart.count > 0) {
      this.logger.log(`Started ${lessonsToStart.count} scheduled lessons`);
    }

    return lessonsToStart.count;
  }

  private async markOverdueLessonsAsCompleted() {
    const overdueTime = new Date();
    
    const overdueLessons = await this.prisma.lesson.findMany({
      where: {
        status: LessonStatus.IN_PROGRESS,
        scheduledAt: {
          lt: new Date(overdueTime.getTime() - 90 * 60 * 1000), // 1.5 hours ago
        },
      },
    });

    for (const lesson of overdueLessons) {
      const lessonEndTime = new Date(lesson.scheduledAt);
      lessonEndTime.setMinutes(lessonEndTime.getMinutes() + lesson.duration);
      
      await this.prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          status: LessonStatus.COMPLETED,
          endedAt: lessonEndTime,
          notes: `${lesson.notes || ''}\nAuto-completed - lesson duration exceeded`,
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

      this.logger.log(`Auto-completed overdue lesson ${lesson.id}`);
    }

    return overdueLessons.length;
  }

  private async createLessonsFromConfirmedBookings() {
    const upcomingBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        lesson: null, // No lesson created yet
        scheduledAt: {
          gte: new Date(), // Future bookings
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // Within next 24 hours
        },
      },
    });

    for (const booking of upcomingBookings) {
      await this.prisma.lesson.create({
        data: {
          bookingId: booking.id,
          studentId: booking.studentId,
          teacherId: booking.teacherId,
          courseId: booking.courseId,
          scheduledAt: booking.scheduledAt,
          duration: booking.duration,
          status: LessonStatus.SCHEDULED,
          notes: 'Lesson created from confirmed booking',
        },
      });

      this.logger.log(`Created lesson for booking ${booking.id}`);
    }

    return upcomingBookings.length;
  }

  /**
   * Notification Methods
   */

  private async sendUpcomingLessonReminders() {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    const fiftyFiveMinutesFromNow = new Date(Date.now() + 55 * 60 * 1000);
    
    const upcomingLessons = await this.prisma.lesson.findMany({
      where: {
        status: LessonStatus.SCHEDULED,
        scheduledAt: {
          gte: fiftyFiveMinutesFromNow,
          lte: oneHourFromNow,
        },
      },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        booking: true,
      },
    });

    for (const lesson of upcomingLessons) {
      // Send reminder to student
      await this.createNotification({
        userId: lesson.student.id,
        type: 'LESSON_REMINDER',
        title: 'Upcoming Lesson Reminder',
        message: `Your lesson with ${lesson.teacher.user.firstName} ${lesson.teacher.user.lastName} starts in 1 hour.`,
        metadata: {
          lessonId: lesson.id,
          bookingId: lesson.bookingId,
          teacherId: lesson.teacherId,
        },
      });

      // Send reminder to teacher
      await this.createNotification({
        userId: lesson.teacher.id,
        type: 'LESSON_REMINDER',
        title: 'Upcoming Lesson Reminder',
        message: `Your lesson with ${lesson.student.user.firstName} ${lesson.student.user.lastName} starts in 1 hour.`,
        metadata: {
          lessonId: lesson.id,
          bookingId: lesson.bookingId,
          studentId: lesson.studentId,
        },
      });

      this.logger.log(`Sent lesson reminders for lesson ${lesson.id}`);
    }

    return upcomingLessons.length;
  }

  private async sendBookingExpirationWarnings() {
    const fortyHoursAgo = new Date(Date.now() - 40 * 60 * 60 * 1000);
    const thirtyEightHoursAgo = new Date(Date.now() - 38 * 60 * 60 * 1000);
    
    const expiringBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        createdAt: {
          gte: fortyHoursAgo,
          lte: thirtyEightHoursAgo,
        },
      },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
      },
    });

    for (const booking of expiringBookings) {
      // Notify student
      await this.createNotification({
        userId: booking.student.id,
        type: 'BOOKING_EXPIRING',
        title: 'Booking Request Expiring Soon',
        message: `Your booking request with ${booking.teacher.user.firstName} ${booking.teacher.user.lastName} will expire in 8 hours if not confirmed.`,
        metadata: {
          bookingId: booking.id,
          teacherId: booking.teacherId,
        },
      });

      // Notify teacher
      await this.createNotification({
        userId: booking.teacher.id,
        type: 'BOOKING_RESPONSE_URGENT',
        title: 'Urgent: Booking Request Expiring',
        message: `Please respond to ${booking.student.user.firstName} ${booking.student.user.lastName}'s booking request. It expires in 8 hours.`,
        metadata: {
          bookingId: booking.id,
          studentId: booking.studentId,
        },
      });

      this.logger.log(`Sent expiration warnings for booking ${booking.id}`);
    }

    return expiringBookings.length;
  }

  private async sendTeacherResponseReminders() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twentyTwoHoursAgo = new Date(Date.now() - 22 * 60 * 60 * 1000);
    
    const pendingBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        createdAt: {
          gte: twentyFourHoursAgo,
          lte: twentyTwoHoursAgo,
        },
      },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
      },
    });

    for (const booking of pendingBookings) {
      await this.createNotification({
        userId: booking.teacher.id,
        type: 'BOOKING_RESPONSE_REMINDER',
        title: 'Booking Request Awaiting Response',
        message: `${booking.student.user.firstName} ${booking.student.user.lastName} is waiting for your response to their booking request.`,
        metadata: {
          bookingId: booking.id,
          studentId: booking.studentId,
        },
      });

      this.logger.log(`Sent response reminder to teacher for booking ${booking.id}`);
    }

    return pendingBookings.length;
  }

  /**
   * Maintenance Methods
   */

  private async cleanupOldNotifications() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // This would clean up a notifications table if it existed
    // For now, we'll just log that this maintenance task ran
    this.logger.log('Cleaned up old notifications (placeholder implementation)');
    
    return 0;
  }

  private async updateTeacherStatistics() {
    const teachers = await this.prisma.teacher.findMany({
      where: {
        status: 'APPROVED',
      },
    });

    for (const teacher of teachers) {
      // Update total lessons count
      const totalLessons = await this.prisma.lesson.count({
        where: {
          teacherId: teacher.id,
          status: LessonStatus.COMPLETED,
        },
      });

      // Update average rating
      const ratingResult = await this.prisma.review.aggregate({
        where: { teacherId: teacher.id },
        _avg: { rating: true },
      });

      await this.prisma.teacher.update({
        where: { id: teacher.id },
        data: {
          totalLessons,
          averageRating: ratingResult._avg.rating,
        },
      });
    }

    this.logger.log(`Updated statistics for ${teachers.length} teachers`);
    return teachers.length;
  }

  private async updateStudentStatistics() {
    // Update student learning progress and statistics
    const students = await this.prisma.student.findMany();

    for (const student of students) {
      const completedLessons = await this.prisma.lesson.count({
        where: {
          studentId: student.id,
          status: LessonStatus.COMPLETED,
        },
      });

      // Calculate total study hours
      const totalDurationResult = await this.prisma.lesson.aggregate({
        where: {
          studentId: student.id,
          status: LessonStatus.COMPLETED,
        },
        _sum: { duration: true },
      });

      const totalHours = (totalDurationResult._sum.duration || 0) / 60;

      // Store these statistics in student notes or a separate table
      // For now, we'll just log the calculation
      this.logger.debug(`Student ${student.id}: ${completedLessons} lessons, ${totalHours} hours`);
    }

    this.logger.log(`Updated statistics for ${students.length} students`);
    return students.length;
  }

  /**
   * Helper Methods
   */

  private async createNotification(notificationData: {
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: any;
  }) {
    // In a real implementation, this would save to a notifications table
    // and send push notifications, emails, etc.
    this.logger.debug(`Creating notification for user ${notificationData.userId}: ${notificationData.title}`);
    
    // For now, we'll create a simple log entry
    // You could integrate with email service, push notification service, etc.
    
    return {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...notificationData,
      createdAt: new Date(),
      isRead: false,
    };
  }

  /**
   * Manual trigger methods for testing and admin use
   */

  async triggerBookingStatusUpdate() {
    this.logger.log('Manually triggering booking status update');
    return this.handleBookingStatusUpdates();
  }

  async triggerLessonStatusUpdate() {
    this.logger.log('Manually triggering lesson status update');
    return this.handleLessonStatusUpdates();
  }

  async triggerNotificationCheck() {
    this.logger.log('Manually triggering notification check');
    return this.handleNotifications();
  }

  async triggerMaintenanceTasks() {
    this.logger.log('Manually triggering maintenance tasks');
    return this.handleMaintenanceTasks();
  }

  /**
   * Get scheduling status and statistics
   */
  async getSchedulingStats() {
    const stats = {
      lastRun: {
        bookingStatusUpdate: new Date(),
        lessonStatusUpdate: new Date(),
        notifications: new Date(),
        maintenance: new Date(),
      },
      counts: {
        pendingBookings: await this.prisma.booking.count({
          where: { status: BookingStatus.PENDING },
        }),
        confirmedBookings: await this.prisma.booking.count({
          where: { status: BookingStatus.CONFIRMED },
        }),
        scheduledLessons: await this.prisma.lesson.count({
          where: { status: LessonStatus.SCHEDULED },
        }),
        inProgressLessons: await this.prisma.lesson.count({
          where: { status: LessonStatus.IN_PROGRESS },
        }),
      },
      upcomingScheduledTasks: {
        nextBookingCheck: 'Every 5 minutes',
        nextLessonCheck: 'Every 2 minutes',
        nextNotificationCheck: 'Every 10 minutes',
        nextMaintenanceRun: 'Every hour',
      },
    };

    return stats;
  }
}
