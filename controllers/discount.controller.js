const { SuccessResponse } = require("../core/success.response")
const DiscountService = require("../services/discount.service")

class DiscountController {
    createDiscount = async (req, res, next) => {
        new SuccessResponse(
            {
                message: "Tạo khuyến mãi thành công",
                data: await DiscountService.createDiscount(req.body)
            }
        ).send(res)
    }

    getDiscounts = async (req, res, next) => {
        new SuccessResponse({
            message: "Lấy danh sách khuyến mãi thành công!",
            data: await DiscountService.getDiscounts(req.query)
        }).send(res)
    }

    updateDiscountStatus = async (req, res, next) => {
        const { id } = req.params;
        const { discountStatus } = req.body;

        new SuccessResponse({
            message: "Cập nhật trạng thái khuyến mãi thành công!",
            data: await DiscountService.updateStatus({ id, discountStatus })
        }).send(res);
    };


}

module.exports = new DiscountController()