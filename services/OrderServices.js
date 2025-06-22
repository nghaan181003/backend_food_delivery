const Order = require("../models/Order");
const mapService = require("../services/location.service");
const UpdatedPartner = require("../models/UpdatedPartner");
const UpdatedDriver = require("../models/UpdatedDriver");
const ConfigService = require("../services/config.service");
const mongoose = require("mongoose");
const { StatusCodes } = require("http-status-codes");
const OrderItem = require("../models/OrderItem");
const OrderQueue = require("../queue/order.queue");
const CONSTANTS = require("../config/constants");
const { getRedis } = require("../dbs/init.redis");


const createOrder = async (orderData, socketIO) => {
  try {
    if (!orderData.restaurantId) {
      throw new Error("Restaurant ID is required");
    }

    const restaurant = await UpdatedPartner.findById(orderData.restaurantId).select('latitude longitude');
    if (!restaurant) {
      throw new Error("Restaurant not found in UpdatedPartner");
    }
    const orderDataWithCoordinates = {
      ...orderData,
      restLatitude: restaurant.latitude,
      restLongitude: restaurant.longitude
    };

    const newOrder = await Order.create(orderDataWithCoordinates);

    if (!newOrder) {
      throw new Error("Failed to create order");
    }

    const detailOrder = await getOrderById(newOrder._id);

    OrderQueue.addNewOrder(detailOrder)
    // Tự động phân đơn
    if (newOrder.custStatus === "waiting") {
      await assignOrderService(newOrder._id, socketIO);
    }

    return newOrder;
  } catch (error) {
    console.error("Error creating order:", error.message);
    throw error;
  }
};

const assignOrderService = async (orderId, socketIO, maxRetries = 5, retryCount = 0, excludedDriverIds = []) => {
  const order = await Order.findById(orderId);
  if (!order || order.custStatus !== "waiting") {
    console.log("Đơn hàng không hợp lệ hoặc đã được gán");
  }

  if (retryCount >= maxRetries) {
    order.custStatus = "cancelled";
    order.driverStatus = "cancelled";
    order.restStatus = "cancelled";
    order.reason = "Không tìm thấy tài xế giao hàng";
    await order.save();
    socketIO.emit("order:updateStatus", order);

    console.log(`Đơn hàng ${orderId} đã bị hủy do không tìm thấy tài xế sau ${maxRetries} lần thử`);
    return { orderId, status: "cancelled" };
  }

  const query = { status: true };
  if (excludedDriverIds.length > 0) {
    query._id = { $nin: excludedDriverIds };
  }

  const nearbyDrivers = await UpdatedDriver.find(query)
    .populate({ path: "userId", select: "name email phone" })
    .limit(10);

  if (nearbyDrivers.length === 0) {
    setTimeout(
      () => assignOrderService(orderId, socketIO, maxRetries, retryCount + 1, excludedDriverIds),
      300000
    );
    console.warn("Không có tài xế trong phạm vi");
    return { orderId, status: "retrying", retryCount: retryCount + 1 };
  }

  let selectedDriver = null;
  let minDistance = Infinity;
  for (const driver of nearbyDrivers) {
    const activeOrders = await Order.countDocuments({
      assignedShipperId: driver._id,
      driverStatus: { $in: ["heading_to_rest", "delivering"] },
    });
    if (activeOrders > 0) continue;

    try {
      const distanceResult = await mapService.getRoadDistanceBetweenPoints(
        { lat: driver.location.coordinates[1], lng: driver.location.coordinates[0] },
        { lat: order.restLatitude, lng: order.restLongitude }
      );

      if (distanceResult.distance < minDistance) {
        selectedDriver = driver;
      }
    } catch (error) {
      continue;
    }
  }

  if (selectedDriver) {
    order.assignedShipperId = selectedDriver._id;
    await order.save();
    console.log(`Đơn hàng ${orderId} đã được gán cho tài xế ${selectedDriver.userId.email}`);
    const io = socketIO;

    try {
      const detailOrder = await getOrderById(orderId);

      if (!detailOrder) {
        console.log(`Order not found: ${detailOrder.orderId}`);
        return;
      }

      if (detailOrder.assignedShipperId) {
        io.to(selectedDriver._id.toString()).emit("order:newOrderAssigned", detailOrder);
        console.log(`Order ${detailOrder.orderId} assigned to driver ${detailOrder.driverName} on room ${selectedDriver._id.toString()}`);
      }
    } catch (error) {
      console.error(`Error updating order status: ${error.message}`);
    }

    setTimeout(async () => {
      try {
        const updatedOrder = await Order.findById(orderId);
        if (!updatedOrder) {
          console.error(`Đơn hàng ${orderId} không tồn tại khi kiểm tra sau 15 giây`);
          return;
        }

        if (
          updatedOrder.assignedShipperId != null &&
          updatedOrder.driverStatus === "waiting" &&
          updatedOrder.custStatus === "waiting"
        ) {
          const oldDriverId = updatedOrder.assignedShipperId.toString();
          updatedOrder.assignedShipperId = null;
          updatedOrder.custStatus = "waiting";
          updatedOrder.driverStatus = "waiting";
          updatedOrder.restStatus = "new";
          await updatedOrder.save();
          console.log(`Tài xế ${oldDriverId} không nhận đơn ${orderId}, gán lại đơn hàng`);

          await assignOrderService(orderId, socketIO, maxRetries, retryCount + 1, [...excludedDriverIds, oldDriverId]);
        }
      } catch (error) {
        console.error(`Lỗi khi kiểm tra trạng thái đơn hàng ${orderId} sau 15 giây: ${error.message}`);
      }
    }, 20000);
  }
};

const updateOrderStatus = async (orderId, statusUpdates) => {
  try {
    const validStatuses = ["custStatus", "driverStatus", "restStatus"];

    const updates = Object.keys(statusUpdates).reduce((acc, key) => {
      if (validStatuses.includes(key)) {
        acc[key] = statusUpdates[key];
      }
      return acc;
    }, {});

    if (statusUpdates.assignedShipperId) {
      updates.assignedShipperId = statusUpdates.assignedShipperId;
    }

    if (statusUpdates.reason) {
      updates.reason = statusUpdates.reason;
    }

    if (statusUpdates.driverLat) {
      updates.shipperLatitude = statusUpdates.driverLat;
    }

    if (statusUpdates.driverLng) {
      updates.shipperLongitude = statusUpdates.driverLng;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No valid statuses provided for update");
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updates, {
      new: true,
    });


    if (!updatedOrder) {
      throw new Error("Order not found or update failed");
    }

    return updatedOrder;
  } catch (error) {
    console.error("Error updating order status:", error.message);
    throw error;
  }
};

const updateCustomerAddress = async (orderId, custAddress, custLat, custLng) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error("Invalid order ID format");
    }

    // Fetch the order to get restaurantId
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    if (!order.restaurantId) {
      throw new Error("Order is missing restaurantId");
    }

    // Calculate delivery fee
    const deliveryFeeResult = await calculateDeliveryFee({
      customerLat: custLat,
      customerLng: custLng,
      restaurantId: order.restaurantId,
    });

    // Update the order with new address and delivery fee
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        custAddress,
        custLat,
        custLng,
        deliveryFee: deliveryFeeResult.deliveryFee,
      },
      { new: true }
    );

    if (!updatedOrder) {
      throw new Error("Order not found");
    }

    return updatedOrder;
  } catch (error) {
    console.error("Error updating customer address:", error.message);
    throw error;
  }
};

const calculateDeliveryFee = async ({ customerLat, customerLng, restaurantId }) => {
  try {
    // Validate input
    if (customerLat == null || customerLng == null || !restaurantId) {
      throw new Error("Missing required fields: customerLat, customerLng, or restaurantId");
    }

    if (typeof customerLat !== "number" || typeof customerLng !== "number") {
      throw new Error("Invalid coordinates: customerLat and customerLng must be numbers");
    }

    // Fetch restaurant details
    const restaurant = await UpdatedPartner.findById(restaurantId).lean();
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }
    if (!restaurant.latitude || !restaurant.longitude) {
      throw new Error("Restaurant missing coordinates");
    }

    // Fetch delivery fee configuration
    const config = await ConfigService.getDeliveryFeeConfig();
    console.log("Config:", config);
    if (!config || !config.data) {
      throw new Error("Delivery fee configuration not found");
    }

    // Calculate distance
    const distanceResult = await mapService.getRoadDistanceBetweenPoints(
      { lat: customerLat, lng: customerLng },
      { lat: restaurant.latitude, lng: restaurant.longitude }
    );

    if (!distanceResult || typeof distanceResult.distance !== "number") {
      throw new Error("Invalid distance result from map service");
    }

    const distance = distanceResult.distance;

    // Calculate delivery fee
    const { baseFee, additionalFeePerKm, surcharge } = config.data;
    const extraDistance = Math.max(0, distance - 1);
    let deliveryFee = baseFee + extraDistance * additionalFeePerKm + surcharge;

    // Apply min/max fee caps (10,000 to 100,000 VNĐ)
    deliveryFee = Math.max(10000, Math.min(100000, deliveryFee));

    return {
      distance: Number(distance.toFixed(2)),
      deliveryFee: Number(deliveryFee.toFixed(0)),
    };
  } catch (error) {
    console.error("Error calculating delivery fee:", error.message);
    throw error;
  }
};

const updatePaymentStatus = async (orderId, paymentStatus) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error("Invalid order ID format");
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { paymentStatus },
      { new: true }
    );

    if (!updatedOrder) {
      throw new Error("Order not found or update failed");
    }

    return updatedOrder;
  } catch (error) {
    console.error("Error updating payment status:", error.message);
    throw error;
  }
};

const updateDriverLocation = async (orderId, { shipperLatitude, shipperLongitude, timestamp }) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error("Invalid order ID format");
    }
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        shipperLatitude,
        shipperLongitude,
        lastLocationUpdate: timestamp,
      },
      { new: true }
    );
    if (!updatedOrder) {
      throw new Error("Order not found or update failed");
    }
    return updatedOrder;
  } catch (error) {
    console.error("Error updating driver location:", error.message);
    throw error;
  }
};

const updateOrder = async (orderId, orderUpdates) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(orderId, orderUpdates, {
      new: true,
    });

    if (!updatedOrder) {
      throw new Error("Order not found or update failed");
    }

    return updatedOrder;
  } catch (error) {
    console.error("Error updating order:", error.message);
    throw error;
  }
};

const getOrdersByDriverId = async (driverId, driverStatus) => {
  const filter = { assignedShipperId: driverId, isDeleted: false };

  if (driverStatus) {
    if (Array.isArray(driverStatus)) {
      filter.driverStatus = { $in: driverStatus };
    } else {
      filter.driverStatus = driverStatus;
    }
  }

  const orders = await Order.find(filter)
    .populate({ path: "customerId", select: "name phone" })
    .populate({
      path: "restaurantId",
      select: "userId detailAddress provinceId districtId communeId fullAddress",
      populate: { path: "userId", select: "name" },
    })
    .populate({
      path: "orderItems.itemId",
      select: "itemName",
    })
    .populate({
      path: "assignedShipperId",
      select: "userId licensePlate profileUrl",
      populate: { path: "userId", select: "name phone" },
    });

  const ordersDetails = orders.map((order) => ({
    id: order._id,
    customerName: order.customerId?.name || "Unknown",
    custPhone: order.customerId?.phone || "Unknown",
    restaurantName: order.restaurantId?.userId?.name || "Unknown",
    restDetailAddress: order.restaurantId?.detailAddress || "Unknown",
    restProvinceId: order.restaurantId?.provinceId || "Unknown",
    restDistrictId: order.restaurantId?.districtId || "Unknown",
    restCommuneId: order.restaurantId?.communeId || "Unknown",
    driverName: order.assignedShipperId?.userId?.name || "Unknown",
    driverPhone: order.assignedShipperId?.userId?.phone || "Unknown",
    driverLicensePlate: order.assignedShipperId?.licensePlate || "Unknown",
    driverProfileUrl: order.assignedShipperId?.profileUrl || "Unknown",
    custShipperRating: order.custShipperRating,
    custResRating: order.custResRating,
    custAddress: order.custAddress || "Unknown",
    custResRatingComment: order.custResRatingComment || "Unknown",
    custShipperRatingComment: order.custShipperRatingComment || "Unknown",
    deliveryFee: order.deliveryFee,
    orderDatetime: order.orderDatetime,
    note: order.note,
    reason: order.reason || "",
    custStatus: order.custStatus,
    driverStatus: order.driverStatus,
    restStatus: order.restStatus,
    orderItems: order.orderItems.map((item) => ({
      itemName: item.itemId?.itemName || "Unknown",
      quantity: item.quantity,
      price: item.price,
      totalPrice: item.totalPrice,
      id: item._id,
      toppings: item.toppings.map((topping) => ({
        tpName: topping.tpName,
        tpPrice: topping.tpPrice
      }))
    })),
    totalPrice: order.totalPrice,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    custLatitude: order.custLatitude,
    custLongitude: order.custLongitude,
    restLatitude: order.restLatitude,
    restLongitude: order.restLongitude,
    shipperLatitude: order.shipperLatitude,
    shipperLongitude: order.shipperLongitude,
    restAddress: order.restaurantId?.fullAddress || "Unknown",
  }));

  return ordersDetails;
};

const getOrdersByCustomerId = async (customerId, custStatus) => {
  const filter = { customerId, isDeleted: false };

  if (custStatus) {
    if (Array.isArray(custStatus)) {
      filter.custStatus = { $in: custStatus };
    } else {
      filter.custStatus = custStatus;
    }
  }

  const orders = await Order.find(filter)
    .populate({ path: "customerId", select: "name phone" })
    .populate({
      path: "restaurantId",
      select: "userId detailAddress provinceId districtId communeId",
      populate: { path: "userId", select: "name" },
    })
    .populate({
      path: "orderItems.itemId",
      select: "itemName",
    })
    .populate({
      path: "assignedShipperId",
      select: "userId licensePlate profileUrl",
      populate: { path: "userId", select: "name phone" },
    });

  const ordersDetails = orders.map((order) => ({
    id: order._id,
    customerName: order.customerId?.name || "Unknown",
    custAddress: order.custAddress || "Unknown",
    custPhone: order.customerId?.phone || "Unknown",
    restaurantName: order.restaurantId?.userId?.name || "Unknown",
    restDetailAddress: order.restaurantId?.detailAddress || "Unknown",
    restProvinceId: order.restaurantId?.provinceId || "Unknown",
    restDistrictId: order.restaurantId?.districtId || "Unknown",
    restCommuneId: order.restaurantId?.communeId || "Unknown",
    driverName: order.assignedShipperId?.userId?.name || "Unknown",
    driverPhone: order.assignedShipperId?.userId?.phone || "Unknown",
    driverLicensePlate: order.assignedShipperId?.licensePlate || "Unknown",
    driverProfileUrl: order.assignedShipperId?.profileUrl || "Unknown",
    custShipperRating: order.custShipperRating,
    custResRating: order.custResRating,
    custResRatingComment: order.custResRatingComment || "Unknown",
    custShipperRatingComment: order.custShipperRatingComment || "Unknown",
    deliveryFee: order.deliveryFee,
    orderDatetime: order.orderDatetime,
    note: order.note,
    reason: order.reason || "",
    custStatus: order.custStatus,
    driverStatus: order.driverStatus,
    restStatus: order.restStatus,
    orderItems: order.orderItems.map((item) => ({
      itemName: item.itemId?.itemName || "Unknown",
      quantity: item.quantity,
      price: item.price,
      totalPrice: item.totalPrice,
      id: item._id,
      toppings: item.toppings.map((topping) => ({
        tpName: topping.tpName,
        tpPrice: topping.tpPrice
      }))
    })),
    totalPrice: order.totalPrice,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    custLatitude: order.custLatitude,
    custLongitude: order.custLongitude,
    restLatitude: order.restLatitude,
    restLongitude: order.restLongitude,
    shipperLatitude: order.shipperLatitude,
    shipperLongitude: order.shipperLongitude,
    assignedShipperId: order.assignedShipperId?._id,
    restaurantId: order.restaurantId?._id,
  }));

  return ordersDetails;
};


const getOrdersByPartnerId = async (restaurantId, isDeleted) => {
  try {
    const orders = await Order.find({ restaurantId: restaurantId, isDeleted })
      .populate({ path: "restaurantId", select: "name phone" })
      .populate({
        path: "restaurantId",
        select: "userId detailAddress provinceId districtId communeId",
        populate: { path: "userId", select: "name" },
      })
      .populate({
        path: "orderItems.itemId",
        select: "itemName",
      })
      .populate({
        path: "assignedShipperId",
        select: "userId licensePlate profileUrl",
        populate: { path: "userId", select: "name phone" },
      });

    if (!orders || orders.length === 0) {
      throw new Error("No orders found for this restaurant.");
    }

    const ordersDetails = orders.map((order) => {
      return {
        id: order._id,
        customerName: order.customerId?.name || "Unknown",
        custPhone: order.customerId?.phone || "Unknown",
        restaurantName: order.restaurantId?.userId?.name || "Unknown",
        restDetailAddress: order.restaurantId?.detailAddress || "Unknown",
        restProvinceId: order.restaurantId?.provinceId || "Unknown",
        restDistrictId: order.restaurantId?.districtId || "Unknown",
        restCommuneId: order.restaurantId?.communeId || "Unknown",
        driverName: order.assignedShipperId?.userId?.name || "Unknown",
        driverPhone: order.assignedShipperId?.userId?.phone || "Unknown",
        driverLicensePlate: order.assignedShipperId?.licensePlate || "Unknown",
        driverProfileUrl: order.assignedShipperId?.profileUrl || "Unknown",
        custShipperRating: order.custShipperRating,
        custResRatingComment: order.custResRatingComment || "Unknown",
        custShipperRatingComment: order.custShipperRatingComment || "Unknown",
        custResRating: order.custResRating,
        deliveryFee: order.deliveryFee,
        orderDatetime: order.orderDatetime,
        note: order.note,
        reason: order.reason || "",
        custStatus: order.custStatus,
        driverStatus: order.driverStatus,
        restStatus: order.restStatus,
        orderItems: order.orderItems.map((item) => ({
          itemName: item.itemId?.itemName || "Unknown",
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.totalPrice,
          id: item._id,
          toppings: item.toppings.map((topping) => ({
            tpName: topping.tpName,
            tpPrice: topping.tpPrice
          }))
        })),
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
      };
    });

    return ordersDetails;
  } catch (error) {
    console.error("Error fetching orders by partner ID:", error.message);
    throw error;
  }
};

const getOrderDetails = async (orderId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error("Invalid order ID format");
    }

    const order = await Order.findById(orderId).populate(
      "customer_id restaurant_id assigned_shipper_id"
    );

    if (!order) {
      throw new Error("Order not found");
    }

    return order;
  } catch (error) {
    console.error("Error fetching order details:", error.message);
    throw error;
  }
};

const getOrdersByDriverStatus = async (status, isDeleted) => {
  try {
    const orders = await Order.find({ driverStatus: status, isDeleted })
      .populate({ path: "customerId", select: "name phone" })
      .populate({
        path: "restaurantId",
        select: "userId detailAddress provinceId districtId communeId fullAddress",
        populate: { path: "userId", select: "name" },
      })
      .populate({
        path: "orderItems.itemId",
        select: "itemName",
      });

    if (!orders || orders.length === 0) {
      throw new Error("No orders found with the specified status");
    }

    return orders;
  } catch (error) {
    console.error("Error fetching orders by status:", error.message);
    throw error;
  }
};

const getOrderByPartnerStatus = async (partnerId, status, page = 1, limit = 10, isDeleted) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      throw new Error("Invalid restaurantId format");
    }

    const statusArray = Array.isArray(status)
      ? status
      : status.split(',').map((s) => s.trim());

    const skip = (page - 1) * limit;

    const orders = await Order.find({
      restaurantId: partnerId,
      restStatus: { $in: statusArray },
      assignedShipperId: { $ne: null },
      isDeleted
    })
      .skip(skip)
      .limit(limit)
      .sort({ orderDatetime: -1 });

    const detailedOrders = [];

    for (let order of orders) {
      const detail = await getOrderById(order._id);
      detailedOrders.push(detail);
    }

    const totalCount = await Order.countDocuments({
      restaurantId: partnerId,
      restStatus: { $in: statusArray },
      assignedShipperId: { $ne: null },
    });

    return {
      orders: detailedOrders,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    };
  } catch (e) {
    throw e;
  }
};



const getOrderById = async (orderId) => {
  try {
    const order = await Order.findById(orderId)
      .populate({ path: "customerId", select: "name phone" })
      .populate({
        path: "restaurantId",
        select: "userId detailAddress provinceId districtId communeId fullAddress",
        populate: { path: "userId", select: "name" },
      })
      .populate({
        path: "orderItems.itemId",
        select: "itemName",
      })
      .populate({
        path: "assignedShipperId",
        select: "userId assignedShipperId licensePlate profileUrl",
        populate: { path: "userId", select: "name phone" },
      });
    if (!order) {
      throw new Error("Order not found");
    }

    const orderDetails = {
      id: order._id,
      customerName: order.customerId?.name || "Unknown",
      custAddress: order.custAddress || "Unknown",
      custPhone: order.customerId?.phone || "Unknown",
      restaurantId: order.restaurantId?._id || "Unknown",
      restaurantName: order.restaurantId?.userId?.name || "Unknown",
      restDetailAddress: order.restaurantId?.detailAddress || "Unknown",
      restProvinceId: order.restaurantId?.provinceId || "Unknown",
      restDistrictId: order.restaurantId?.districtId || "Unknown",
      restCommuneId: order.restaurantId?.communeId || "Unknown",
      assignedShipperId: order.assignedShipperId?._id,
      driverName: order.assignedShipperId?.userId?.name || "Unknown",
      driverPhone: order.assignedShipperId?.userId?.phone || "Unknown",
      driverLicensePlate: order.assignedShipperId?.licensePlate || "Unknown",
      driverProfileUrl: order.assignedShipperId?.profileUrl || "Unknown",
      custShipperRating: order.custShipperRating,
      custResRating: order.custResRating,
      deliveryFee: order.deliveryFee,
      custResRatingComment: order.custResRatingComment || "Unknown",
      custShipperRatingComment: order.custShipperRatingComment || "Unknown",
      orderDatetime: order.orderDatetime,
      note: order.note,
      reason: order.reason || "",
      custStatus: order.custStatus,
      driverStatus: order.driverStatus,
      restStatus: order.restStatus,

      orderItems: order.orderItems.map((item) => ({
        foodId: item.itemId._id || "",
        itemName: item.itemId?.itemName || "Unknown",
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice,
        id: item._id,
        toppings: item.toppings.map((topping) => ({
          tpName: topping.tpName,
          tpPrice: topping.tpPrice
        }))
      })),
      totalPrice: order.totalPrice,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      restAddress: order.restaurantId.fullAddress || "Unknown",
      custLatitude: order.custLatitude,
      custLongitude: order.custLongitude,
      restLatitude: order.restLatitude,
      restLongitude: order.restLongitude,
      shipperLatitude: order.shipperLatitude,
      shipperLongitude: order.shipperLongitude,
    };

    return orderDetails;
  } catch (error) {
    console.error("Error fetching order by ID:", error.message);
    throw error;
  }
};

const getAllOrders = async (page = 1, limit = 10, isDeleted) => {
  const skip = (page - 1) * limit;
  try {
    const orders = await Order.find({ isDeleted })
      .sort({ orderDatetime: -1 })
      .skip(skip)
      .limit(limit);
    const totalCount = await Order.countDocuments({ isDeleted });
    return {
      orders,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    }
  } catch (error) {
    console.error("Error fetching all orders:", error.message);
    throw error;
  }
};

const updateRating = async (orderId, updates) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (updates.custResRating !== undefined) {
      order.custResRating = updates.custResRating;
    }
    if (updates.custResRatingComment !== undefined) {
      order.custResRatingComment = updates.custResRatingComment;
    }
    if (updates.custShipperRating !== undefined) {
      order.custShipperRating = updates.custShipperRating;
    }
    if (updates.custShipperRatingComment !== undefined) {
      order.custShipperRatingComment = updates.custShipperRatingComment;
    }

    await order.save();
    return order;
  } catch (error) {
    console.error("Update rating fail:", error.message);
    throw error;
  }
};
const getRatingsByItem = async (itemId) => {
  try {
    const orders = await Order.find({
      "orderItems.itemId": itemId,
      custResRating: { $ne: null },
    })
      .populate({ path: "customerId", select: "name phone" })
      .populate({ path: "orderItems.itemId", select: "itemName" });

    if (!orders || orders.length === 0) {
      return { message: "Không tìm thấy đơn hàng chứa sản phẩm này." };
    }

    const ratings = orders.map((order) => ({
      orderId: order._id,
      custResRating: order.custResRating,
      custResRatingComment: order.custResRatingComment,
      customerName: order.customerId?.name || "Unknown",
      custShipperRatingComment: order.custShipperRatingComment,
      custShipperRating: order.custShipperRating,
      orderDatetime: order.orderDatetime,
    }));
    return ratings;
  } catch (error) {
    console.error("Lỗi khi tìm kiếm đơn hàng:", error);
    throw new Error(`Lỗi: ${error.message}`);
  }
};
const getRatingsByRestaurant = async (restaurantId) => {
  try {
    const orders = await Order.find({
      restaurantId: restaurantId,
      custResRating: { $ne: null },
    }).populate({ path: "customerId", select: "name phone" });

    if (!orders || orders.length === 0) {
      throw new Error("No orders found for the specified restaurant.");
    }

    const ratings = orders.map((order) => ({
      orderId: order._id,
      custResRating: order.custResRating,
      custResRatingComment: order.custResRatingComment,
      customerName: order.customerId?.name || "Unknown",
      custShipperRatingComment: order.custShipperRatingComment,
      custShipperRating: order.custShipperRating,
      orderDatetime: order.orderDatetime,
      custId: order.customerId?._id
    }));

    return ratings;
  } catch (error) {
    throw new Error(`Error retrieving ratings: ${error.message}`);
  }
};
const getRatingsByDriver = async (assignedShipperId) => {
  try {
    const orders = await Order.find({
      assignedShipperId: assignedShipperId,
      custShipperRating: { $ne: null },
    }).populate({ path: "customerId", select: "name phone" });

    if (!orders || orders.length === 0) {
      throw new Error("No orders found for the specified restaurant.");
    }

    const ratings = orders.map((order) => ({
      orderId: order._id,
      custResRating: order.custResRating,
      custResRatingComment: order.custResRatingComment,
      customerName: order.customerId?.name || "Unknown",
      custShipperRatingComment: order.custShipperRatingComment,
      custShipperRating: order.custShipperRating,
      orderDatetime: order.orderDatetime,
    }));

    return ratings;
  } catch (error) {
    throw new Error(`Error retrieving ratings: ${error.message}`);
  }
};
const getRatingsByCustomer = async (customerId) => {
  try {
    const orders = await Order.find({
      customerId: customerId,
      custResRating: { $ne: null },
    }).populate({ path: "customerId", select: "name phone" });

    if (!orders || orders.length === 0) {
      throw new Error("No orders found for the specified restaurant.");
    }

    const ratings = orders.map((order) => ({
      orderId: order._id,
      custResRating: order.custResRating,
      custResRatingComment: order.custResRatingComment,
      customerName: order.customerId?.name || "Unknown",
      custShipperRatingComment: order.custShipperRatingComment,
      custShipperRating: order.custShipperRating,
      orderDatetime: order.orderDatetime,
    }));

    return ratings;
  } catch (error) {
    throw new Error(`Error retrieving ratings: ${error.message}`);
  }
};
const getDeliveryStatusByDriver = async (assignedShipperId, startDate, endDate) => {
  try {
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const orders = await Order.find({
      assignedShipperId: assignedShipperId,
      ...(Object.keys(dateFilter).length > 0 && { orderDatetime: dateFilter }),
    }).populate({ path: "customerId", select: "name phone" });

    if (!orders || orders.length === 0) {
      throw new Error("No orders found for the specified restaurant.");
    }

    const statistic = orders.map((order) => ({
      orderId: order._id,
      custResRating: order.custResRating,
      custResRatingComment: order.custResRatingComment,
      customerName: order.customerId?.name || "Unknown",
      custShipperRatingComment: order.custShipperRatingComment,
      custShipperRating: order.custShipperRating,
      orderDatetime: order.orderDatetime,
      status: order.restStatus,
      deliveryFee: order.deliveryFee,
    }));

    return statistic;
  } catch (error) {
    throw new Error(`Error calculating delivery stats: ${error.message}`);
  }
};
const getDeliveryStatusByRestaurant = async (restaurantId, startDate, endDate) => {
  try {
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const orders = await Order.find({
      restaurantId: restaurantId,
      ...(Object.keys(dateFilter).length > 0 && { orderDatetime: dateFilter }),
    }).populate({ path: "customerId", select: "name phone" });

    if (!orders || orders.length === 0) {
      throw new Error("No orders found for the specified restaurant.");
    }

    const statistic = orders.map((order) => ({
      orderId: order._id,
      custResRating: order.custResRating,
      custResRatingComment: order.custResRatingComment,
      customerName: order.customerId?.name || "Unknown",
      custShipperRatingComment: order.custShipperRatingComment,
      custShipperRating: order.custShipperRating,
      orderDatetime: order.orderDatetime,
      status: order.restStatus,
      totalPrice: order.totalPrice,
    }));

    return statistic;
  } catch (error) {
    throw new Error(`Error calculating delivery stats: ${error.message}`);
  }
};

const getOrderStatus = async (isDeleted) => {
  try {
    const orders = await Order.find({ isDeleted });

    if (!orders || orders.length === 0) {
      throw new Error("No orders found.");
    }

    const completedOrdersCount = orders.filter(
      (order) => order.restStatus === "completed"
    ).length;

    const cancelledOrdersCount = orders.filter(
      (order) => order.restStatus === "cancelled"
    ).length;

    const totalOrdersCount = orders.length;

    return {
      totalOrders: totalOrdersCount,
      completedOrders: completedOrdersCount,
      cancelledOrders: cancelledOrdersCount,
    };
  } catch (error) {
    throw new Error(`Error calculating order stats: ${error.message}`);
  }
};
const getRestaurantsWithHighRatings = async () => {
  try {
    const highRatedRestaurants = await Order.aggregate([
      {
        $match: {
          custResRating: { $gte: 1 },
        },
      },
      {
        $group: {
          _id: "$restaurantId",
          averageRating: { $avg: "$custResRating" },
          totalOrders: { $sum: 1 },
        },
      },
      {
        $match: {
          averageRating: { $gt: 3 },
        },
      },
      {
        $lookup: {
          from: "updatedpartners",
          localField: "_id",
          foreignField: "_id",
          as: "restaurantDetails",
        },
      },
      {
        $unwind: "$restaurantDetails",
      },
      {
        $lookup: {
          from: "users",
          localField: "restaurantDetails.userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      {
        $project: {
          _id: 0,
          restaurantId: "$_id",
          averageRating: 1,
          totalOrders: 1,
          restaurantName: "$restaurantDetails.name",
          restaurantPhone: "$restaurantDetails.phone",
          userName: "$userDetails.name",
          restaurantURL: "$restaurantDetails.storeFront"
        },
      },
    ]);

    return highRatedRestaurants;
  } catch (error) {
    throw new Error(`Error fetching high-rated restaurants: ${error.message}`);
  }
};

const getAllOrderByStatus = async ({ page = 1, limit = 10, status }) => {
  const skip = (page - 1) * limit;

  const statusFilter = status
    ? {
      $or: [
        { restStatus: status },
        { driverStatus: status },
        { custStatus: status },
      ],
    }
    : {};

  const filter = {
    ...statusFilter,
    isDeleted: false,
  };

  try {
    const orders = await Order.find(filter)
      .sort({ orderDatetime: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Order.countDocuments(filter);

    return {
      orders,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    };
  } catch (error) {
    console.error("Error fetching orders by status:", error.message);
    throw error;
  }
};

const searchOrderById = async ({ page = 1, limit = 10, id, isDeleted }) => {
  const skip = (page - 1) * limit;

  try {
    let filter = { isDeleted };

    if (id) {
      filter = {
        ...filter,
        $expr: {
          $regexMatch: {
            input: { $toString: '$_id' },
            regex: id,
            options: 'i',
          },
        },
      };
    }

    const orders = await Order.find(filter)
      .sort({ orderDatetime: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Order.countDocuments(filter);

    return {
      orders,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    };
  } catch (error) {
    console.error("Error searching orders by ID:", error.message);
    throw error;
  }
};


const deleteOrderById = async (id) => {
  try {
    const order = await Order.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!order) {
      return null;
    }
    return order;
  } catch (e) {
    throw new Error("Lỗi khi xóa đơn hàng");
  }
}

const saveSuggestion = async (driverId, orderId, suggestionData) => {
  try {
    const key = CONSTANTS.KEYS.ORDER_SUGGESTIONS + `${driverId}:${orderId}`
    await getRedis().set(key, JSON.stringify(suggestionData));
  }
  catch (e) {
    console.log(e)
  }

}

const getSuggesttion = async (driverId, orderId) => {
  const key = CONSTANTS.KEYS.ORDER_SUGGESTIONS + `${driverId}:${orderId}`
  const data = await getRedis().get(key);
  return data ? JSON.parse(data) : null;
}

const removeSuggestion = async (driverId, orderId) => {
  const key = CONSTANTS.KEYS.ORDER_SUGGESTIONS + `${driverId}:${orderId}`;
  await getRedis().del(key);
}

const rejectDriver = async (driverId, orderId) => {
  try {
    const key = CONSTANTS.KEYS.REJECTED_DRIVERS + `${orderId}`

    await getRedis().sadd(key, driverId)
    await getRedis().expire(key, 86400)
  }
  catch (e) {
    console.log(e)
  }
}

const getRejectedDrivers = async (orderId) => {
  const key = CONSTANTS.KEYS.REJECTED_DRIVERS + `${orderId}`
  return await getRedis().smembers(key);
};


const updateDriverLocationService = async (userId, location) => {
  try {
    const updatedDriver = await UpdatedDriver.findOneAndUpdate(
      { userId },
      {
        $set: {
          location: {
            type: 'Point',
            coordinates: [location.coordinates[0], location.coordinates[1]],
          },
        },
      },
    );

    if (!updatedDriver) {
      throw new Error("Driver not found.");
    }

    return updatedDriver;
  } catch (error) {
    console.error("Error updating driver location:", error);
    throw error;
  }
};

const getDailyRevenueBypartner = async (restaurantId, month, year) => {
  const startDate = new Date(`${year}-${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const result = await Order.aggregate([
    {
      $match: {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        restStatus: "completed",
        isDeleted: false,
        orderDatetime: { $gte: startDate, $lt: endDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$orderDatetime" },
        },
        totalRevenue: { $sum: "$totalPrice" },
      },
    },
    {
      $sort: { _id: 1 },
    },
    {
      $project: {
        _id: 0,
        date: "$_id",
        revenue: "$totalRevenue",
      },
    },
  ])
  return result;
}

const getDailyRevenueInAdmin = async (month, year) => {
  const startDate = new Date(`${year}-${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const result = await Order.aggregate([
    {
      $match: {
        restStatus: "completed",
        isDeleted: false,
        orderDatetime: { $gte: startDate, $lt: endDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$orderDatetime" },
        },
        totalRevenue: { $sum: "$totalPrice" },
      },
    },
    {
      $sort: { _id: 1 },
    },
    {
      $project: {
        _id: 0,
        date: "$_id",
        revenue: "$totalRevenue",
      },
    },
  ])
  return result;
}

const getDailyOrderStatusInAdmin = async (month, year) => {
  const startDate = new Date(`${year}-${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const result = await Order.aggregate([
    {
      $match: {
        isDeleted: false,
        orderDatetime: { $gte: startDate, $lt: endDate },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$orderDatetime" } },
          status: "$custStatus",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.date",
        statuses: {
          $push: {
            status: "$_id.status",
            count: "$count",
          },
        },
        total: { $sum: "$count" }
      },
    },
    {
      $project: {
        _id: 0,
        date: "$_id",
        delivered: {
          $let: {
            vars: {
              delivered: {
                $filter: {
                  input: "$statuses",
                  as: "s",
                  cond: { $eq: ["$$s.status", "delivered"] },
                },
              },
            },
            in: {
              $ifNull: [{ $arrayElemAt: ["$$delivered.count", 0] }, 0],
            },
          },
        },
        cancelled: {
          $let: {
            vars: {
              cancelled: {
                $filter: {
                  input: "$statuses",
                  as: "s",
                  cond: { $eq: ["$$s.status", "cancelled"] },
                },
              },
            },
            in: {
              $ifNull: [{ $arrayElemAt: ["$$cancelled.count", 0] }, 0],
            },
          },
        },
        total: 1
      },
    },
    {
      $addFields: {
        delivering: {
          $subtract: [
            "$total",
            { $add: ["$delivered", "$cancelled"] }
          ]
        }
      },
    },
    {
      $sort: { date: 1 },
    }
  ]);

  return result;
};

module.exports = {
  removeSuggestion,
  getSuggesttion,
  createOrder,
  updateOrder,
  getOrderDetails,
  getOrdersByCustomerId,
  getOrdersByPartnerId,
  getOrdersByDriverStatus,
  getAllOrders,
  updateOrderStatus,
  getOrderById,
  getOrdersByDriverId,
  getOrderByPartnerStatus,
  updateRating,
  getRatingsByItem,
  getRatingsByRestaurant,
  getRatingsByDriver,
  getRatingsByCustomer,
  getDeliveryStatusByDriver,
  getDeliveryStatusByRestaurant,
  getOrderStatus,
  getRestaurantsWithHighRatings,
  updateDriverLocation,
  getAllOrderByStatus,
  searchOrderById,
  updatePaymentStatus,
  updateCustomerAddress,
  deleteOrderById,
  saveSuggestion,
  updateDriverLocationService,
  getDailyRevenueBypartner,
  rejectDriver,
  getRejectedDrivers,
  getDailyRevenueInAdmin,
  getDailyOrderStatusInAdmin
};
