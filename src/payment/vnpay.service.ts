import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import * as qs from 'qs';
import { ignoreLogger, VNPay } from 'vnpay';
import { ProductCode, HashAlgorithm, VnpLocale } from 'vnpay';
import { VNP_VERSION, PAYMENT_ENDPOINT } from 'vnpay';
import { resolveUrlString, dateFormat } from 'vnpay';
import type { VNPayConfig, BuildPaymentUrl, Bank } from 'vnpay';

 

export interface VnpayConfig {
  tmnCode: string;
  secretKey: string;
  vnpUrl: string;
  returnUrl: string;
  version: string;
  currCode: string;
}

export interface VnpayPaymentRequest {
  amount: number;
  orderId: string;
  orderInfo: string;
  returnUrl?: string;
  ipAddr: string;
  bankCode?: string;
  locale?: string;
}

export interface VnpayPaymentResponse {
  paymentUrl: string;
}

export interface VnpayReturnData {
  vnp_Amount: string;
  vnp_BankCode: string;
  vnp_BankTranNo: string;
  vnp_CardType: string;
  vnp_OrderInfo: string;
  vnp_PayDate: string;
  vnp_ResponseCode: string;
  vnp_TmnCode: string;
  vnp_TransactionNo: string;
  vnp_TransactionStatus: string;
  vnp_TxnRef: string;
  vnp_SecureHash: string;
}

@Injectable()
export class VNpayService {
  private readonly config: VnpayConfig;
  private readonly vnpay: VNPay;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      tmnCode: configService.getOrThrow<string>('VNPAY_TMN_CODE'),
      secretKey: configService.getOrThrow<string>('VNPAY_SECRET_KEY'),
      vnpUrl: configService.get('VNPAY_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
      returnUrl: configService.get('VNPAY_RETURN_URL', 'http://localhost:8080/payment/webhook/vnpay/return'),
      version: '2.1.0',
      currCode: 'VND',
    };

    // Initialize VNPay instance
    this.vnpay = new VNPay({
      tmnCode: this.config.tmnCode,
      secureSecret: this.config.secretKey,
      testMode: process.env.NODE_ENV !== 'production', // Use test mode in non-production
      hashAlgorithm: HashAlgorithm.SHA512,
    });

    // Validate configuration
    if (!this.config.tmnCode || this.config.tmnCode === 'DEMO123') {
      console.warn(
        '⚠️  VNPAY_TMN_CODE not set or using demo value. Please register with VNPay to get valid credentials.',
      );
    }
    if (!this.config.secretKey || this.config.secretKey === 'DEMOSECRETKEY') {
      console.warn(
        '⚠️  VNPAY_SECRET_KEY not set or using demo value. Please register with VNPay to get valid credentials.',
      );
    }

    // Validate return URL domain for sandbox
    if (
      this.config.returnUrl.includes('localhost') &&
      !this.config.returnUrl.includes('127.0.0.1')
    ) {
      console.warn(
        '⚠️  Using localhost in return URL may cause "Website chưa được phê duyệt" error. Consider using 127.0.0.1 instead.',
      );
    }

    console.log('✅ VNPAY Service initialized with config:', {
      tmnCode: this.config.tmnCode,
      vnpUrl: this.config.vnpUrl,
      returnUrl: this.config.returnUrl,
      version: this.config.version,
    });
  }

  hexToUint8Array(hexString: string): Uint8Array {
    if (hexString.length % 2 !== 0) {
      throw new Error('Invalid hex string length');
    }

    const byteArray = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < byteArray.length; i++) {
      byteArray[i] = parseInt(hexString.slice(i * 2, i * 2 + 2), 16);
    }
    return byteArray;
  }
  // calculateSecureHash(
  //   data: string,
  //   secureSecret: string,
  //   hashAlgorithm: HashAlgorithm = HashAlgorithm.SHA512,
  // ): string {
  //   return this.hash(secureSecret, this.hexToUint8Array(data), hashAlgorithm);
  // }
  hash(
    secret: string,
    data: crypto.BinaryLike,
    algorithm: 'SHA256' | 'SHA512' | 'MD5' = 'SHA256',
  ): string {
    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
  }

  /**
   * Sort object keys alphabetically (following VNPay reference pattern)
   */
  private sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const str = [];
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        str.push(key);
      }
    }
    str.sort();
    for (let i = 0; i < str.length; i++) {
      sorted[str[i]] = obj[str[i]];
    }
    return sorted;
  }

  /**
   * Create VNPAY payment URL using nestjs-vnpay service
   * @param paymentRequest Payment request data
   * @returns Payment URL response
   */
  createPaymentUrl(paymentRequest: VnpayPaymentRequest): VnpayPaymentResponse {
    // Validate input parameters
    if (
      !paymentRequest.orderId ||
      !paymentRequest.orderInfo ||
      !paymentRequest.amount
    ) {
      throw new Error('Missing required payment parameters');
    }

    // Validate amount
    if (!this.validateAmount(paymentRequest.amount)) {
      throw new Error(
        'Payment amount is outside VNPAY limits (10,000 - 500,000,000 VND)',
      );
    }

    // Ensure orderInfo is properly formatted and not too long
    const orderInfo =
      paymentRequest.orderInfo.length > 255
        ? paymentRequest.orderInfo.substring(0, 252) + '...'
        : paymentRequest.orderInfo;

    // Build BuildPaymentUrl object for nestjs-vnpay
    const paymentData: BuildPaymentUrl = {
      vnp_Amount: paymentRequest.amount * 100, // VNPAY requires amount in VND cents
      vnp_OrderInfo: orderInfo,
      vnp_TxnRef: paymentRequest.orderId,
      vnp_IpAddr: paymentRequest.ipAddr,
      vnp_ReturnUrl: paymentRequest.returnUrl || this.config.returnUrl,
      vnp_Locale: (paymentRequest.locale || 'vn') === 'vn' ? VnpLocale.VN : VnpLocale.EN,
      vnp_OrderType: ProductCode.Other,
    };

    // Add optional bank code if provided
    if (paymentRequest.bankCode && paymentRequest.bankCode !== '') {
      paymentData.vnp_BankCode = paymentRequest.bankCode;
    }

    // Generate payment URL using vnpay library
    const paymentUrl = this.vnpay.buildPaymentUrl(paymentData);

    // Log for debugging (remove in production)
    console.log('VNPAY Payment Data:', paymentData);
    console.log('VNPAY Payment URL:', paymentUrl);

    return {
      paymentUrl,
    };
  }

  /**
   * Verify VNPAY return data
   */
  verifyReturnData(returnData: any): boolean {
    const { vnp_SecureHash, vnp_SecureHashType, ...params } = returnData;

    // Sort parameters using sortObject function (following the reference pattern)
    const sortedParams = this.sortObject(params);

    // Create signature using qs.stringify with encode: false (following reference pattern)
    const signData = qs.stringify(sortedParams, { encode: false });

    // Create HMAC signature
    const hmac = crypto.createHmac('sha512', this.config.secretKey);
    const secureHash = hmac.update(signData, 'utf-8').digest('hex');

    console.log('Verify Return Data:');
    console.log('Original hash:', vnp_SecureHash);
    console.log('Calculated hash:', secureHash);
    console.log('Sign data:', signData);
    console.log('Params:', params);

    return secureHash === vnp_SecureHash;
  }

  /**
   * Check if payment is successful
   */
  isPaymentSuccess(returnData: any): boolean {
    return (
      returnData.vnp_ResponseCode === '00' &&
      returnData.vnp_TransactionStatus === '00'
    );
  }

  /**
   * Get transaction info from return data
   */
  getTransactionInfo(returnData: any) {
    return {
      orderId: returnData.vnp_TxnRef,
      amount: parseInt(returnData.vnp_Amount) / 100, // Convert back from cents
      transactionId: returnData.vnp_TransactionNo,
      bankCode: returnData.vnp_BankCode,
      bankTranNo: returnData.vnp_BankTranNo,
      cardType: returnData.vnp_CardType,
      payDate: returnData.vnp_PayDate,
      orderInfo: returnData.vnp_OrderInfo,
      responseCode: returnData.vnp_ResponseCode,
      transactionStatus: returnData.vnp_TransactionStatus,
      isSuccess: this.isPaymentSuccess(returnData),
    };
  }

  /**
   * Get error message by response code
   */
  getErrorMessage(responseCode: string): string {
    const errorMessages: Record<string, string> = {
      '00': 'Giao dịch thành công',
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
      '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
      '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
      '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
      '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
      '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch.',
      '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
      '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
      '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
      '75': 'Ngân hàng thanh toán đang bảo trì.',
      '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định. Xin quý khách vui lòng thực hiện lại giao dịch',
      '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)',
    };

    return errorMessages[responseCode] || 'Lỗi không xác định';
  }

  /**
   * Format date for VNPAY (yyyyMMddHHmmss)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Generate unique order ID
   */
  generateOrderId(prefix: string = 'ORDER'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Validate payment amount`
   */
  validateAmount(amount: number): boolean {
    // VNPAY limits: 10,000 VND - 500,000,000 VND
    return amount >= 10000 && amount <= 500000000;
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }
}
