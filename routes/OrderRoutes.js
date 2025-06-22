const express = require("express");
const router = express.Router();
const OrderController = require("../controllers/OrderController");
const DeliveryFeeController = require("../controllers/deliveryfee.controller");


// Route for creating a new order
router.post("/", OrderController.createOrder);

// Route for getting all orders
router.get("/", OrderController.getAllOrders);

// Route for getting all orders filtered by status
// router.get("/status", OrderController.getOrdersByStatus);

// Route for getting all orders by a customer ID
router.get("/customer/:customerId", OrderController.getOrdersByCustomerId);

//  Route for getting all orders by a partner ID
router.get("/partner/:partnerId", OrderController.getOrdersByPartnerId);

router.get("/driver/:driverId", OrderController.getOrdersByDriverId);

// Route for getting order details by ID
router.get("/:orderId", OrderController.getOrderById);

// Route for getting all orders by status
router.get("/orders/status", OrderController.getOrdersByDriverStatus);

// Route for updating an existing order (full update)
router.put("/:orderId", OrderController.updateOrder);

// Route for updating only the order status
router.patch("/:orderId/status", OrderController.updateOrderStatus);

// Get orders by partnerId and restStatus
router.get("/orders/partner", OrderController.getOrderByPartnerStatus);

//rating
router.patch("/rating/:orderId", OrderController.updateOrderRating);

router.get("/admin/statistics", OrderController.getOrderByStatus);

router.get("/restaurants/high-rated", OrderController.getHighRatedRestaurants);

// Route for updating driver location
router.patch("/:orderId/location", OrderController.updateDriverLocation);

router.patch("/:orderId/address", OrderController.updateCustomerAddress);

//Route for filter by status in admin 
router.get("/admin/status", OrderController.getOrderByStatusInAdmin);

router.get("/admin/search", OrderController.searchOrderById);

router.post("/calculate-delivery-fee", DeliveryFeeController.calculateDeliveryFee);

router.patch("/:orderId/payment", OrderController.updatePaymentStatus);

router.patch("/delete/:id", OrderController.deleteOrderById);

router.post("/:orderId/reject", OrderController.rejectOrder)
router.get("/admin/top_revenue", OrderController.getDailyRevenueInAdmin);

router.get("/admin/daily_order", OrderController.getDailyOrderInAdmin);

module.exports = router;
