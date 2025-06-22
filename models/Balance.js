const { Schema, model, Types } = require('mongoose');

const DOCUMENT_NAME = 'Balance';
const COLLECTION_NAME = 'Balances';

const balanceSchema = new Schema({
  user: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
  amount: { type: Number, default: 0 },
}, {
  collection: COLLECTION_NAME,
  timestamps: true
});

module.exports = model(DOCUMENT_NAME, balanceSchema);
