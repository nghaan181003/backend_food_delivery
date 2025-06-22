const {ToppingModel : toppingModel} = require("../models/Topping")
const toppingGroupModel = require("../models/ToppingGroup")
const ToppingGroupService = require("./toppingGroup.service")
const { NotFoundError } = require("../core/error.response")
const { getSelectData } = require("../utils")
const { Types } = require("mongoose")

class ToppingService {

    static createTopping = async ({ id, tpName, tpPrice, tpImage, isActive = false, tpGroupId }) => {

        const filter = { _id: id };

        const update = {
            tpName,
            tpPrice,
            tpImage,
            isActive,
            tpGroupId
        }, options = {
            upsert: false,
            new: true,
        };

        const foundToppingGroup = await toppingGroupModel.findOne({ _id: new Types.ObjectId(tpGroupId) });  // ? sử dụng hàm findById của ToppingGroupService không được
        if (!foundToppingGroup) throw new NotFoundError(`Không tìm thấy nhóm topping ${tpGroupId}`)

        if (id) {
            // Update the existing topping
            return await toppingModel.findOneAndUpdate(filter, update, options);
        }
        else {
            // Create a new topping
            return await toppingModel.create(update)
        }

    }

    static deleteTopping = async (id) => {
        const foundTopping = await toppingModel.findById(id);

        if (!foundTopping) throw new NotFoundError(`Không tìm thấy Topping ${id}`)
        foundTopping.isDelete = true
        return await foundTopping.save()
    }
}

module.exports = ToppingService