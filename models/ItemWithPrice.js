const mongoose = require('mongoose');

const DOCUMENT_NAME = "ItemWithPrice"
const COLLECTION_NAME = 'ItemWithPrice'

const itemWithPriceSchema = new mongoose.Schema({}, { collection: COLLECTION_NAME, strict: false });

module.exports = mongoose.model(DOCUMENT_NAME, itemWithPriceSchema);
