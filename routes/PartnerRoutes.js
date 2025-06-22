const express = require("express");
const router = express.Router();

const {
  createPartner,
  delelePartner,
  getPartnerById,
  getPartnerByPartnerId,
  updateStatus,
  getNearbyRestaurants,
  getUpdateRequestsById,
  openStatusPartner,
  closeStatusPartner,
  updateSchedule
} = require("../controllers/PartnerController");
const OrderController = require("../controllers/OrderController");

const AuthMiddleWare = require("../middlewares/AuthMiddleWare");
router.get("/:id", getPartnerById);
router.post("/", createPartner);
router.delete("/:id", delelePartner);
// router.put("/:id", updateDateDriver);
router.get("/customer/:id", getPartnerByPartnerId);
router.put("/updateStatus/:userId", updateStatus);
router.get("/rating/:restaurantId", OrderController.getAllRatingByRestaurant);
router.get("/statistic/:restaurantId", OrderController.getDeliveryByRestaurant);
router.get("/nearby/restaurants", getNearbyRestaurants);
router.get("/update/request/:userId", getUpdateRequestsById)
router.patch("/open/:partnerId", openStatusPartner);
router.patch("/close/:partnerId", closeStatusPartner);
router.put("/update-schedule/:partnerId", updateSchedule);
router.get("/daily_revenue/:restaurantId", OrderController.getDailyRevenuePartner);

module.exports = router;
