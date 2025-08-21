import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { TrialLessonFlowService } from './trial-lesson-flow.service';
import { NotificationService } from './notification.service';
import { BookingController } from './booking.controller';
import { LessonPackageLifecycleController } from './lesson-package-lifecycle.controller';
import { LessonPackageLifecycleService } from './lesson-package-lifecycle.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ReviewModule } from '../review/review.module';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [PrismaModule, ReviewModule, SchedulingModule],
  controllers: [BookingController, LessonPackageLifecycleController],
  providers: [BookingService, TrialLessonFlowService, NotificationService, LessonPackageLifecycleService],
  exports: [BookingService, TrialLessonFlowService, NotificationService, LessonPackageLifecycleService],
})
export class BookingModule {}
