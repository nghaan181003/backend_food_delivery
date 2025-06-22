const express = require("express");
const router = express.Router();

const voucherController = require('../../controllers/voucher.controller')

const asyncHandler = require('../../helpers/asyncHandler')

// Thêm nhóm topping
router.get('/partner', asyncHandler(voucherController.getVouchersForShop))
router.post('/create', asyncHandler(voucherController.createVoucher))
router.patch('/:id/status', asyncHandler(voucherController.updateVoucherStatus));
router.post('/order', asyncHandler(voucherController.getVouchersInOrder))
router.get('/code', asyncHandler(voucherController.getVoucherByCode))

module.exports = router