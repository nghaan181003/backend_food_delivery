const { Schema, model, Types } = require('mongoose');

const DOCUMENT_NAME = 'Transaction';
const COLLECTION_NAME = 'Transactions';

const transactionSchema = new Schema({
  order: { type: Types.ObjectId, ref: 'Order', required: true },
  type: { type: String, enum: ['payment', 'payout', 'refund'], required: true },
  amount: { type: Number, required: true },

  payer: { type: Types.ObjectId, ref: 'User' },
  receiver: { type: Types.ObjectId, ref: 'User' },
}, {
  collection: COLLECTION_NAME,
  timestamps: true
});

module.exports = model(DOCUMENT_NAME, transactionSchema);
