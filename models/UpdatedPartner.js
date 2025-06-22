const mongoose = require("mongoose");
const { Schema } = mongoose;


const TimeSplotSchema = mongoose.Schema(
  {
    open: {
      type: String,
      required: true,
    },
    close: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const DayScheduleSchema = Schema({
  day: {
    type: String,
    required: true,
  },
  timeSlots: [TimeSplotSchema],
});

const UpdatedPartnerSchema = Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    avatarUrl: {
      type: String,
    },
    storeFront: {
      type: String,
    },
    CCCDFrontUrl: {
      type: String,
    },
    CCCDBackUrl: {
      type: String,
    },

    description: {
      type: String,
    },
    status: {
      type: Boolean,
      default: false,
    },
    categoryOrderIdx: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
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

    fullAddress: {
      type: String,
    },

    latitude: {
      type: Number,
      default: null, 
    },

    longitude: {
      type: Number,
      default: null, 
    },
    
    schedule: [DayScheduleSchema],
  },
  { timestamps: true }
);

UpdatedPartnerSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("UpdatedPartner", UpdatedPartnerSchema);
