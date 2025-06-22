const mongoose = require('mongoose');

const DOCUMENT_NAME = 'Config';
const COLLECTION_NAME = 'Configs';

const configSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['DELIVERY_FEE', 'PROMOTION', 'TAX'], 
    index: true, 
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
}, {
    colletion: COLLECTION_NAME,
    timestamps: true,
});

module.exports = mongoose.model(DOCUMENT_NAME, configSchema);