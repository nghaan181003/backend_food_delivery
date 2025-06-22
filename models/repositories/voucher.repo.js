const Voucher = require('../Voucher');
const { getSelectData, unGetSelectData, convertToOjectIdMongodb } = require("../../utils");


class VoucherRepository {

    static createVoucher = async (voucherData) => {
        // return Voucher.create(voucherData);
        if (voucherData.voucher_id) {
            return Voucher.findByIdAndUpdate(
                voucherData.voucher_id,
                voucherData,
                { new: true, upsert: true } // upsert tạo mới nếu không tìm thấy
            );
        } else {
            return Voucher.create(voucherData);
        }
    }

    static isCodeExists = async (voucherCode, shopId) => {
        if (!voucherCode) return false;

        const found = await Voucher.findOne({ voucher_code: voucherCode, voucher_shop_id: convertToOjectIdMongodb(shopId) }).lean();

        return !!found;
    }

    static queryVoucher = async ({
        query = {},
        limit = 20,
        skip = 0,
        select = null,  // ["voucher_name", "voucher_code"]
        populate = null,
        sort = { updatedAt: -1 }
    }) => {
        let queryBuilder = Voucher.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)


        if (select) {
            queryBuilder = queryBuilder.select(getSelectData(select));
        }

        if (populate) {
            queryBuilder = queryBuilder.populate(populate);
        }

        return await queryBuilder.lean().exec();
    }


    static findAll = async ({ filter, select }) => {

    }

    static getValidVouchers = async ({ shopId, productIds, totalOrderAmount, userId }) => {
        const userObjectId = convertToOjectIdMongodb(userId);

        return await Voucher.find({
            voucher_shop_id: convertToOjectIdMongodb(shopId),
            voucher_is_public: true,
            voucher_status: 'running',
            voucher_min_order_value: { $lte: totalOrderAmount },
            $and: [
                {
                    $or: [
                        { voucher_applies_to: 'all' },
                        {
                            voucher_applies_to: 'specific',
                            voucher_products_idx: {
                                $in: productIds.map(id => convertToOjectIdMongodb(id)),
                            },
                        },
                    ]
                },
                {
                    $or: [
                        { voucher_users_idx: { $exists: false } },
                        { voucher_users_idx: { $eq: null } },
                        { voucher_users_idx: { $size: 0 } },
                        { voucher_users_idx: userObjectId }
                    ]
                }
            ]
        }).lean();
    }

}


module.exports = VoucherRepository;