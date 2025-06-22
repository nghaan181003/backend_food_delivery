const { Schema, model, Types } = require('mongoose');

const DOCUMENT_NAME = "Voucher"
const COLLECTION_NAME = 'Vouchers'


const voucherSchema = new Schema({
    voucher_shop_id: { type: Types.ObjectId, ref: "UpdatedPartner" },
    voucher_name: { type: String, require: true },
    voucher_type: { type: String, enum: ['percentage', 'fixed'] },
    voucher_start_date: { type: Date },
    voucher_end_date: { type: Date },
    voucher_status: { type: String, enum: ["scheduled", "running", 'finished', 'canceled'] },
    voucher_applies_to: { type: String, enum: ["all", "specific"] },
    voucher_products_idx: [{
        type: Types.ObjectId,
        ref: "Item"
    }],
    voucher_value: { type: Number },

    voucher_min_order_value: { type: Number },
    voucher_used_count: { type: Number, default: 0 },
    // Voucher
    voucher_code: { type: String },
    voucher_quantity: { type: Number, default: null },
    voucher_users_idx: [{
        type: Types.ObjectId,
        ref: "User"
    }],
    voucher_is_public: { type: Boolean, default: false }, // Voucher có thể sử dụng công khai hay không
    voucher_max_users_per_user: { type: Number },  // Số lượng tối đa người dùng có thể sử dụng voucher này
},
    {
        collection: COLLECTION_NAME,
        timestamps: true,
    })
voucherSchema.methods.isScheduled = function () {
    return this.voucher_status === "scheduled";
};

voucherSchema.methods.isRunning = function () {
    return this.voucher_status === "running";
};

voucherSchema.methods.isFinished = function () {
    return this.voucher_status === "finished";
};

voucherSchema.pre('save', function (next) {
    const now = new Date();

    if (this.voucher_status === "canceled") {
        return next();
    }

    if (this.voucher_start_date > now) {
        this.voucher_status = "scheduled";
    } else if (
        this.voucher_start_date <= now &&
        this.voucher_end_date >= now
    ) {
        this.voucher_status = "running";
    } else if (this.voucher_end_date < now) {
        this.voucher_status = "finished";
    }

    next();
});

voucherSchema.index(
    { voucher_shop_id: 1, voucher_code: 1 },
    { unique: true, sparse: true }
);


// Indexes
voucherSchema.index({ voucher_shop_id: 1 });
voucherSchema.index({ voucher_status: 1 });
voucherSchema.index({ voucher_start_date: 1 });
voucherSchema.index({ voucher_end_date: 1 });
voucherSchema.index({ voucher_status: 1, voucher_start_date: 1 });
voucherSchema.index({ voucher_status: 1, voucher_end_date: 1 });


module.exports = model(DOCUMENT_NAME, voucherSchema);
