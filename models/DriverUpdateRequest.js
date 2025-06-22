const mongoose = require("mongoose");
const { Schema } = mongoose;

const DriverUpdateRequestSchema = new Schema({
  driverId: { type: Schema.Types.ObjectId, ref: "UpdatedDriver", required: true },
  name: String,
  email: String,
  phone: String,
  profileUrl: String,
  licensePlate: String,
  licenseFrontUrl: String,
  licenseBackUrl: String,
  provinceId: String,
  districtId: String,
  communeId: String,
  detailAddress: String,
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("DriverUpdateRequest", DriverUpdateRequestSchema);
