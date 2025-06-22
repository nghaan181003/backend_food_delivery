const express = require("express");
const router = express.Router();

const {
  createDriver,
  deleteDriver,
  updateDateDriver,
  getDriverById,
  updateStatus,
  getDriverUpdatedRequestsById,
  updateDriverLocationController,
  getSuggestionForDriverController,
  updateLocation
} = require("../controllers/DriverController");
const OrderController = require("../controllers/OrderController");

const AuthMiddleWare = require("../middlewares/AuthMiddleWare");
router.get("/:id", getDriverById);
router.post("/", createDriver);
router.delete("/:id", deleteDriver);
router.put("/:id", updateDateDriver);
router.put("/updateStatus/:userId", updateStatus);
router.get("/rating/:assignedShipperId", OrderController.getAllRatingByDriver);
router.get("/statistic/:assignedShipperId", OrderController.getDeliveryByDriver);
router.get("/update/request/:userId", getDriverUpdatedRequestsById);
router.patch("/:driverId/location", updateDriverLocationController)
router.get("/:driverId/suggestion", getSuggestionForDriverController)
router.put("/updateLocation/:userId", updateLocation);
module.exports = router;
