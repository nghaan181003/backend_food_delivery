const ToppingGroupService = require("../services/toppingGroup.service")
const { SuccessResponse, PAGINATED } = require("../core/success.response")


class ToppingGroupController {
    createToppingGroup = async (req, res, next) => {
        new SuccessResponse(
            {
                message: "Lưu nhóm Topping thành công!",
                data: await ToppingGroupService.createToppingGroup(req.body) // userId se duoc lay tu header
            }
        ).send(res)
    }

    deleteToppingGroup = async (req, res, next) => {
        const result = await ToppingGroupService.deleteToppingGroup(req.params.id)
        new SuccessResponse(
            {
                message: "Xóa nhóm Topping thành công!",
                data: result
            }
        ).send(res)
    }

    getAllToppingGroupsForShop = async (req, res, next) => {
        const result = await ToppingGroupService.getAllByShopV2(req.query)

        new PAGINATED(
            {
                message: "Lấy danh sách các nhóm Topping thành công!",
                data: result.data,
                currentPage: result.page,
                pageSize: result.limit,
                totalItems: result.totalItems,
                totalPages: result.totalPages
            }
        ).send(res)
    }
}


module.exports = new ToppingGroupController()