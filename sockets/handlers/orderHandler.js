const OrderService = require("../../services/OrderServices");

module.exports = (socket, io) => {
  socket.on("order:create", async (orderData) => {
    const orderJson = JSON.parse(orderData);
    console.log(`Order created: ${orderJson.id}`);
    const detailOrder = await OrderService.getOrderById(orderJson.id);
    // send to all drivers
    io.emit("order:created", detailOrder);
  });

  socket.on("order:updateStatus", async (orderData) => {
    console.log(`Order updated: ${orderData.orderId}`);

    try {
      // Fetch detailed order information
      const detailOrder = await OrderService.getOrderById(orderData.orderId);

      if (!detailOrder) {
        console.log(`Order not found: ${orderData.orderId}`);
        return;
      }

      // Check conditions
      if (detailOrder.assignedShipperId) {
        const roomId = detailOrder.restaurantId.toString();

        // Send to partner
        if (detailOrder.restStatus === "new" || detailOrder.restStatus === "cancelled")
          io.to(roomId).emit("order:updatedStatus", detailOrder);

        // Send to customer
        io.to(detailOrder.id.toString()).emit(
          "order:updatedStatus",
          detailOrder
        );
      }
    } catch (error) {
      console.error(`Error updating order status: ${error.message}`);
    }
  });

  socket.on("order:cancelled", async (orderData) => {
    console.log(`Order updated: ${orderData.orderId}`);

    try {
      const detailOrder = await OrderService.getOrderById(orderData.orderId);

      if (!detailOrder) {
        console.log(`Order not found: ${orderData.orderId}`);
        return;
      }

      io.to(detailOrder.id.toString()).emit(
        "order:updatedStatus",
        detailOrder
      );
    } catch (error) {
      console.error(`Error updating order status: ${error.message}`);
    }
  });

  socket.on("leaveRoom", (room) => {
    socket.leave(room);
    socket.emit("leftRoom", { roomId: room });
  });
};
