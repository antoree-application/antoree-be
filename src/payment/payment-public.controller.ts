import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { MomoService } from './momo.service';
import {
  SimpleCoursePaymentDto,
} from './dto';
import { MomoPaymentMethod } from './dto/simple-course-payment.dto';
import {
  SimpleCoursePaymentVm,
  PaymentResultVm,
} from './vm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/role.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { ResponseMessage } from '../decorators/response-message.decorator';
import { Role } from '../roles/role.enum';

@Public()
@ApiTags('Payments-Public')
@Controller('payments')
export class PaymentPublicController {
  constructor(
    private readonly paymentService: PaymentService, 
    private readonly momoService: MomoService
  ) {}

  @Public()
  @Get('webhook/momo')
  @ApiOperation({ summary: 'MoMo webhook for payment success notification' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  async handleMomoWebhook(
    @Body() body: any,
    @Query() query: any,
  ): Promise<{ RspCode: string; Message: string }> {
    try {
      const callbackData = { ...body, ...query };
      await this.paymentService.handleMomoWebhook(callbackData);
      
      return {
        RspCode: '00',
        Message: 'Confirm Success',
      };
    } catch (error) {
      console.error('MoMo webhook error:', error);
      return {
        RspCode: '01',
        Message: 'Confirm Fail',
      };
    }
  }

  @Public()
  @Get('webhook/momo/return')
  @ApiOperation({ summary: 'MoMo return URL handler' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment return processed successfully',
  })
  async handleMomoReturn(
    @Query() query: any,
    @Res() res: Response,
  ): Promise<void> {
    try {
      console.log('🔄 Processing MoMo return callback:', query);
      
      const result = await this.paymentService.handleMomoReturn(query);
      
      console.log('✅ MoMo return processed:', {
        success: result.success,
        paymentId: result.paymentId,
        orderId: result.orderId,
      });
      
      if (result.success) {
        // Redirect to success page with payment details
        const successUrl = `http://localhost:3000/payment/success?` +
          `paymentId=${result.paymentId}&` +
          `orderId=${result.orderId}&` +
          `amount=${result.amount}&` +
          `status=completed`;
        
        console.log('🎉 Payment successful, redirecting to:', successUrl);
        res.redirect(successUrl);
      } else {
        // Redirect to failure page with error details
        const failureUrl = `http://localhost:3000/payment/failed?` +
          `paymentId=${result.paymentId}&` +
          `orderId=${result.orderId}&` +
          `error=${encodeURIComponent(result.errorMessage || 'Payment failed')}&` +
          `status=failed`;
        
        console.log('❌ Payment failed, redirecting to:', failureUrl);
        res.redirect(failureUrl);
      }
    } catch (error) {
      console.error('💥 MoMo return processing error:', error);
      
      const errorUrl = `http://localhost:3000/payment/failed?` +
        `error=${encodeURIComponent('Payment processing error')}&` +
        `details=${encodeURIComponent(error.message)}&` +
        `status=error`;
      
      res.redirect(errorUrl);
    }
  }

  @Post('momo/ipn')
  @Public()
  @ApiOperation({ summary: 'Handle MoMo IPN (Instant Payment Notification)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'IPN processed successfully',
  })
  async handleMomoIpn(
    @Body() body: any,
    @Query() query: any,
  ): Promise<{ RspCode: string; Message: string }> {
    try {
      const callbackData = { ...body, ...query };
      await this.paymentService.handleMomoCallback(callbackData);
      
      return {
        RspCode: '00',
        Message: 'Confirm Success',
      };
    } catch (error) {
      console.error('MoMo IPN error:', error);
      return {
        RspCode: '01',
        Message: 'Confirm Fail',
      };
    }
  }

  @Get('methods')
  @Public()
  @ApiOperation({ summary: 'Get available payment methods' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment methods retrieved successfully',
  })
  @ResponseMessage('Payment methods retrieved successfully')
  async getPaymentMethods(): Promise<any> {
    return [
      {
        id: 'momo_wallet',
        method: 'captureWallet',
        name: 'MoMo E-Wallet',
        description: 'Pay with MoMo e-wallet using your phone',
        logo: 'https://developers.momo.vn/v3/assets/images/square-logo.svg',
        enabled: true,
        minAmount: 1000,
        maxAmount: 20000000,
        currency: 'VND',
        features: ['instant', 'secure', 'mobile'],
      },
      {
        id: 'momo_atm',
        method: 'payWithATM',
        name: 'ATM Card',
        description: 'Pay with your ATM/Debit card via MoMo',
        logo: 'https://developers.momo.vn/v3/assets/images/square-logo.svg',
        enabled: true,
        minAmount: 1000,
        maxAmount: 20000000,
        currency: 'VND',
        features: ['secure', 'bank_card'],
      },
      {
        id: 'momo_qr',
        method: 'payWithCC',
        name: 'QR Code Scan',
        description: 'Scan QR code with MoMo app or banking app',
        logo: 'https://developers.momo.vn/v3/assets/images/square-logo.svg',
        enabled: true,
        minAmount: 1000,
        maxAmount: 20000000,
        currency: 'VND',
        features: ['qr_scan', 'mobile', 'universal'],
      },
    ];
  }
}
