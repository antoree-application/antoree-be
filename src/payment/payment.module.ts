import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../common/prisma/prisma.module';
import { BookingModule } from '../booking/booking.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { PaymentService } from './payment.service';
import { MomoService } from './momo.service';
import { PaymentCacheService } from './cache.service';
import { PaymentProcessor } from './processors/payment.processor';
import { PaymentController } from './payment.controller';
import { PaymentPublicController } from './payment-public.controller';

@Module({
  imports: [
    PrismaModule, 
    BookingModule,
    EnrollmentModule,
    BullModule.registerQueue({
      name: 'payment-processing',
    }),
  ],
  controllers: [PaymentController, PaymentPublicController],
  providers: [
    PaymentService, 
    MomoService, 
    PaymentCacheService,
    PaymentProcessor,
  ],
  exports: [
    PaymentService, 
    MomoService, 
    PaymentCacheService,
  ],
})
export class PaymentModule {}
