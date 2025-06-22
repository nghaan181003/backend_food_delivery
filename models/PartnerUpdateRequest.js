const mongoose = require("mongoose");
const { Schema } = mongoose;

const TimeSlotSchema = new Schema({
  open: String,
  close: String,
}, { _id: false });

const DayScheduleSchema = new Schema({
  day: String,
  timeSlots: [TimeSlotSchema],
}, { _id: false });

const PartnerUpdateRequestSchema = new Schema({
  partnerId: { type: Schema.Types.ObjectId, ref: "UpdatedPartner", required: true },
  name: String,
  email: String,
  phone: String,
  avatarUrl: String,
  storeFront: String,
  CCCDFrontUrl: String,
  CCCDBackUrl: String,
  description: String,
  provinceId: String,
  districtId: String,
  communeId: String,
  detailAddress: String,
  latitude: Number,
  longitude: Number,
  schedule: [DayScheduleSchema],
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("PartnerUpdateRequest", PartnerUpdateRequestSchema);
