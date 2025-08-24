import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TeacherAvailabilityController } from './teacher-availability.controller';
import { TeacherAvailabilityService } from './teacher-availability.service';

@Module({
  imports: [PrismaModule],
  controllers: [TeacherAvailabilityController],
  providers: [TeacherAvailabilityService],
  exports: [TeacherAvailabilityService],
})
export class TeacherAvailabilityModule {}
