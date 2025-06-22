const PaymentService = require('../services/payment.service');
const { SuccessResponse } = require('../core/success.response');

class PaymentController {
  static async createPaymentUrl(req, res) {
    try {
      const { amount, orderId } = req.body;
      const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';
      const result = await PaymentService.createPaymentUrl({ amount, orderId, ipAddr });
      new SuccessResponse({
        message: 'Payment URL created successfully',
        data: result,
      }).send(res);
    } catch (error) {
      console.error('Error in createPaymentUrl:', error);
      res.status(400).json({ error: error.message });
    }
  }

  static async vnpayReturn(req, res) {
    try {
      const result = await PaymentService.handleVnPayReturn({ vnp_Params: req.query });
      res.redirect(result.redirectUrl); // Use HTTP redirect
    } catch (error) {
      console.error('Error in vnpayReturn:', error);
      res.status(400).send(error.message);
    }
  }

  static async checkTransaction(req, res) {
    try {
      const { txnId } = req.params;
      const result = await PaymentService.checkTransaction({ txnId });
      new SuccessResponse({
        message: 'Transaction checked successfully',
        data: result,
      }).send(res);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async createOrder(req, res) {
    try {
      const { amount, orderId } = req.body;
      const result = await PaymentService.createOrder({ amount, orderId });
      new SuccessResponse({
        message: 'Payment order created successfully',
        data: result,
      }).send(res);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async zalopayCallback(req, res) {
    try {
      const { orderId } = req.body;
      const result = await PaymentService.handleCallback({ orderId });
      new SuccessResponse({
        message: 'Payment processed successfully',
        data: result,
      }).send(res);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = PaymentController;