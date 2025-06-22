const BalanceModel = require("../Balance");

const increaseBalance = async (userId, amount) => {
  return await BalanceModel.findOneAndUpdate(
    { user: userId },
    { $inc: { amount: amount } },
    { upsert: true, new: true }
  );
};

const decreaseBalance = async (userId, amount) => {
  return await BalanceModel.findOneAndUpdate(
    { user: userId, amount: { $gte: amount } },
    { $inc: { amount: -amount } },
    { new: true }
  );
};

const getBalanceByUser = async (userId) => {
  return await BalanceModel.findOne({ user: userId }).lean();
};

module.exports = {
  increaseBalance,
  decreaseBalance,
  getBalanceByUser
};
