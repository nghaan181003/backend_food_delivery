const express = require("express");
const router = express.Router();

const productController = require('../../controllers/product.controller')
const fileUploader = require("../../config/cloudinary.config");

const asyncHandler = require('../../helpers/asyncHandler')


// create
router.post('/create', fileUploader.fields([{ name: "itemImage", maxCount: 1 }]), asyncHandler(productController.create))

router.get('/', asyncHandler(async (req, res, next) => {
    return res.status(200).json({
        message: "test"
    });
}));
module.exports = router