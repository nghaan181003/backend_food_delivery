const Item = require("../models/Item")
const { findById } = require("../services/PartnerServices")
const { findById: findCategoryById } = require("../services/CategoryServices")
const { BadRequestError, NotFoundError } = require('../core/error.response')


class ProductService {
    /*
        1. Kiểm tra partnerId có tồn tại hay không
        2. Kiểm tra categoryId có tồn tại hay không
        3. Tao product
    */
    static createProduct = async ({
        categoryId,
        itemName,
        price,
        description,
        itemImage,
        partnerId,
        keySearch,
        toppingGroupIds
    }) => {
        // 1.
        const foundPartner = await findById(partnerId)
        if (!foundPartner) throw new NotFoundError(`Không tìm thấy Partner với ${partnerId}`)
        // 2.
        const foundCategory = await findCategoryById(categoryId)
        if (!foundCategory) throw new NotFoundError(`Không tìm thấy Category với ${categoryId}`)
        // 3.
        return await Item.create({ categoryId, itemName, price, description, itemImage, keySearch, toppingGroupIds })
    }
}

module.exports = ProductService