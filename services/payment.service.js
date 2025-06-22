require('dotenv').config();
const crypto = require('crypto');

class PaymentService {
  static vnpConfig = {
    vnp_TmnCode: process.env.VNP_TMN_CODE,
    vnp_HashSecret: process.env.VNP_HASH_SECRET,
    vnp_Url: process.env.VNP_URL,
    vnp_ReturnUrl: process.env.VNP_RETURN_URL,
  };

  static transactionStatus = {};

  static async createPaymentUrl({ amount, orderId, ipAddr }) {
    try {
      const date = new Date();
      const createDate = date.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      amount = amount || 100000;
      ipAddr = ipAddr || '127.0.0.1';

      const vnp_Params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: this.vnpConfig.vnp_TmnCode,
        vnp_Amount: amount * 100,
        vnp_CurrCode: 'VND',
        vnp_TxnRef: orderId,
        vnp_OrderInfo: 'Thanh toan don hang test',
        vnp_OrderType: 'billpayment',
        vnp_Locale: 'vn',
        vnp_CreateDate: createDate,
        vnp_IpAddr: ipAddr,
        vnp_ReturnUrl: this.vnpConfig.vnp_ReturnUrl,
      };

      const sortedParams = Object.keys(vnp_Params).sort().reduce((obj, key) => {
        obj[key] = vnp_Params[key];
        return obj;
      }, {});

      const signData = Object.keys(sortedParams)
        .map(key => `${key}=${encodeURIComponent(sortedParams[key]).replace(/%20/g, '+')}`)
        .join('&');

      const secureHash = crypto.createHmac('sha512', this.vnpConfig.vnp_HashSecret)
        .update(signData)
        .digest('hex');

      vnp_Params['vnp_SecureHash'] = secureHash;
      const paymentUrl = `${this.vnpConfig.vnp_Url}?${new URLSearchParams(vnp_Params).toString()}`;

      this.transactionStatus[orderId] = {
        status: 'pending',
        amount,
        message: 'Giao dịch đang chờ xử lý',
        createdAt: Date.now(),
      };

      return { paymentUrl, transactionId: orderId };
    } catch (error) {
      throw new Error(`Failed to create payment URL: ${error.message}`);
    }
  }

  static async handleVnPayReturn({ vnp_Params }) {
    try {
      const secureHash = vnp_Params['vnp_SecureHash'];
      const transactionId = vnp_Params['vnp_TxnRef'];

      if (!transactionId || !secureHash) {
        throw new Error('Missing transactionId or secureHash');
      }

      const paramsCopy = { ...vnp_Params };
      delete paramsCopy['vnp_SecureHash'];
      delete paramsCopy['vnp_SecureHashType'];

      const signData = Object.keys(paramsCopy).sort()
        .map(key => `${key}=${encodeURIComponent(paramsCopy[key]).replace(/%20/g, '+')}`)
        .join('&');

      const checksum = crypto.createHmac('sha512', this.vnpConfig.vnp_HashSecret)
        .update(signData)
        .digest('hex');

      let status = 'failed';
      let message = 'Checksum không hợp lệ';

      if (secureHash === checksum) {
        status = vnp_Params['vnp_ResponseCode'] === '00' ? 'success' : 'failed';
        message = status === 'success'
          ? 'Giao dịch thành công'
          : `Giao dịch thất bại (Mã lỗi: ${vnp_Params['vnp_ResponseCode']})`;
      }

      this.transactionStatus[transactionId] = {
        status,
        responseCode: vnp_Params['vnp_ResponseCode'] || '97',
        message,
        updatedAt: Date.now(),
      };

      return { redirectUrl: `joodiesapp://vnpay_return?txnId=${transactionId}` };
    } catch (error) {
      throw new Error(`Failed to process VNPay callback: ${error.message}`);
    }
  }

  static async checkTransaction({ txnId }) {
    try {
      const maxAttempts = 10;
      const pollInterval = 2000;
      let attempts = 0;

      const checkStatus = () => {
        return new Promise((resolve) => {
          const transaction = this.transactionStatus[txnId];
          if (!transaction) {
            return resolve({
              status: 'not_found',
              responseCode: 'not_found',
              message: 'Không tìm thấy giao dịch',
            });
          }

          if (transaction.status === 'success' || transaction.status === 'failed') {
            return resolve({
              status: transaction.status,
              responseCode: transaction.responseCode,
              message: transaction.message,
            });
          }

          if (Date.now() - transaction.createdAt > 30000) {
            this.transactionStatus[txnId] = {
              status: 'failed',
              responseCode: 'timeout',
              message: 'Giao dịch hết hạn',
              updatedAt: Date.now(),
            };
            return resolve({
              status: 'failed',
              responseCode: 'timeout',
              message: 'Giao dịch hết hạn',
            });
          }

          if (attempts < maxAttempts) {
            attempts++;
            setTimeout(() => resolve(checkStatus()), pollInterval);
          } else {
            this.transactionStatus[txnId] = {
              status: 'failed',
              responseCode: 'timeout',
              message: 'Hết thời gian chờ giao dịch',
              updatedAt: Date.now(),
            };
            return resolve({
              status: 'failed',
              responseCode: 'timeout',
              message: 'Hết thời gian chờ giao dịch',
            });
          }
        });
      };

      return await checkStatus();
    } catch (error) {
      throw new Error(`Failed to check transaction: ${error.message}`);
    }
  }
}

module.exports = PaymentService;