const express = require('express');
const router = express.Router();
const PaymentController = require('../../controllers/payment.controller');

router.post('/zalopay/callback', PaymentController.zalopayCallback);
router.post('/create-order', PaymentController.createOrder);
router.post('/create_payment_url', PaymentController.createPaymentUrl);
router.get('/vnpay_return', PaymentController.vnpayReturn);
router.get('/check_transaction/:txnId', PaymentController.checkTransaction);
module.exports = router;
