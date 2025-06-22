const mongoose = require("mongoose");

const UserSchema = mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    status: {
      type: Boolean, //true: Avaiable, false: Unavailable
      default: false,
    },
    role: {
      type: String,
      enum: ["admin", "partner", "driver", "customer"],
      default: "customer",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
    },

    otp: {
      type: String,
    },
    otpExpires: {
      type: Date,
    },
    favoriteList: [{ type: mongoose.Schema.Types.ObjectId, ref: "Item", default: [] }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
