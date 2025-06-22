const { BadRequestError } = require("../core/error.response")

const Discount = require('../models/Discount')

const { getDiscounts } = require('../models/repositories/discount.repo')

class DiscountService {
    /*
        discount_shop_id: { type: Types.ObjectId, ref: "UpdatedPartner" },
            discount_name: { type: String, require: true },
            discount_type: { type: String, enum: ['percentage, fixed'] },
            discount_start_date: { type: Date },
            discount_end_date: { type: Date },
            discount_status: { type: String, enum: ["scheduled", "running", 'finished'] },
            discount_min_order_value: { type: Number },
            discount_applies_to: { type: String, enum: ["all", "specific"] },
            discount_products_idx: [{
                type: Types.ObjectId,
                ref: "Item"
            }],
            discount_max_items_per_order: { type: Number },
            discount_max_quantity_per_item_per_order: { type: Number },
            discount_max_quantity_per_item_per_day: { type: Number },
            discount_item_per_order: { type: Number },
            discount_max_quantity_per_item_per_user_per_day: { type: Number },
            discount_used_count: { type: Number, default: 0 }
    */
    static createDiscount = async (payload) => {
        const {
            discount_shop_id,
            discount_name,
            discount_type,
            discount_value,
            discount_start_date,
            discount_end_date,
            // discount_status,
            discount_min_order_value,
            discount_applies_to,
            discount_products_idx,
            discount_max_items_per_order,
            discount_max_quantity_per_item_per_order,
            discount_max_quantity_per_item_per_day,
            discount_item_per_order,
            discount_max_quantity_per_item_per_user_per_day
        } = payload;

        const now = new Date();

        // 1. Kiểm tra ngày
        if (new Date(discount_start_date) > new Date(discount_end_date)) {
            throw new BadRequestError("Ngày bắt đầu phải trước Ngày kết thúc");
        }

        if (new Date(discount_end_date) < now) {
            throw new BadRequestError("Ngày kết thúc phải sau Ngày hiện tại")
        }

        // if (discount_status === "running") {
        //     if (now < new Date(discount_start_date) || now > new Date(discount_end_date)) {
        //         throw new BadRequestError("Giảm giá 'running' phải trong thời gian hợp lệ");
        //     }
        // }

        // 2. Kiểm tra tên
        if (!discount_name || discount_name.trim() === "") {
            throw new BadRequestError("Tên giảm giá không được để trống");
        }

        // 3. Kiểm tra loại và giá trị giảm giá
        if (!["percentage", "fixed"].includes(discount_type)) {
            throw new BadRequestError("Loại giảm giá không hợp lệ");
        }

        if (!discount_value || discount_value <= 0) {
            throw new BadRequestError("Giá trị giảm giá phải lớn hơn 0");
        }

        if (discount_type === "percentage" && discount_value > 100) {
            throw new BadRequestError("Phần trăm giảm giá không được lớn hơn 100%");
        }

        // 4. Kiểm tra điều kiện áp dụng
        if (!["all", "specific"].includes(discount_applies_to)) {
            throw new BadRequestError("Kiểu áp dụng không hợp lệ");
        }

        const conflictQuery = {
            discount_status: { $in: ["scheduled", "running"] },
            $or: [
                {
                    discount_start_date: { $lte: new Date(discount_end_date) },
                    discount_end_date: { $gte: new Date(discount_start_date) },
                }
            ],
        };

        if (discount_applies_to === "all") {
            conflictQuery.discount_shop_id = discount_shop_id;
        } else if (discount_applies_to === "specific") {
            if (!Array.isArray(discount_products_idx) || discount_products_idx.length === 0) {
                throw new BadRequestError("Phải cung cấp danh sách sản phẩm khi áp dụng cho sản phẩm cụ thể");
            }
            conflictQuery.discount_products_idx = { $in: discount_products_idx };
        } else {
            throw new BadRequestError("Kiểu áp dụng không hợp lệ");
        }

        const conflictDiscounts = await Discount.find(conflictQuery);

        if (conflictDiscounts.length > 0) {
            throw new BadRequestError("Một số sản phẩm có chương trình giảm giá trùng thời gian");
        }


        // // 5. Kiểm tra giới hạn (nếu có)
        // const numberFields = [
        //     { key: 'discount_max_items_per_order', value: discount_max_items_per_order },
        //     { key: 'discount_max_quantity_per_item_per_order', value: discount_max_quantity_per_item_per_order },
        //     { key: 'discount_max_quantity_per_item_per_day', value: discount_max_quantity_per_item_per_day },
        //     { key: 'discount_item_per_order', value: discount_item_per_order },
        //     { key: 'discount_max_quantity_per_item_per_user_per_day', value: discount_max_quantity_per_item_per_user_per_day },
        // ];

        // for (const field of numberFields) {
        //     if (field.value !== undefined && field.value < 0) {
        //         throw new BadRequestError(`Giá trị ${field.key} không hợp lệ (phải ≥ 0)`);
        //     }
        // }

        // // 6. Optional: Kiểm tra min_order_value
        // if (discount_min_order_value !== undefined && discount_min_order_value < 0) {
        //     throw new BadRequestError("Giá trị đơn hàng tối thiểu không hợp lệ");
        // }
        const newDiscount = await Discount.create(payload);
        return newDiscount;
    }

    static getDiscounts = async ({ partnerId, discountStatus }) => {
        return getDiscounts(partnerId, discountStatus)
    }

    static updateStatus = async ({ id, discountStatus }) => {
        const updatedDiscount = await Discount.findByIdAndUpdate(
            id,
            { discount_status: discountStatus },
            { new: true }
        );

        if (!updatedDiscount) {
            throw new BadRequestError("Không tìm thấy giảm giá với ID đã cung cấp");
        }

        return updatedDiscount
    }


}

module.exports = DiscountService