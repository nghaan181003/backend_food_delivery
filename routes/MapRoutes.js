const express = require("express");
const router = express.Router();
const MapController = require("../controllers/location.controller");

router.post("/route", MapController.getRoute);
router.get("/coordinates", MapController.getCoordinates);
// router.get("/distance", MapController.getDistance);
router.post("/distance", MapController.getDistance);

module.exports = router;
