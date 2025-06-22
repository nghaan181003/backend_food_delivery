
const VoucherRepository = require('../models/repositories/voucher.repo');

const { BadRequestError, ConflicRequestError } = require("../core/error.response");
const Voucher = require('../models/Voucher');
const { getSelectData, unGetSelectData, convertToOjectIdMongodb } = require("../utils");


class VoucherService {

    static createVoucher = async (payload) => {
        const {
            voucher_shop_id,
            voucher_name,
            voucher_type,
            voucher_start_date,
            voucher_end_date,
            voucher_products_idx,
            voucher_value,
            voucher_min_order_value,
            voucher_used_count,
            voucher_code,
            voucher_quantity,
            voucher_users_idx,
            voucher_is_public,
            voucher_max_users_per_user,
            voucher_applies_to,
            voucher_id

        } = payload;

        const now = new Date();

        // 1. Check date validity
        if (new Date(voucher_start_date) > new Date(voucher_end_date)) {
            throw new BadRequestError("Ngày bắt đầu phải trước Ngày kết thúc");
        }

        if (new Date(voucher_end_date) < now) {
            throw new BadRequestError("Ngày kết thúc phải sau Ngày hiện tại");
        }

        // 2. Check voucher name
        if (!voucher_name || voucher_name.trim() === "") {
            throw new BadRequestError("Tên giảm giá không được để trống");
        }

        if (!["percentage", "fixed"].includes(voucher_type)) {
            throw new BadRequestError("Loại giảm giá không hợp lệ");
        }

        if (!voucher_value || voucher_value <= 0) {
            throw new BadRequestError("Giá trị giảm giá phải lớn hơn 0");
        }

        if (voucher_type === "percentage" && voucher_value > 100) {
            throw new BadRequestError("Phần trăm giảm giá không được lớn hơn 100%");
        }

        if (!voucher_id) {
            const foundVoucher = await VoucherRepository.isCodeExists(voucher_code, voucher_shop_id);
            if (foundVoucher) {
                throw new ConflicRequestError("Mã giảm giá đã tồn tại!");
            }
        }

        if (voucher_applies_to === "specific" && (!voucher_products_idx || voucher_products_idx.length === 0)) {
            throw new BadRequestError("Voucher áp dụng cho sản phẩm cụ thể phải có ít nhất một sản phẩm");
        }


        // 2. Create the voucher
        return await VoucherRepository.createVoucher(payload);
    }

    static getVouchersByShopId = async ({ shopId, status }) => {
        const query = { voucher_shop_id: shopId };

        if (status) {
            query.voucher_status = status;
        }

        const populate = [
            { path: "voucher_shop_id", select: "name" },
            { path: "voucher_users_idx", select: "name" }
        ];

        const vouchers = await VoucherRepository.queryVoucher({
            query,
            populate
        });

        return vouchers.map(voucher => {
            const shop = voucher.voucher_shop_id || {};
            const users = (voucher.voucher_users_idx || [])

            const customer = users.length > 0 ? users.map(user => ({
                customerId: user._id,
                customerName: user.name
            })) : null;

            return {
                ...voucher,
                shop_id: shop._id,
                shop_name: shop.name,
                customers: customer,
                voucher_shop_id: undefined,
                voucher_users_idx: undefined
            };
        });
    };

    static updateStatus = async ({ voucherId, status }) => {
        const updatedVoucher = await Voucher.findByIdAndUpdate(
            voucherId,
            { voucher_status: status },
            { new: true }
        ).lean();

        if (!updatedVoucher) {
            throw new BadRequestError("Không tìm thấy voucher với ID đã cung cấp");
        }

        return updatedVoucher


    }

    static getVoucherInOrder = async ({ shopId, productIds, totalOrderAmount, userId }) => {
        return await VoucherRepository.getValidVouchers({
            shopId,
            productIds,
            totalOrderAmount,
            userId
        });
    }

    static getVoucherByCode = async ({
        shopId, code, userId
    }) => {
        const query = {
            $and: [
                {
                    voucher_shop_id: convertToOjectIdMongodb(shopId),
                    voucher_code: code,
                    voucher_status: 'running',
                },
                {
                    $or: [
                        { voucher_users_idx: { $exists: false } },
                        { voucher_users_idx: null },
                        { voucher_users_idx: { $size: 0 } },
                        { voucher_users_idx: convertToOjectIdMongodb(userId) },
                    ]
                }
            ]
        };
        const vouchers = await VoucherRepository.queryVoucher({
            query
        });

        return vouchers;

    }



}

module.exports = VoucherService;