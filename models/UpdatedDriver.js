const mongoose = require("mongoose");
const { Schema } = mongoose;

const UpdatedDriverSchema = Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    profileUrl: {
      type: String,
    },

    licensePlate: {
      type: String,
    },

    licenseFrontUrl: {
      type: String,
    },

    licenseBackUrl: {
      type: String,
    },

    status: {
      type: Boolean,
      default: false,
    },

    provinceId: {
      type: String,
    },

    districtId: {
      type: String,
    },

    communeId: {
      type: String,
    },

    detailAddress: {
      type: String,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0.0, 0.0],
      },
    },
  },
  {
    timeStamp: true,
  }
);

UpdatedDriverSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("UpdatedDriver", UpdatedDriverSchema);
