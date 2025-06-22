const mongoose = require("mongoose");
const { Schema } = mongoose;
const { OrderItemSchema } = require("./OrderItem.js");

const OrderSchema = new Schema({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  custAddress: {
    type: String,
  },
  custLatitude: {
    type: Number,
    default: null,
  },
  custLongitude: {
    type: Number,
    default: null,
  },
  shipperLatitude: {
    type: Number,
    default: null,
  },
  shipperLongitude: {
    type: Number,
    default: null,
  },
  restLatitude: {
    type: Number,
    default: null,
  },
  restLongitude: {
    type: Number,
    default: null,
  },
  restaurantId: {
    type: Schema.Types.ObjectId,
    ref: "UpdatedPartner",
    default: null,
  },
  assignedShipperId: {
    type: Schema.Types.ObjectId,
    ref: "UpdatedDriver",
    default: null,
  },
  custShipperRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },
  custShipperRatingComment: {
    type: String,
    default: "",
  },
  deliveryFee: {
    type: Number,
    required: true,
  },
  orderDatetime: {
    type: Date,
    default: Date.now,
  },
  note: {
    type: String,
    default: "",
  },
  custResRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },
  custResRatingComment: {
    type: String,
    default: "",
  },
  reason: {
    type: String,
    default: "",
  },
  custStatus: {
    type: String,
    enum: [
      "waiting",
      "heading_to_rest",
      "preparing",
      "delivering",
      "delivered",
      "cancelled",
    ],
    default: "waiting",
  },
  driverStatus: {
    type: String,
    enum: [
      "waiting",
      "heading_to_rest",
      "delivering",
      "delivered",
      "cancelled",
      "reported",
      "approved",
      "rejected",
    ],
    default: "waiting",
  },
  restStatus: {
    type: String,
    enum: ["new", "preparing", "completed", "cancelled"],
    default: "new",
  },
  orderItems: [OrderItemSchema],
  totalPrice: {
    type: Number,
    default: 0,
  },
  paymentMethod: {
    type: String,
    enum: ["Cash", "ZaloPay", "VNPay"],
    required: true,
    default: 'Cash'
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending",
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  isRestaurantPaid: {
    type: Boolean,
    default: false,
  },
  isDriverPaid: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("Order", OrderSchema);
