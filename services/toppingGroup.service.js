const { findById: findPartnerById } = require("../services/PartnerServices")
const { BadRequestError, NotFoundError } = require('../core/error.response')
const toppingGroup = require("../models/ToppingGroup")
const { ToppingModel :toppingModel} = require("../models/Topping")
const { findAllByShopId, findAllByShopIdV2 } = require("../models/repositories/toppingGroup.repo")
const { Types } = require("mongoose")
const ToppingService = require("./topping.service")


/*
    tpGroupName: {type: String, required: true},  // "Size", "Trân châu"
    tpShopId: {type: Types.ObjectId, ref: "UpdatedPartner"},
    orderIndex: {type: Number, default: 0}
*/

class ToppingGroupService {
    static findById = async (id) => {
        return await toppingGroup.findOne({ _id: new Types.ObjectId(id) });
    }


    static createToppingGroup = async ({ id, tpGroupName, tpShopId, toppings = [], isRequired, maxSelect }) => {
        const foundPartner = await findPartnerById(tpShopId)
        if (!foundPartner) throw new NotFoundError(`Không tìm thấy Partner với ${tpShopId}`)

        let tpGroup;

        const data = { tpGroupName, tpShopId, isRequired, maxSelect }

        if (id) {
            tpGroup = await toppingGroup.findByIdAndUpdate(
                id,
                data,
                { new: true }
            );

            if (!tpGroup) throw new NotFoundError(`Không tìm thấy ToppingGroup với id ${id}`)
        }
        else {
            tpGroup = await toppingGroup.create(data)
        }


        if (tpGroup && toppings.length > 0) {
            for (const topping of toppings) {
                await ToppingService.createTopping({
                    ...topping, // có thể có field id
                    tpGroupId: tpGroup._id
                });
            }
        }

        return tpGroup

    }


    static deleteToppingGroup = async (id) => {
        const foundTpGroup = await this.findById(id)
        if (!foundTpGroup) throw new NotFoundError(`Không tìm thấy ToppingGroup ${id}`)


        // Xóa tất cả các topping liên quan
        await toppingModel.updateMany(
            { tpGroupId: id },
            { $set: { isDelete: true } }
        );

        foundTpGroup.isDelete = true
        return await foundTpGroup.save()
    }


    static getAllByShop = async ({ tpShopId, limit = 5, skip = 0 }) => {
        const query = { tpShopId: new Types.ObjectId(tpShopId) }
        return await findAllByShopId({ query, limit, skip })
    }

    static getAllByShopV2 = async ({ tpShopId, limit = 5, page = 1 }) => {
        const filter = { tpShopId: new Types.ObjectId(tpShopId), isDelete: false }
        return await findAllByShopIdV2({ filter, limit, page, select: ["_id", "tpGroupName", "toppings", "isRequired", "maxSelect"] })
    }


}

module.exports = ToppingGroupService