const transactionModel = require("../Transaction");
const { getSelectData } = require("../../utils");

const createTransaction = async ({ order, type, amount, payer, receiver }) => {
  return await transactionModel.create({
    order,
    type,
    amount,
    payer,
    receiver,
  });
};

const findAllTransactions = async ({ filter = {}, page = 1, limit = 10, select = [] }) => {
  limit = Number(limit);
  page = Number(page);
  const skip = (page - 1) * limit;

  const totalItems = await transactionModel.countDocuments(filter);
  const totalPages = Math.ceil(totalItems / limit);

  const data = await transactionModel.find(filter)
    .select(getSelectData(select))
    .populate("payer", "fullName role")
    .populate("receiver", "fullName role")
    .populate("order", "code totalAmount status")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    data,
    page,
    limit,
    totalPages,
    totalItems
  };
};

const findByUserId = async (userId) => {
  return await transactionModel.find({
    $or: [
      { payer: userId },
      { receiver: userId }
    ]
  })
  .populate("order", "code totalAmount status")
  .sort({ createdAt: -1 })
  .lean();
};

module.exports = {
  createTransaction,
  findAllTransactions,
  findByUserId
};
