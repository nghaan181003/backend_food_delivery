const Discount = require('../Discount')


function getAllDiscounts(partnerId) {
    return Discount.find({
        discount_shop_id: partnerId,
    })
}

function getRunningDiscounts(partnerId) {
    const now = new Date();
    return Discount.find({
        discount_shop_id: partnerId,
        discount_start_date: { $lte: now },
        discount_end_date: { $gte: now },
        discount_status: 'running',

    })
}

function getScheduledDiscounts(partnerId) {
    const now = new Date();

    return Discount.find({
        discount_shop_id: partnerId,
        discount_status: 'scheduled',
        discount_start_date: { $gt: now },
    })
}

function getFinishedDiscounts(partnerId) {
    // const now = getVietnamTime();
    const now = new Date();

    return Discount.find({
        discount_shop_id: partnerId,
        discount_status: 'finished',
        discount_end_date: { $lt: now },
    })
}

function getCanceledDiscounts(partnerId) {
    return Discount.find({
        discount_shop_id: partnerId,
        discount_status: 'canceled',
    })
}

const getDiscountStrategies = {
    all: getAllDiscounts,
    running: getRunningDiscounts,
    scheduled: getScheduledDiscounts,
    finished: getFinishedDiscounts,
    canceled: getCanceledDiscounts
}

function getDiscounts(partnerId, discountStatus) {
    return getDiscountStrategies[discountStatus](partnerId)
}


module.exports = { getDiscounts }
