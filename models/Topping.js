const { Schema, model, Types } = require('mongoose');

const DOCUMENT_NAME = "Topping"
const COLLECTION_NAME = 'Toppings'

const toppingSchema = new Schema({
    tpName: { type: String, required: true },
    tpPrice: { type: Number, default: 0 },
    tpImage: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    isDelete: { type: Boolean, default: false },

    tpGroupId: { type: Types.ObjectId, ref: "ToppingGroup" },
},
    {
        collection: COLLECTION_NAME,
    })

const ToppingModel = model(DOCUMENT_NAME, toppingSchema);
module.exports = {
    ToppingModel,
    toppingSchema
};
