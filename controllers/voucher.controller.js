const { SuccessResponse } = require("../core/success.response")
const VoucherService = require("../services/voucher.service")

class VoucherController {
    createVoucher = async (req, res, next) => {
        new SuccessResponse({
            message: "Tạo voucher thành công",
            data: await VoucherService.createVoucher(req.body)
        }).send(res);
    }

    getVouchersForShop = async (req, res, next) => {

        new SuccessResponse({
            message: "Lấy danh sách voucher thành công",
            data: await VoucherService.getVouchersByShopId(req.query)
        }).send(res);
    }

    updateVoucherStatus = async (req, res, next) => {
        const { id } = req.params;
        const { voucherStatus } = req.body;

        new SuccessResponse({
            message: "Cập nhật trạng thái voucher thành công",
            data: await VoucherService.updateStatus({ voucherId: id, status: voucherStatus })
        }).send(res);
    }

    getVouchersInOrder = async (req, res, next) => { 
        new SuccessResponse({
            message: "Danh sách voucher cho đơn hàng",
            data: await VoucherService.getVoucherInOrder(req.body)
        }).send(res);
    }

    getVoucherByCode = async (req, res, next) => { 
        new SuccessResponse({
            message: "Lấy voucher thành công",
            data: await VoucherService.getVoucherByCode(req.query)
        }).send(res);
    }
}

module.exports = new VoucherController();