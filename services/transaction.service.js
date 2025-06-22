const mongoose = require('mongoose');
const Balance = require('../models/Balance');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');

const payToRestaurant = async (orderId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error('Order not found');
    if (order.isRestaurantPaid) throw new Error('Restaurant has already been paid');

    const customerId = order.customerId;
    const restaurantId = order.restaurantId;
    const totalAmount = order.totalPrice;

    await Transaction.create(
      [
        {
          order: order._id,
          type: 'payment',
          amount: totalAmount,
          payer: customerId,
          receiver: restaurantId,
        },
      ],
      { session }
    );

    await Balance.updateOne(
      { user: restaurantId },
      { $inc: { amount: totalAmount } },
      { upsert: true, session }
    );

    order.isRestaurantPaid = true;
    await order.save({ session });

    await session.commitTransaction();
    return { orderId, restaurantAmount: totalAmount };
  } catch (error) {
    await session.abortTransaction();
    throw new Error(error.message || 'Restaurant payment failed');
  } finally {
    session.endSession();
  }
};

const payToDriver = async (orderId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error('Order not found');

    const customerId = order.customerId;
    const shipperId = order.assignedShipperId;
    const deliveryFee = order.deliveryFee;

    if (!shipperId) throw new Error('Shipper not assigned');

    await Transaction.create(
      [
        {
          order: order._id,
          type: 'payment',
          amount: deliveryFee,
          payer: customerId,
          receiver: shipperId,
        },
      ],
      { session }
    );

    await Balance.updateOne(
      { user: shipperId },
      { $inc: { amount: deliveryFee } },
      { upsert: true, session }
    );

    await order.save({ session });

    await session.commitTransaction();
    return { orderId, shipperAmount: deliveryFee };
  } catch (error) {
    await session.abortTransaction();
    throw new Error(error.message || 'Driver payment failed');
  } finally {
    session.endSession();
  }
};

const refundOrderPayment = async (orderId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error('Order not found');

    const customerId = order.customerId;
    const deliveryFee = order.deliveryFee;
    const totalAmount = order.totalPrice;

    await Transaction.create(
      [
        {
          order: order._id,
          type: 'refund',
          amount: totalAmount + deliveryFee,
          payer: null,
          receiver: customerId,
        },
      ],
      { session }
    );

    await Balance.updateOne(
      { user: customerId },
      { $inc: { amount: totalAmount + deliveryFee } },
      { upsert: true, session }
    );

    order.paymentStatus = 'refunded';
    await order.save({ session });

    await session.commitTransaction();
    return { orderId, paymentStatus: 'refunded', refundAmount: totalAmount + deliveryFee };
  } catch (error) {
    await session.abortTransaction();
    throw new Error(error.message || 'Refund processing failed');
  } finally {
    session.endSession();
  }
};


module.exports = { payToDriver, payToRestaurant, refundOrderPayment,  };