const mongoose = require("mongoose");
const slugify = require("slugify")
const { Schema, Types} = mongoose;
const {removeVietnameseTones} = require('../utils/string.normalized')

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

const ItemSchema = Schema({
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: "Category",
  },
  partnerId: {
    type: Schema.Types.ObjectId,
    ref: "UpdatedPartner",
  },

  itemName: {
    type: String,
  },

  price: {
    type: Number,
  },

  keySearch: {
    type: String,
  },

  quantity: {
    type: Number,
  },

  sales: {
    type: Number,
    default: 0,
  },

  description: {
    type: String,
  },

  status: {
    type: Boolean,
    default: false,
  },

  itemImage: {
    type: String,
  },

  isDeleted: {
    type: String,
    default: false,
  },

  normalizedItemName: {
    type: String,
  },

  itemSlug: {type: String},

  toppingGroupIds: {
    type: [Types.ObjectId],
    default: [],
    ref: "ToppingGroup"
  },

  rating_average: { 
    type: Number, 
    min: [1, "Rating must be a bove 1.0"], 
    max: [5, 'Rating must be below 5 '], 
    // 4.334566 => 4.3
    set: (val) => Math.round(val * 10) / 10 },

  schedule: [DayScheduleSchema],
})



// Document middleware: runs before .save(). and .create
ItemSchema.pre('save', function(next) {
  this.itemSlug = slugify(this.itemName, {lower: true})
  this.normalizedItemName = removeVietnameseTones(this.itemName)
  next()
})

module.exports = mongoose.model("Item", ItemSchema);
