const { BadRequestError } = require("../core/error.response")
const { SuccessResponse } = require("../core/success.response")
const { uploadImageFromUrl, uploadImageFromLocal, uploadBase64Image } = require("../services/upload.service")
class UploadController {
    uploadFile = async (req, res, next) => {
        new SuccessResponse(
            {
                message: "Upload file thành công",
                data: await uploadImageFromUrl()
            }
        ).send(res)
    }

    uploadFileThumb = async (req, res, next) => {
        const { file } = req
        if (!file) {
            throw new BadRequestError("Thiếu file")
        }
        new SuccessResponse(
            {
                message: "Upload file thành công",
                data: await uploadImageFromLocal({
                    path: file.path
                })
            }
        ).send(res)
    }

    uploadBase64String = async (req, res, next) => {
        new SuccessResponse(
            {
                message: "Upload base64 String",
                data: await uploadBase64Image(req.body)
            }
        ).send(res)
    }
}

module.exports = new UploadController()