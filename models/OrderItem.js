const mongoose = require("mongoose");
const { Schema } = mongoose;

const { toppingSchema } = require("./Topping");


const OrderItemSchema = new Schema({
  itemId: {
    type: Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  toppings: [toppingSchema]
});

module.exports = {
  OrderItemSchema,
};
