import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

// Core modules
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Feature modules
import { AuthModule } from './auth/auth.module.new';
import { AdminModule } from './admin/admin.module';
import { UsersModule } from './users/users.module';
import { TeacherModule } from './teacher/teacher.module';
import { TeacherAvailabilityModule } from './teacherAvailability/teacher-availability.module';
import { BookingModule } from './booking/booking.module';
import { StudentModule } from './student/student.module';
import { ReviewModule } from './review/review.module';
import { PaymentModule } from './payment/payment.module';
import { CourseModule } from './course/course.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { LessonModule } from './lesson';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Bull/Redis for background jobs
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get('REDIS_PORT', '6379')),
          password: configService.get('REDIS_PASSWORD', 'mypassword'),
          retryStrategy: (times: number) => Math.min(times * 50, 2000),
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          connectTimeout: 10000,
        },
      }),
      inject: [ConfigService],
    }),

    // Database and Cache
    PrismaModule,
    // RedisModule.forRootAsync({
    //   imports: [ConfigModule],
    //   useFactory: (configService: ConfigService) => ({
    //     type: 'single',
    //     options: {
    //       host: configService.get('REDIS_HOST', 'localhost'),
    //       port: parseInt(configService.get('REDIS_PORT', '6379')),
    //       password: configService.get('REDIS_PASSWORD', 'mypassword'),
    //       retryStrategy: (times: number) => Math.min(times * 50, 2000),
    //       maxRetriesPerRequest: 3,
    //       lazyConnect: true,
    //       connectTimeout: 10000,
    //     },
    //   }),
    //   inject: [ConfigService],
    // }),

    // Feature modules
    UsersModule,
    AuthModule,
    AdminModule,
    TeacherModule,
    TeacherAvailabilityModule,
    BookingModule,
    StudentModule,
    ReviewModule,
    PaymentModule,
    LessonModule,
    CourseModule,
    EnrollmentModule,
    SchedulingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
