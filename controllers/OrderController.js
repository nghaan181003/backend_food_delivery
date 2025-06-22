const AsyncHandler = require("express-async-handler");
const OrderService = require("../services/OrderServices");
const { StatusCodes } = require("http-status-codes");
const ApiResponse = require("./response/ApiResponse");
const ApiError = require("./error/ApiError");
const socketIO = require("../sockets/init.socket");
const Order = require("../models/Order");
const { SuccessResponse, PAGINATED } = require("../core/success.response");
const { payToDriver, payToRestaurant, refundOrderPayment } = require("../services/transaction.service")

// Create a new order
const createOrder = AsyncHandler(async (req, res) => {
  const orderData = req.body;

  try {
    const newOrder = await OrderService.createOrder(orderData, socketIO.io);

    // const io = getIO();
    // const detailOrder = await OrderService.getOrderById(newOrder._id);
    // io.emit("order:new", detailOrder);
    setTimeout(async () => {
      try {
        const order = await Order.findById(newOrder._id);

        if (!order) return;

        const isShipperAssigned = order.assignedShipperId;
        const isStillWaiting = order.driverStatus === 'waiting';

        if (!isShipperAssigned && isStillWaiting) {
          order.driverStatus = 'cancelled';
          order.restStatus = 'cancelled';
          order.custStatus = 'cancelled';
          order.reason = "Không tìm thấy tài xế.";
          await order.save();

          if (order.paymentMethod === 'VNPay' && order.paymentStatus === 'paid') {
            try {
              await refundOrderPayment(order._id);
              console.log(`Đã hoàn tiền đơn ${order._id}`);
            } catch (refundErr) {
              console.error("Lỗi xử lý hoàn tiền:", refundErr.message);
            }
          }

          const io = socketIO.io;
          const detailOrder = await OrderService.getOrderById(order._id);
          io.emit("order:cancelled", detailOrder);

          console.log(`Đơn hàng ${order._id} đã bị hủy`);
        }
      } catch (timeoutError) {
        console.error("Lỗi tự động hủy đơn:", timeoutError.message);
      }
    }, 5 * 60 * 1000);
    res
      .status(StatusCodes.CREATED)
      .json(
        ApiResponse("Order created successfully", newOrder, StatusCodes.CREATED)
      );
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        ApiResponse(
          "Failed to create order",
          null,
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
  }
});

const updateOrderStatus = AsyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { custStatus, driverStatus, restStatus, assignedShipperId, reason, driverLat, driverLng } =
    req.body;

  try {
    const statusUpdates = {
      ...(custStatus && { custStatus }),
      ...(driverStatus && { driverStatus }),
      ...(restStatus && { restStatus }),
      ...(assignedShipperId && { assignedShipperId }),
      ...(reason && { reason }),
      ...(driverLat && { driverLat }),
      ...(driverLng && { driverLng }),
    };


    const updatedOrder = await OrderService.updateOrderStatus(
      orderId,
      statusUpdates
    );

    const order = await Order.findById(updatedOrder._id);

    if (!order) {
      throw new Error("Order không tồn tại");
    }

    if (statusUpdates.restStatus === "completed") {
      if (
        order.paymentMethod === "VNPay" &&
        order.paymentStatus === "paid" && !order.isRestaurantPaid
      ) {
        try {
          await payToRestaurant(order._id);
          console.log("Đã thanh toán tiền cho quán ăn");
        } catch (err) {
          console.error("Lỗi thanh toán quán ăn:", err.message);
        }
      }
    }

    if (statusUpdates.driverStatus === "delivered") {
      if (
        order.paymentMethod === "VNPay" &&
        order.paymentStatus === "paid"
      ) {
        try {
          await payToDriver(order._id);
          console.log("Đã thanh toán tiền cho tài xế");
        } catch (err) {
          console.error("Lỗi thanh toán tài xế:", err.message);
        }
      }
    }
    else if (
      order.paymentMethod === "VNPay" &&
      order.paymentStatus === "paid" &&
      (statusUpdates.driverStatus === "cancelled" || statusUpdates.driverStatus === "approved" || statusUpdates.restStatus === "cancelled" || statusUpdates.custStatus === "cancelled")
    ) {
      try {
        await refundOrderPayment(order._id);
        console.error("Đã hoàn tiền");
      } catch (refundErr) {
        console.error("Lỗi xử lý hoàn tiền:", refundErr.message);
      }
    }

    // const io = getIO();
    const io = socketIO.io;
    const detailOrder = await OrderService.getOrderById(updatedOrder._id);

    io.emit("order:new", detailOrder);

    res
      .status(StatusCodes.OK)
      .json(
        ApiResponse(
          "Trạng thái đơn hàng đã được cập nhật.",
          updatedOrder,
          StatusCodes.OK
        )
      );
  } catch (error) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        ApiResponse(
          error.message || "Cập nhật trạng thái đơn hàng thất bại.",
          null,
          StatusCodes.BAD_REQUEST
        )
      );
  }
});

const updateCustomerAddress = AsyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { custAddress, custLat, custLng } = req.body;

  // Validate input
  if (!custAddress || custLat == null || custLng == null) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        ApiResponse(
          "custAddress, custLat, custLng and deliveryFee are required",
          null,
          StatusCodes.BAD_REQUEST
        )
      );
  }

  try {
    // Update the order with new address and coordinates
    const updatedOrder = await OrderService.updateCustomerAddress(
      orderId,
      custAddress,
      custLat,
      custLng
    );

    // Update the order with the new delivery fee
    // const finalOrder = await OrderService.updateDeliveryFee(orderId, deliveryFee);

    // Emit socket event for order update
    const io = socketIO.io;
    const detailOrder = await OrderService.getOrderById(updatedOrder._id);
    io.emit("order:new", detailOrder);

    // Return success response
    res
      .status(StatusCodes.OK)
      .json(
        ApiResponse(
          "Customer address and delivery fee updated successfully",
          detailOrder,
          StatusCodes.OK
        )
      );
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        ApiResponse(
          error.message || "Failed to update customer address or delivery fee",
          null,
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
  }
});

const updatePaymentStatus = AsyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { paymentStatus } = req.body;

  if (!paymentStatus) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        ApiResponse("paymentStatus is required", null, StatusCodes.BAD_REQUEST)
      );
  }

  try {
    const updatedOrder = await OrderService.updatePaymentStatus(orderId, paymentStatus);

    const io = socketIO.io;
    const detailOrder = await OrderService.getOrderById(updatedOrder._id);

    io.emit("order:new", detailOrder);

    res
      .status(StatusCodes.OK)
      .json(
        ApiResponse(
          "Payment status updated successfully",
          updatedOrder,
          StatusCodes.OK
        )
      );
  } catch (error) {
    res
      .status(StatusCodes.NOT_FOUND)
      .json(
        ApiResponse(
          "Order not found or update failed",
          null,
          StatusCodes.NOT_FOUND
        )
      );
  }
});

// Update an existing order
const updateOrder = AsyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const orderUpdates = req.body;

  try {
    const updatedOrder = await OrderService.updateOrder(orderId, orderUpdates);

    res
      .status(StatusCodes.OK)
      .json(
        ApiResponse("Order updated successfully", updatedOrder, StatusCodes.OK)
      );
  } catch (error) {
    res
      .status(StatusCodes.NOT_FOUND)
      .json(
        ApiResponse(
          "Order not found or update failed",
          null,
          StatusCodes.NOT_FOUND
        )
      );
  }
});

// Update driver location
const updateDriverLocation = AsyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { driverLat, driverLng, timestamp } = req.body;

  if (!driverLat || !driverLng || !timestamp) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        ApiResponse(
          "driverLat, driverLng, and timestamp are required",
          null,
          StatusCodes.BAD_REQUEST
        )
      );
  }

  try {
    const updatedOrder = await OrderService.updateDriverLocation(orderId, {
      shipperLatitude: driverLat,
      shipperLongitude: driverLng,
      timestamp,
    });

    const io = socketIO.io;
    io.to(orderId).emit("driverLocationUpdate", {
      orderId,
      driverLat,
      driverLng,
      timestamp,
    });

    res
      .status(StatusCodes.OK)
      .json(
        ApiResponse(
          "Driver location updated successfully",
          updatedOrder,
          StatusCodes.OK
        )
      );
  } catch (error) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        ApiResponse(
          error.message || "Failed to update driver location",
          null,
          StatusCodes.BAD_REQUEST
        )
      );
  }
});

// Get order details by ID
const getOrderDetails = AsyncHandler(async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await OrderService.getOrderDetails(orderId);

    res
      .status(StatusCodes.OK)
      .json(
        ApiResponse(
          "Order details retrieved successfully",
          order,
          StatusCodes.OK
        )
      );
  } catch (error) {
    res
      .status(StatusCodes.NOT_FOUND)
      .json(ApiResponse("Order not found", null, StatusCodes.NOT_FOUND));
  }
});
const getOrdersByDriverId = AsyncHandler(async (req, res) => {
  const { driverId } = req.params;
  let { driverStatus } = req.query;

  try {
    if (typeof driverStatus === "string" && driverStatus.includes(",")) {
      driverStatus = driverStatus.split(",").map((s) => s.trim());
    }

    const orders = await OrderService.getOrdersByDriverId(driverId, driverStatus);

    res.status(StatusCodes.OK).json(
      ApiResponse("Orders retrieved successfully", orders, StatusCodes.OK)
    );
  } catch (error) {
    console.error("Error fetching orders by driver ID:", error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      ApiResponse("Error fetching orders by driver ID", null, StatusCodes.INTERNAL_SERVER_ERROR)
    );
  }
});


const getOrdersByCustomerId = AsyncHandler(async (req, res) => {
  const { customerId } = req.params;
  let { custStatus } = req.query;

  try {
    if (typeof custStatus === "string" && custStatus.includes(",")) {
      custStatus = custStatus.split(",").map((status) => status.trim());
    }

    const orders = await OrderService.getOrdersByCustomerId(customerId, custStatus);

    res.status(StatusCodes.OK).json(
      ApiResponse("Orders retrieved successfully", orders, StatusCodes.OK)
    );
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      ApiResponse("Server error fetching orders", null, StatusCodes.INTERNAL_SERVER_ERROR)
    );
  }
});



const getOrdersByPartnerId = AsyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  console.log(restaurantId);
  try {
    const orders = await OrderService.getOrdersByPartnerId(restaurantId, false);

    res
      .status(StatusCodes.OK)
      .json(
        ApiResponse("Orders retrieved successfully", orders, StatusCodes.OK)
      );
  } catch (error) {
    res
      .status(StatusCodes.NOT_FOUND)
      .json(
        ApiResponse(
          "No orders found for this restaurant",
          null,
          StatusCodes.NOT_FOUND
        )
      );
  }
});

const getOrderById = AsyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        ApiResponse(
          "Order ID parameter is required",
          null,
          StatusCodes.BAD_REQUEST
        )
      );
  }

  try {
    const order = await OrderService.getOrderById(orderId);

    if (!order) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(ApiResponse("Order not found", null, StatusCodes.NOT_FOUND));
    }

    res
      .status(StatusCodes.OK)
      .json(
        ApiResponse(
          `Order with ID "${orderId}" retrieved successfully`,
          order,
          StatusCodes.OK
        )
      );
  } catch (error) {
    console.error("Error fetching order by ID:", error.message);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        ApiResponse(
          "An error occurred while fetching the order",
          null,
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
  }
});

const getOrdersByDriverStatus = AsyncHandler(async (req, res) => {
  const { status } = req.query;

  if (!status) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        ApiResponse(
          "Status parameter is required",
          null,
          StatusCodes.BAD_REQUEST
        )
      );
  }

  try {
    const orders = await OrderService.getOrdersByDriverStatus(status, false);

    if (!orders || orders.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(
          ApiResponse(
            "No orders found with the specified status",
            null,
            StatusCodes.NOT_FOUND
          )
        );
    }

    const orderDetails = orders.map((order) => ({
      id: order._id,
      customerName: order.customerId?.name || "Unknown",
      custAddress: order.custAddress || "Unknown",
      custPhone: order.customerId?.phone || "Unknown",
      restaurantName: order.restaurantId?.userId?.name || "Unknown",
      restDetailAddress: order.restaurantId?.detailAddress || "Unknown",
      restProvinceId: order.restaurantId?.provinceId || "Unknown",
      restDistrictId: order.restaurantId?.districtId || "Unknown",
      restCommuneId: order.restaurantId?.communeId || "Unknown",
      assignedShipperId: order.assignedShipperId || null,
      custShipperRating: order.custShipperRating,
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
      })),
      totalPrice: order.totalPrice,
      custLatitude: order.custLatitude,
      custLongitude: order.custLongitude,
      restLatitude: order.restLatitude,
      restLongitude: order.restLongitude,
      shipperLatitude: order.shipperLatitude,
      shipperLongitude: order.shipperLongitude,
      custAddress: order.custAddress || "Không xác định",
      restAddress: order.restaurantId.fullAddress || "Không xác định",
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
    }));

    res
      .status(StatusCodes.OK)
      .json(
        ApiResponse(
          `Orders with status "${status}" retrieved successfully`,
          orderDetails,
          StatusCodes.OK
        )
      );
  } catch (error) {
    console.error("Error fetching orders by status:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(
        ApiResponse(
          "An error occurred while fetching orders",
          null,
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
  }
});

const getAllOrders = AsyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query
  try {
    const { orders, totalCount, totalPages } = await OrderService.getAllOrders(parseInt(page), parseInt(limit), false);

    new PAGINATED({
      message: "Lấy danh sách thành công",
      data: orders,
      totalPages,
      currentPage: parseInt(page),
      pageSize: parseInt(limit),
      totalItems: totalCount,
    }).send(res);
  } catch (error) {
    res
      .status(StatusCodes.NOT_FOUND)
      .json(ApiResponse("No orders found.", null, StatusCodes.NOT_FOUND));
  }
});

const getOrderByPartnerStatus = AsyncHandler(async (req, res) => {
  const { partnerId, status } = req.query;
  const { page = 1, limit = 10 } = req.query;

  if (!partnerId || !status) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(
        new ApiResponse(
          "partnerId and status are required.",
          null,
          StatusCodes.BAD_REQUEST
        )
      );
  }

  const pageInt = parseInt(page);
  const limitInt = parseInt(limit);

  const { orders, totalCount, totalPages } =
    await OrderService.getOrderByPartnerStatus(
      partnerId,
      status,
      pageInt,
      limitInt,
      false
    );

  return new PAGINATED({
    message:
      orders.length === 0
        ? "No orders found for the given partnerId and status."
        : "Orders retrieved successfully.",
    data: orders,
    totalPages,
    currentPage: pageInt,
    pageSize: limitInt,
    totalItems: totalCount,
  }).send(res);
});



const updateOrderRating = AsyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const updates = req.body;

  if (
    updates.custResRating !== undefined &&
    (updates.custResRating < 1 || updates.custResRating > 5)
  ) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "custResRating must be between 1 and 5",
    });
  }
  if (
    updates.custShipperRating !== undefined &&
    (updates.custShipperRating < 1 || updates.custShipperRating > 5)
  ) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "custShipperRating must be between 1 and 5",
    });
  }

  try {
    const updatedOrder = await OrderService.updateRating(orderId, updates);

    if (!updatedOrder) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(ApiResponse("Order not found.", [], StatusCodes.NOT_FOUND));
    }

    return res
      .status(StatusCodes.OK)
      .json(
        ApiResponse(
          "Order ratings updated successfully.",
          updatedOrder,
          StatusCodes.OK
        )
      );
  } catch (error) {
    console.error("Error updating ratings:", error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to update order ratings.",
    });
  }
});
const getAllRatingByItem = async (req, res) => {
  const { itemId } = req.params;
  console.log(itemId);
  try {
    const ratings = await OrderService.getRatingsByItem(itemId);
    console.log(ratings);

    return res.status(200).json({
      message: "Ratings retrieved successfully.",
      data: ratings,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
const getAllRatingByRestaurant = async (req, res) => {
  const { restaurantId } = req.params;

  try {
    const ratings = await OrderService.getRatingsByRestaurant(restaurantId);

    return res.status(200).json({
      message: "Ratings retrieved successfully.",
      data: ratings,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
const getAllRatingByDriver = async (req, res) => {
  const { assignedShipperId } = req.params;

  try {
    const ratings = await OrderService.getRatingsByDriver(assignedShipperId);

    return res.status(200).json({
      message: "Ratings retrieved successfully.",
      data: ratings,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
const getAllRatingByCustomer = async (req, res) => {
  const { customerId } = req.params;

  try {
    const ratings = await OrderService.getRatingsByCustomer(customerId);

    return res.status(200).json({
      message: "Ratings retrieved successfully.",
      data: ratings,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
const getDeliveryByDriver = async (req, res) => {
  const { assignedShipperId } = req.params;
  const { query_dateFrom, query_dateTo } = req.query;

  try {
    const statistic = await OrderService.getDeliveryStatusByDriver(
      assignedShipperId,
      query_dateFrom,
      query_dateTo
    );

    return res.status(200).json({
      message: "Ratings retrieved successfully.",
      data: statistic,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
const getDeliveryByRestaurant = async (req, res) => {
  const { restaurantId } = req.params;
  const { query_dateFrom, query_dateTo } = req.query;

  try {
    const statistic = await OrderService.getDeliveryStatusByRestaurant(
      restaurantId,
      query_dateFrom,
      query_dateTo
    );

    return res.status(200).json({
      message: "Ratings retrieved successfully.",
      data: statistic,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

const getOrderByStatus = async (req, res) => {

  try {
    const ratings = await OrderService.getOrderStatus(false);

    return res.status(200).json({
      message: "order retrieved successfully.",
      data: ratings,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
const getHighRatedRestaurants = async (req, res) => {
  try {
    const restaurants = await OrderService.getRestaurantsWithHighRatings();

    return res.status(200).json({
      message: "Ratings retrieved successfully.",
      data: restaurants,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
const getOrderByStatusInAdmin = AsyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  try {
    const { orders, totalCount, totalPages } = await OrderService.getAllOrderByStatus({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
    });

    new PAGINATED({
      message: "Lấy danh sách thành công",
      data: orders,
      totalPages,
      currentPage: parseInt(page),
      pageSize: parseInt(limit),
      totalItems: totalCount,
    }).send(res);
  } catch (error) {
    res
      .status(StatusCodes.NOT_FOUND)
      .json(ApiResponse("No orders found.", null, StatusCodes.NOT_FOUND));
  }
});

const searchOrderById = AsyncHandler(async (req, res) => {
  const { page = 1, limit = 10, id } = req.query;

  try {
    const { orders, totalCount, totalPages } = await OrderService.searchOrderById({
      page: parseInt(page),
      limit: parseInt(limit),
      id,
      isDeleted: false,
    });

    new PAGINATED({
      message: "Lấy danh sách thành công",
      data: orders,
      totalPages,
      currentPage: parseInt(page),
      pageSize: parseInt(limit),
      totalItems: totalCount,
    }).send(res);
  } catch (error) {
    res
      .status(StatusCodes.NOT_FOUND)
      .json(ApiResponse("Không tìm thấy đơn hàng.", null, StatusCodes.NOT_FOUND));
  }
});

const deleteOrderById = async (req, res) => {
  try {
    const order = await OrderService.deleteOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    new SuccessResponse({
      message: "Đã xóa thành công",
    }).send(res);
  } catch (e) {
    return res.status(500).json({ message: "Lỗi khi xóa đơn hàng" });
  }
};

const getSuggestion = async (req, res, next) => {

}

const rejectOrder = async (req, res, next) => {

  const { orderId } = req.params;
  const { driverId } = req.body;

  new SuccessResponse({
    message: "Từ chối đơn hàng ",
    data: OrderService.rejectDriver(driverId, orderId)
  }).send(res)
}

const getDailyRevenuePartner = async (req, res) => {
  const { restaurantId } = req.params;
  const { month, year } = req.query;


  if (!restaurantId || !month || !year) {
    return res.status(400).json({ message: "Missing required query params." });
  }

  try {
    const revenueData = await OrderService.getDailyRevenueBypartner(
      restaurantId,
      parseInt(month),
      parseInt(year)
    );

    res.json({ data: revenueData });

  } catch (error) {
    console.error("Error getting revenue data:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getDailyRevenueInAdmin = async (req, res) => {
  const { month, year } = req.query;


  if (!month || !year) {
    return res.status(400).json({ message: "Missing required query params." });
  }

  try {
    const revenueData = await OrderService.getDailyRevenueInAdmin(
      parseInt(month),
      parseInt(year)
    );

    res.json({ data: revenueData });

  } catch (error) {
    console.error("Error getting revenue data:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getDailyOrderInAdmin = async (req, res) => {
  const { month, year } = req.query;


  if (!month || !year) {
    return res.status(400).json({ message: "Missing required query params." });
  }

  try {
    const revenueData = await OrderService.getDailyOrderStatusInAdmin(
      parseInt(month),
      parseInt(year)
    );

    res.json({ data: revenueData });

  } catch (error) {
    console.error("Error getting revenue data:", error);
    res.status(500).json({ message: "Server error" });
  }
};
module.exports = {
  createOrder,
  updateOrder,
  updateOrderStatus,
  getOrderDetails,
  getOrdersByCustomerId,
  getOrdersByPartnerId,
  getOrdersByDriverStatus,
  getAllOrders,
  getOrderById,
  getOrdersByDriverId,
  getOrderByPartnerStatus,
  updateOrderRating,
  getAllRatingByItem,
  getAllRatingByRestaurant,
  getAllRatingByDriver,
  getAllRatingByCustomer,
  getDeliveryByDriver,
  getDeliveryByRestaurant,
  getOrderByStatus,
  getHighRatedRestaurants,
  updateDriverLocation,
  getOrderByStatusInAdmin,
  searchOrderById,
  updatePaymentStatus,
  updateCustomerAddress,
  deleteOrderById,
  getDailyRevenuePartner,
  rejectOrder,
  getDailyRevenueInAdmin,
  getDailyOrderInAdmin
};
