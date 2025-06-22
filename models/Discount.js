const { Schema, model, Types } = require('mongoose');

const { getVietnamTime } = require('../utils/date_format');

const DOCUMENT_NAME = "Discount"
const COLLECTION_NAME = 'Discounts'


const discountSchema = new Schema({
    discount_shop_id: { type: Types.ObjectId, ref: "UpdatedPartner" },
    discount_name: { type: String, require: true },
    discount_type: { type: String, enum: ['percentage', 'fixed'] },
    discount_start_date: { type: Date },
    discount_end_date: { type: Date },
    discount_status: { type: String, enum: ["scheduled", "running", 'finished', 'canceled'] },
    discount_applies_to: { type: String, enum: ["all", "specific"] },
    discount_products_idx: [{
        type: Types.ObjectId,
        ref: "Item"
    }],
    discount_value: { type: Number },

    // discount_max_items_per_order: { type: Number },
    // discount_max_quantity_per_item_per_order: { type: Number },
    // discount_max_quantity_per_item_per_day: { type: Number },
    // discount_item_per_order: { type: Number },
    // discount_max_quantity_per_item_per_user_per_day: { type: Number },
    // discount_used_count: { type: Number, default: 0 },
    // // Voucher
    // discount_code: { type: String, unique: true, sparse: true },
    // discount_program_type: { type: String, enum: ['voucher', 'slash'], default: 'voucher' },
    // discount_quantity: { type: Number, default: null },
    // discount_users_idx: [{
    //     type: Types.ObjectId,
    //     ref: "User"
    // }],
    // discount_is_public: { type: Boolean, default: false }, // Voucher có thể sử dụng công khai hay không
    // discount_max_users_per_user: { type: Number },  // Số lượng tối đa người dùng có thể sử dụng voucher này
},
    {
        collection: COLLECTION_NAME,
        timestamps: true,
    })
discountSchema.methods.isScheduled = function () {
    return this.discount_status === "scheduled";
};

discountSchema.methods.isRunning = function () {
    return this.discount_status === "running";
};

discountSchema.methods.isFinished = function () {
    return this.discount_status === "finished";
};

discountSchema.pre('save', function (next) {
    const now = new Date();

    if (this.discount_status === "canceled") {
        return next();
    }

    if (this.discount_start_date > now) {
        this.discount_status = "scheduled";
    } else if (
        this.discount_start_date <= now &&
        this.discount_end_date >= now
    ) {
        this.discount_status = "running";
    } else if (this.discount_end_date < now) {
        this.discount_status = "finished";
    }

    next();
});

// Indexes
discountSchema.index({ discount_shop_id: 1 });
discountSchema.index({ discount_status: 1 });
discountSchema.index({ discount_start_date: 1 });
discountSchema.index({ discount_end_date: 1 });
discountSchema.index({ discount_status: 1, discount_start_date: 1 });
discountSchema.index({ discount_status: 1, discount_end_date: 1 });


module.exports = model(DOCUMENT_NAME, discountSchema);
