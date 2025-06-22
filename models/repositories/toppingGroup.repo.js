const { getSelectData, unGetSelectData } = require("../../utils");
const toppingGroupModel = require("../ToppingGroup")

const findAllByShopId = async ({ query, limit, skip }) => {
    return await toppingGroupModel.aggregate([
        { $match: query },
        {
            $lookup: {
                from: "Toppings",
                localField: "_id",
                foreignField: "tpGroupId",
                as: "toppings"
            }
        },
        { $skip: skip },
        { $limit: limit }
    ]);
}

const findAllByShopIdV2 = async ({ filter, limit, page, select }) => {
    limit = Number(limit);
    page = Number(page)
    const skip = (page - 1) * limit
    const totalItems = await toppingGroupModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);
    const result = await toppingGroupModel.aggregate([
        { $match: filter },
        {
            $lookup: {
                from: "Toppings",
                localField: "_id",
                foreignField: "tpGroupId",
                as: "toppings"
            }
        },
        {
            $project: {
                ...getSelectData(select),
                toppings: {
                    $filter: {
                        input: "$toppings",
                        as: "t",
                        cond: { $eq: ["$$t.isDelete", false] }
                    }
                }
            }

        },
        { $skip: skip },
        { $limit: limit }
    ]);


    return {
        data: result,
        page,
        limit,
        totalPages,
        currentPage: page,
        pageSize: limit,
        totalItems
    };
}

const findAllByShopIdForCustomer = async ({ filter, limit, page, select }) => {
    limit = Number(limit);
    page = Number(page)
    const skip = (page - 1) * limit
    const totalItems = await toppingGroupModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);
    const result = await toppingGroupModel.aggregate([
        { $match: filter },
        {
            $lookup: {
                from: "Toppings",
                localField: "_id",
                foreignField: "tpGroupId",
                as: "toppings"
            }
        },
        {
            $project: {
                ...getSelectData(select),
                toppings: {
                    $filter: {
                        input: "$toppings",
                        as: "t",
                        cond: {
                            $and: [
                                { $eq: ["$$t.isDelete", false] },
                                { $eq: ["$$t.isActive", true] }
                            ]
                        }
                    }
                }
            }

        },
        { $skip: skip },
        { $limit: limit }
    ]);


    return {
        data: result,
        page,
        limit,
        totalPages,
        currentPage: page,
        pageSize: limit,
        totalItems
    };
}

module.exports = {
    findAllByShopId,
    findAllByShopIdV2,
    findAllByShopIdForCustomer
}