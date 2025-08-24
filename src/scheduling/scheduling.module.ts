import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { 
  BookingStatusProcessor, 
  LessonStatusProcessor, 
  NotificationProcessor 
} from './processors';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from './scheduling.service';
import { BookingStatusScheduler } from './booking-status.scheduler';
import { LessonStatusScheduler } from './lesson-status.scheduler';
import { NotificationScheduler } from './notification.scheduler';
import { SchedulingIntegrationService } from './scheduling-integration.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    BullModule.registerQueue({
      name: 'booking-status-queue',
    }),
    BullModule.registerQueue({
      name: 'lesson-status-queue',
    }),
    BullModule.registerQueue({
      name: 'notification-queue',
    }),
  ],
  controllers: [SchedulingController],
  providers: [
    SchedulingService,
    BookingStatusScheduler,
    LessonStatusScheduler,
    NotificationScheduler,
    SchedulingIntegrationService,
    BookingStatusProcessor,
    LessonStatusProcessor,
    NotificationProcessor,
  ],
  exports: [
    SchedulingService,
    BookingStatusScheduler,
    LessonStatusScheduler,
    NotificationScheduler,
    SchedulingIntegrationService,
  ],
})
export class SchedulingModule {}
