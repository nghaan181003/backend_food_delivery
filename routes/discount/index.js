const express = require("express");
const router = express.Router();

const discountController = require('../../controllers/discount.controller')

const asyncHandler = require('../../helpers/asyncHandler')

// Thêm nhóm topping
router.post('/create', asyncHandler(discountController.createDiscount))

router.get('/', (req, res) => {
    res.send("TEST")
})

router.get('/partner', asyncHandler(discountController.getDiscounts))

router.patch('/:id/status', asyncHandler(discountController.updateDiscountStatus));

module.exports = router