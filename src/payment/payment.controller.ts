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

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService, 
    private readonly momoService: MomoService
  ) {}

  @Post('simple/course')
  @Public() // Allow guest access for simple course payment
  @ApiOperation({ 
    summary: 'Simple course payment - supports MoMo Wallet, ATM Card, and QR Code scanning',
    description: 'Student provides courseId and info, gets payment URL. Supports multiple MoMo payment methods: E-wallet (captureWallet), ATM/Debit card (payWithATM), or QR code scanning (payWithCC).'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Simple course payment URL created successfully',
    type: SimpleCoursePaymentVm,
  })
  @ResponseMessage('Simple course payment URL created successfully')
  @HttpCode(HttpStatus.CREATED)
  async createSimpleCoursePayment(
    @Body() simpleCoursePaymentDto: SimpleCoursePaymentDto,
    @Req() req: Request,
  ): Promise<SimpleCoursePaymentVm> {
    const userAgent = req.get('User-Agent');
    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
    
    return this.paymentService.createSimpleCoursePayment(
      simpleCoursePaymentDto,
      ipAddress,
      userAgent,
    );
  }

  @Get('cache/stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get payment cache statistics (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache statistics retrieved successfully',
  })
  @ResponseMessage('Cache statistics retrieved successfully')
  async getCacheStats() {
    return this.paymentService.getCacheStats();
  }

  @Delete('cache/clear/:type')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Clear cache by type (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache cleared successfully',
  })
  @ResponseMessage('Cache cleared successfully')
  async clearCacheByType(
    @Param('type') type: 'payment' | 'course' | 'student' | 'teacher',
  ): Promise<{ message: string; cleared: boolean }> {
    try {
      await this.paymentService.clearCacheByType(type);
      return {
        message: `${type} cache cleared successfully`,
        cleared: true,
      };
    } catch (error) {
      return {
        message: `Failed to clear ${type} cache: ${error.message}`,
        cleared: false,
      };
    }
  }
}
