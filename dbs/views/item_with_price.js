const mongoose = require('mongoose');

const { getVietnamTime } = require('../../utils/date_format');

async function createView() {
    await mongoose.connect('mongodb+srv://root:u9Kw2FvLUSJFpAJw@fooddelivery.cso1x.mongodb.net/prod?retryWrites=true&w=majority&appName=FoodDelivery');

    const db = mongoose.connection.db;

    // const now = getVietnamTime();

    try {
        await db.createCollection('ItemWithPrice', {
            viewOn: 'items',
            pipeline: [
                {
                    $lookup: {
                        from: "Discounts",
                        let: {
                            itemId: "$_id",
                            itemPartnerId: "$partnerId"
                        },
                        pipeline: [
                            {
                                $match: {
                                    discount_status: "running",
                                    // discount_start_date: { $lte: now },
                                    // discount_end_date: { $gte: now }
                                }
                            },
                            {
                                $match: {
                                    $expr: {
                                        $or: [
                                            {
                                                $and: [
                                                    { $eq: ["$discount_applies_to", "all"] },
                                                    { $eq: ["$discount_shop_id", "$$itemPartnerId"] }
                                                ]
                                            },
                                            {
                                                $and: [
                                                    { $eq: ["$discount_applies_to", "specific"] },
                                                    { $in: ["$$itemId", "$discount_products_idx"] }
                                                ]
                                            }
                                        ]
                                    }
                                }
                            },
                            { $sort: { discount_value: -1 } },
                            { $limit: 1 }
                        ],
                        as: "activeDiscount"
                    }
                },
                {
                    $addFields: {
                        activeDiscount: { $arrayElemAt: ["$activeDiscount", 0] }
                    }
                },
                {
                    $addFields: {
                        salePrice: {
                            $cond: [
                                { $gt: ["$activeDiscount", null] },
                                {
                                    $switch: {
                                        branches: [
                                            {
                                                case: { $eq: ["$activeDiscount.discount_type", "percentage"] },
                                                then: {
                                                    $round: [
                                                        {
                                                            $multiply: [
                                                                "$price",
                                                                {
                                                                    $subtract: [
                                                                        1,
                                                                        {
                                                                            $divide: ["$activeDiscount.discount_value", 100]
                                                                        }
                                                                    ]
                                                                }
                                                            ]
                                                        },
                                                        0
                                                    ]
                                                }
                                            },
                                            {
                                                case: { $eq: ["$activeDiscount.discount_type", "fixed"] },
                                                then: "$activeDiscount.discount_value"
                                            }
                                        ],
                                        default: null
                                    }
                                },
                                null
                            ]
                        }
                    }

                }
            ]
        });

        console.log('View created successfully');
    } catch (err) {
        if (err.codeName === 'NamespaceExists') {
            console.log('View already exists');
        } else {
            console.error('Error creating view:', err);
        }
    } finally {
        await mongoose.disconnect();
    }
}

createView();
