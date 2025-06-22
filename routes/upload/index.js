const express = require("express");
const router = express.Router();

const uploadController = require('../../controllers/upload.controller')

const asyncHandler = require('../../helpers/asyncHandler');
const { uploadDisk } = require("../../config/multer.config");



// create
router.post('/', asyncHandler(uploadController.uploadFile))
router.post('/thumb', uploadDisk.single('file'), asyncHandler(uploadController.uploadFileThumb))
router.post('/base64', asyncHandler(uploadController.uploadBase64String))

router.get('/', asyncHandler(async (req, res, next) => {
    return res.status(200).json({
        message: "upload"
    });
}));
module.exports = router