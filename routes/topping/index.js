const express = require("express");
const router = express.Router();

const toppingController = require('../../controllers/topping.controller')

const asyncHandler = require('../../helpers/asyncHandler')

// Thêm nhóm topping
router.post('/create', asyncHandler(toppingController.createTopping))

router.delete('/delete/:id', asyncHandler(toppingController.deleteTopping))

router.get('/', asyncHandler(async (req, res, next) => {
    return res.status(200).json({
        message: "Topping" // for testing
    });
}));
module.exports = router