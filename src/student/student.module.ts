import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { TeacherService } from '../teacher/teacher.service';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [StudentController],
  providers: [StudentService, TeacherService, PrismaService],
  exports: [StudentService],
})
export class StudentModule {}
