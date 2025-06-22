const mongoose = require("mongoose");
const { Schema } = mongoose;

const DriverSchema = Schema(
  {
    userID: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    profileUrl: {
      type: String,
    },

    licensePlate: {
      type: String,
    },
    CCCD: [
      {
        type: {
          type: String,
          enum: ["front", "back"],
        },
        url: {
          type: String,
        },
      },
    ],
    status: {
      type: Boolean,
      default: false,
    },
  },
  {
    timeStamp: true,
  }
);

module.exports = mongoose.model("Driver", DriverSchema);
