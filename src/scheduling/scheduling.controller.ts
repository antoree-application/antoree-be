import { Controller, Get, Post, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulingService } from './scheduling.service';
import { BookingStatusScheduler } from './booking-status.scheduler';
import { LessonStatusScheduler } from './lesson-status.scheduler';
import { NotificationScheduler } from './notification.scheduler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/role.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../roles/role.enum';

@ApiTags('Scheduling')
@Controller('scheduling')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class SchedulingController {
  constructor(
    private readonly schedulingService: SchedulingService,
    private readonly bookingStatusScheduler: BookingStatusScheduler,
    private readonly lessonStatusScheduler: LessonStatusScheduler,
    private readonly notificationScheduler: NotificationScheduler,
  ) {}

  @Get('status')
  @ApiOperation({ 
    summary: 'Get scheduling system status',
    description: 'Get overall status and statistics of the scheduling system'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduling system status retrieved successfully',
  })
  async getSchedulingStatus() {
    const [
      schedulingStats,
      bookingSchedulerStats,
      lessonSchedulerStats,
      notificationSchedulerStats,
    ] = await Promise.all([
      this.schedulingService.getSchedulingStats(),
      this.bookingStatusScheduler.getSchedulerStats(),
      this.lessonStatusScheduler.getSchedulerStats(),
      this.notificationScheduler.getSchedulerStats(),
    ]);

    return {
      systemStatus: 'active',
      lastHealthCheck: new Date().toISOString(),
      scheduling: schedulingStats,
      bookingScheduler: bookingSchedulerStats,
      lessonScheduler: lessonSchedulerStats,
      notificationScheduler: notificationSchedulerStats,
      summary: {
        totalPendingJobs: 
          bookingSchedulerStats.queueStats.waiting + 
          bookingSchedulerStats.queueStats.delayed +
          lessonSchedulerStats.queueStats.waiting + 
          lessonSchedulerStats.queueStats.delayed +
          notificationSchedulerStats.queueStats.waiting + 
          notificationSchedulerStats.queueStats.delayed,
        totalActiveJobs:
          bookingSchedulerStats.queueStats.active +
          lessonSchedulerStats.queueStats.active +
          notificationSchedulerStats.queueStats.active,
        totalFailedJobs:
          bookingSchedulerStats.queueStats.failed +
          lessonSchedulerStats.queueStats.failed +
          notificationSchedulerStats.queueStats.failed,
      },
    };
  }

  @Post('trigger/booking-status-update')
  @ApiOperation({ 
    summary: 'Manually trigger booking status update',
    description: 'Force run the booking status update process'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking status update triggered successfully',
  })
  async triggerBookingStatusUpdate() {
    await this.schedulingService.triggerBookingStatusUpdate();
    return {
      success: true,
      message: 'Booking status update triggered successfully',
      triggeredAt: new Date().toISOString(),
    };
  }

  @Post('trigger/lesson-status-update')
  @ApiOperation({ 
    summary: 'Manually trigger lesson status update',
    description: 'Force run the lesson status update process'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lesson status update triggered successfully',
  })
  async triggerLessonStatusUpdate() {
    await this.schedulingService.triggerLessonStatusUpdate();
    return {
      success: true,
      message: 'Lesson status update triggered successfully',
      triggeredAt: new Date().toISOString(),
    };
  }

  @Post('trigger/notifications')
  @ApiOperation({ 
    summary: 'Manually trigger notification check',
    description: 'Force run the notification check process'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification check triggered successfully',
  })
  async triggerNotificationCheck() {
    await this.schedulingService.triggerNotificationCheck();
    return {
      success: true,
      message: 'Notification check triggered successfully',
      triggeredAt: new Date().toISOString(),
    };
  }

  @Post('trigger/maintenance')
  @ApiOperation({ 
    summary: 'Manually trigger maintenance tasks',
    description: 'Force run the maintenance tasks process'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Maintenance tasks triggered successfully',
  })
  async triggerMaintenanceTasks() {
    await this.schedulingService.triggerMaintenanceTasks();
    return {
      success: true,
      message: 'Maintenance tasks triggered successfully',
      triggeredAt: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Health check for scheduling system',
    description: 'Check if all scheduling components are working correctly'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduling system health status',
  })
  async healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        cronJobs: 'active',
        queueProcessors: 'active',
        database: 'connected',
      },
      version: '1.0.0',
    };

    try {
      // Test database connection
      await this.schedulingService.getSchedulingStats();
      health.checks.database = 'connected';
      
      // Test queue connections
      await Promise.all([
        this.bookingStatusScheduler.getSchedulerStats(),
        this.lessonStatusScheduler.getSchedulerStats(),
        this.notificationScheduler.getSchedulerStats(),
      ]);
      health.checks.queueProcessors = 'active';
      
    } catch (error) {
      health.status = 'unhealthy';
      health.checks.database = 'error';
      health['error'] = error.message;
    }

    return health;
  }

  @Get('jobs/upcoming')
  @ApiOperation({ 
    summary: 'Get upcoming scheduled jobs',
    description: 'Get list of upcoming scheduled jobs across all queues'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Upcoming jobs retrieved successfully',
  })
  async getUpcomingJobs() {
    const [
      bookingJobs,
      lessonJobs,
      notificationJobs,
    ] = await Promise.all([
      this.bookingStatusScheduler.getSchedulerStats(),
      this.lessonStatusScheduler.getSchedulerStats(),
      this.notificationScheduler.getSchedulerStats(),
    ]);

    const allUpcomingJobs = [
      ...bookingJobs.upcomingJobs.map(job => ({ ...job, queue: 'booking-status' })),
      ...lessonJobs.upcomingJobs.map(job => ({ ...job, queue: 'lesson-status' })),
      ...notificationJobs.upcomingNotifications.map(job => ({ ...job, queue: 'notifications' })),
    ];

    // Sort by scheduled time
    allUpcomingJobs.sort((a, b) => 
      new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    );

    return {
      totalJobs: allUpcomingJobs.length,
      jobs: allUpcomingJobs.slice(0, 20), // Return first 20 jobs
      summary: {
        bookingJobs: bookingJobs.upcomingJobs.length,
        lessonJobs: lessonJobs.upcomingJobs.length,
        notificationJobs: notificationJobs.upcomingNotifications.length,
      },
    };
  }

  @Get('jobs/failed')
  @ApiOperation({ 
    summary: 'Get recent failed jobs',
    description: 'Get list of recent failed jobs for debugging'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Failed jobs retrieved successfully',
  })
  async getFailedJobs() {
    const [
      bookingJobs,
      lessonJobs,
      notificationJobs,
    ] = await Promise.all([
      this.bookingStatusScheduler.getSchedulerStats(),
      this.lessonStatusScheduler.getSchedulerStats(),
      this.notificationScheduler.getSchedulerStats(),
    ]);

    const allFailedJobs = [
      ...bookingJobs.recentFailures.map(job => ({ ...job, queue: 'booking-status' })),
      ...lessonJobs.recentFailures.map(job => ({ ...job, queue: 'lesson-status' })),
      ...notificationJobs.recentFailures.map(job => ({ ...job, queue: 'notifications' })),
    ];

    // Sort by failed time (most recent first)
    allFailedJobs.sort((a, b) => 
      new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime()
    );

    return {
      totalFailures: allFailedJobs.length,
      failures: allFailedJobs,
      summary: {
        bookingFailures: bookingJobs.recentFailures.length,
        lessonFailures: lessonJobs.recentFailures.length,
        notificationFailures: notificationJobs.recentFailures.length,
      },
    };
  }
}
