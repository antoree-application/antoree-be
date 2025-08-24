import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';
import { IsNumber } from 'class-validator';

export interface MomoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  endpoint: string;
  returnUrl: string;
  notifyUrl: string;
  requestType: string;
}

export interface MomoPaymentRequest {
  amount: number;
  orderId: string;
  orderInfo: string;
  returnUrl?: string;
  notifyUrl?: string;
  extraData?: string;
  requestType?: string;
  signature?: string;
}

export interface MomoPaymentResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  responseTime: number;
  message: string;
  resultCode: number;
  payUrl: string;
  deeplink?: string;
  qrCodeUrl?: string;
}

export interface MomoCallbackData {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: number;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number;
  extraData: string;
  signature: string;
}

@Injectable()
export class MomoService {
  private readonly config: MomoConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      partnerCode: configService.get('MOMO_PARTNER_CODE', 'MOMO'),
      accessKey: configService.get('MOMO_ACCESS_KEY', 'F8BBA842ECF85'),
      secretKey: configService.get(
        'MOMO_SECRET_KEY',
        'K951B6PE1waDMi640xX08PD3vg6EkVlz',
      ),
      endpoint: configService.get(
        'MOMO_ENDPOINT',
        'https://test-payment.momo.vn/v2/gateway/api/create',
      ),
      returnUrl: configService.get(
        'MOMO_RETURN_URL',
        'http://localhost:8080/api/payments/webhook/momo/return',
      ),
      notifyUrl: configService.get(
        'MOMO_NOTIFY_URL',
        'http://127.0.0.1:8080/payments/webhook/momo',
      ),
      requestType: 'captureWallet', // Changed to match MoMo.js
    };

    // Validate configuration
    if (!this.config.partnerCode) {
      throw new Error('MOMO_PARTNER_CODE is required');
    }
    if (!this.config.accessKey) {
      throw new Error('MOMO_ACCESS_KEY is required');
    }
    if (!this.config.secretKey) {
      throw new Error('MOMO_SECRET_KEY is required');
    }

    console.log('✅ MoMo Service initialized with config:', {
      partnerCode: this.config.partnerCode,
      accessKey: this.config.accessKey.substring(0, 5) + '...',
      endpoint: this.config.endpoint,
      returnUrl: this.config.returnUrl,
      notifyUrl: this.config.notifyUrl,
      requestType: this.config.requestType,
    });
  }

  /**
   * Create MoMo payment URL following MoMo.js structure
   * @param paymentRequest Payment request data
   * @param paymentMethod Payment method type (captureWallet, payWithATM, payWithCC)
   * @returns Payment URL response
   */
  async createPaymentUrl(
    paymentRequest: MomoPaymentRequest,
    paymentMethod: string = 'captureWallet',
  ): Promise<{ paymentUrl: string; qrCodeUrl?: string; deeplink?: string }> {
    // Validate input parameters
    if (
      !paymentRequest.orderId ||
      !paymentRequest.orderInfo ||
      !paymentRequest.amount
    ) {
      throw new Error('Missing required payment parameters');
    }

    // Validate amount (MoMo limits: 1,000 VND - 20,000,000 VND per transaction)
    if (!this.validateAmount(paymentRequest.amount)) {
      throw new Error('Amount must be between 1,000 VND and 20,000,000 VND');
    }

    // Generate requestId following MoMo.js pattern: partnerCode + timestamp
    const requestId = this.config.partnerCode + new Date().getTime();
    const orderId = paymentRequest.orderId;
    const orderInfo =
      paymentRequest.orderInfo.length > 100
        ? paymentRequest.orderInfo.substring(0, 97) + '...'
        : paymentRequest.orderInfo;

    const redirectUrl = paymentRequest.returnUrl || this.config.returnUrl;
    const ipnUrl = paymentRequest.notifyUrl || this.config.notifyUrl;
    const amount = paymentRequest.amount.toString(); // Convert to string like MoMo.js
    const requestType = paymentMethod; // Use the provided payment method
    const extraData = paymentRequest.extraData || '';

    // Create raw signature following MoMo.js exact format
    const rawSignature = `accessKey=${this.config.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.config.partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    console.log('--------------------RAW SIGNATURE----------------');
    console.log(rawSignature);

    // Create signature
    const signature = this.createSignature(rawSignature);
    console.log('--------------------SIGNATURE----------------');
    console.log(signature);

    // Build request body following MoMo.js structure
    const requestBody = {
      partnerCode: this.config.partnerCode,
      accessKey: this.config.accessKey,
      requestId: requestId,
      amount: amount,
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: redirectUrl,
      ipnUrl: ipnUrl,
      extraData: extraData,
      requestType: requestType,
      signature: signature,
      lang: 'en',
    };

    console.log('MoMo Payment Request Body:', {
      ...requestBody,
      signature: signature.substring(0, 20) + '...',
    });

    try {
      // Make request to MoMo API using axios (more reliable than native HTTPS)
      const response = await axios.post(this.config.endpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000, // 15 seconds timeout
      });

      const data: MomoPaymentResponse = response.data;

      console.log(`Status: ${response.status}`);
      console.log('Body: ', data);
      console.log('payUrl: ', data.payUrl);

      if (data.resultCode === 0) {
        console.log('✅ MoMo payment URL created successfully');
        return {
          paymentUrl: data.payUrl,
          qrCodeUrl: data.qrCodeUrl,
          deeplink: data.deeplink,
        };
      } else {
        console.error('❌ MoMo payment URL creation failed:', data.message);
        throw new Error(
          `MoMo payment failed: ${data.message} (Code: ${data.resultCode})`,
        );
      }
    } catch (error) {
      console.error('❌ Error calling MoMo API:', error);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || error.message;
        throw new Error(`MoMo API error: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * Verify MoMo callback signature
   */
  verifyCallback(callbackData: MomoCallbackData): boolean {
    const { signature, ...params } = callbackData;

    // Create signature for verification
    const rawSignature = `accessKey=${this.config.accessKey}&amount=${params.amount}&extraData=${params.extraData}&message=${params.message}&orderId=${params.orderId}&orderInfo=${params.orderInfo}&orderType=${params.orderType}&partnerCode=${params.partnerCode}&payType=${params.payType}&requestId=${params.requestId}&responseTime=${params.responseTime}&resultCode=${params.resultCode}&transId=${params.transId}`;

    const expectedSignature = this.createSignature(rawSignature);

    console.log('MoMo Signature Verification:');
    console.log('Expected signature:', expectedSignature);
    console.log('Received signature:', signature);

    return expectedSignature === signature;
  }

  /**
   * Check if payment is successful
   */
  isPaymentSuccess(callbackData: MomoCallbackData): boolean {
    return callbackData.resultCode == 0  ;
  }

  /**
   * Get transaction info from callback data
   */
  getTransactionInfo(callbackData: MomoCallbackData) {
    return {
      orderId: callbackData.orderId,
      amount: callbackData.amount,
      transactionId: callbackData.transId?.toString(),
      requestId: callbackData.requestId,
      payType: callbackData.payType,
      responseTime: callbackData.responseTime,
      orderInfo: callbackData.orderInfo,
      resultCode: callbackData.resultCode,
      message: callbackData.message,
      isSuccess: this.isPaymentSuccess(callbackData),
      extraData: callbackData.extraData,
    };
  }

  /**
   * Get error message by result code
   */
  getErrorMessage(resultCode: number): string {
    const errorMessages: Record<number, string> = {
      0: 'Giao dịch thành công',
      9000: 'Giao dịch được khởi tạo, chờ thanh toán',
      8000: 'Giao dịch đang được xử lý',
      7000: 'Trừ tiền thành công, chờ xử lý giao dịch',
      1000: 'Giao dịch thất bại',
      1001: 'Giao dịch thất bại do tài khoản người dùng bị khóa',
      1002: 'Giao dịch thất bại do tài khoản người dùng chưa được kích hoạt',
      1003: 'Giao dịch thất bại do tài khoản người dùng không tồn tại',
      1004: 'Giao dịch thất bại do số tiền vượt quá hạn mức trong ngày',
      1005: 'Giao dịch thất bại do URL hoặc QR code đã hết hạn',
      1006: 'Giao dịch thất bại do người dùng từ chối thanh toán',
      4001: 'Giao dịch thất bại do số tiền không hợp lệ',
      4010: 'Giao dịch thất bại do đơn hàng không tồn tại',
      4011: 'Giao dịch thất bại do đơn hàng đã được thanh toán',
      4015: 'Giao dịch thất bại do đơn hàng đã hết hạn',
      2001: 'Giao dịch thất bại do sai thông tin',
      2007: 'Giao dịch thất bại do không đủ số dư',
      2019: 'Giao dịch thất bại do vượt quá số lần thanh toán trong ngày',
      3001: 'Giao dịch thất bại',
      3002: 'Giao dịch bị từ chối',
      3003: 'Giao dịch bị hủy',
      3004: 'Giao dịch bị từ chối do vi phạm quy định',
      3005: 'Giao dịch bị từ chối do nhà cung cấp',
      3006: 'Giao dịch bị từ chối do tài khoản nhận tiền có vấn đề',
      3007: 'Giao dịch bị từ chối do tài khoản nhận tiền bị phong tỏa',
      5001: 'Giao dịch thất bại (Lỗi không xác định)',
      5002: 'Giao dịch thất bại (Lỗi hệ thống)',
      5003: 'Giao dịch thất bại (Lỗi bảo mật)',
      5004: 'Giao dịch thất bại (Lỗi dữ liệu không hợp lệ)',
      5005: 'Giao dịch thất bại (Lỗi kết nối)',
      99: 'Lỗi không xác định',
    };

    return errorMessages[resultCode] || 'Lỗi không xác định';
  }

  /**
   * Create HMAC-SHA256 signature
   */
  private createSignature(data: string): string {
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(data, 'utf8')
      .digest('hex');
  }

  /**
   * Generate unique request ID following MoMo.js pattern
   */
  generateRequestId(): string {
    return this.config.partnerCode + new Date().getTime();
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
   * Validate payment amount
   */
  validateAmount(amount: number): boolean {
    // MoMo limits: 1,000 VND - 20,000,000 VND per transaction
    return amount >= 1000 && amount <= 20000000;
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

  /**
   * Check transaction status by orderId
   */
  async checkTransactionStatus(orderId: string): Promise<any> {
    const requestId = this.generateRequestId();

    const requestData = {
      partnerCode: this.config.partnerCode,
      requestId: requestId,
      orderId: orderId,
      signature: '',
      lang: 'vi',
    };

    // Create signature for transaction status check
    const rawSignature = `accessKey=${this.config.accessKey}&orderId=${orderId}&partnerCode=${this.config.partnerCode}&requestId=${requestId}`;
    requestData.signature = this.createSignature(rawSignature);

    try {
      const response = await axios.post(
        this.config.endpoint.replace('/create', '/query'),
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      return response.data;
    } catch (error) {
      console.error('Error checking MoMo transaction status:', error);
      throw error;
    }
  }

  /**
   * Get payment method description
   */
  getPaymentMethodDescription(requestType: string): string {
    const descriptions: Record<string, string> = {
      captureWallet: 'MoMo E-Wallet',
      payWithATM: 'ATM/Debit Card',
      payWithCC: 'QR Code Scan',
    };
    return descriptions[requestType] || 'Unknown Payment Method';
  }

  /**
   * Validate payment method
   */
  isValidPaymentMethod(requestType: string): boolean {
    const validMethods = ['captureWallet', 'payWithATM', 'payWithCC'];
    return validMethods.includes(requestType);
  }

  /**
   * Get supported features for payment method
   */
  getPaymentMethodFeatures(requestType: string): string[] {
    const features: Record<string, string[]> = {
      captureWallet: ['instant', 'mobile', 'secure', 'balance_check'],
      payWithATM: ['secure', 'bank_card', 'offline_verification'],
      payWithCC: ['qr_scan', 'mobile', 'universal', 'cross_platform'],
    };
    return features[requestType] || [];
  }
}
