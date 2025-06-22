const Balance = require('../models/Balance');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const UpdatedPartner = require('../models/UpdatedPartner');
const UpdatedDriver = require('../models/UpdatedDriver');

const getWalletInfo = async (userId) => {
  let foundBalance = null;

  foundBalance = await Balance.findOne({ user: userId });

  if (!foundBalance) {
    const partner = await UpdatedPartner.findOne({ userId: userId });
    if (partner) {
      foundBalance = await Balance.findOne({ user: partner._id });
    }
  }

  if (!foundBalance) {
    const driver = await UpdatedDriver.findOne({ userId: userId });
    if (driver) {
      foundBalance = await Balance.findOne({ user: driver._id });
    }
  }

  if (!foundBalance) {
    return {
      walletOwnerId: userId,
      balance: 0,
      transactions: [],
    };
  }

  const walletOwnerId = foundBalance.user;
  const balanceAmount = foundBalance.amount;

  const transactions = await Transaction.find({
    $or: [{ payer: walletOwnerId }, { receiver: walletOwnerId }],
  })
    .populate('order', '_id reason')
    .sort({ createdAt: -1 });

  const mappedTransactions = transactions.map((tx) => ({
    _id: tx._id,
    orderId: tx.order?._id || null,
    type: tx.type,
    amount: tx.amount,
    reason: tx.order?.reason || null,
    payer: tx.payer,
    receiver: tx.receiver,
    createdAt: tx.createdAt,
  }));

  return {
    walletOwnerId,
    balance: balanceAmount,
    transactions: mappedTransactions,
  };
};

module.exports = { getWalletInfo };

