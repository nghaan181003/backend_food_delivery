const ToppingService = require("../services/topping.service")
const { SuccessResponse, PAGINATED } = require("../core/success.response")

class ToppingController {
    createTopping = async (req, res, next) => {
        new SuccessResponse(
            {
                message: "Lưu Topping thành công!",
                data: await ToppingService.createTopping(req.body)
            }
        ).send(res)
    }

    deleteTopping = async (req, res, next) => {
        new SuccessResponse(
            {
                message: "Xóa Topping thành công!",
                data: await ToppingService.deleteTopping(req.params.id)
            }
        ).send(res)
    }
}

module.exports = new ToppingController()