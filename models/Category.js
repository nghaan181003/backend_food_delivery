const mongoose = require("mongoose");
const { Schema } = mongoose;

const CategorySchema = Schema({
  partnerId: {
    type: Schema.Types.ObjectId,
    ref: "UpdatedPartner",
  },

  name: {
    type: String,
  },
  isDelete: { type: Boolean, default: false },
});

module.exports = mongoose.model("Category", CategorySchema);
