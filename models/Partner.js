const mongoose = require("mongoose");
const { Schema } = mongoose;

const PartnerSchema = Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    photos: [
      {
        name: {
          type: String,
          enum: ["avatar", "storefont", "CCCD_front", "CCCD_back"],
        },
        url: {
          type: String,
        },
      },
    ],
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
        ref: "Category"
      }
    ]
    
  },
  {
    timeStamp: true,
  }
);
module.exports = mongoose.model("Partner", PartnerSchema);
