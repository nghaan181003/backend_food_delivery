const mapService = require("../services/location.service");
const ConfigService = require("../services/config.service");
const Restaurant = require("../models/UpdatedPartner");
const { SuccessResponse } = require("../core/success.response");

/**
 * Controller to calculate delivery fee based on customer and restaurant coordinates.
 */
const calculateDeliveryFee = async (req, res) => {
  try {
    const { customerLat, customerLng, restaurantId } = req.body;

    // Validate input
    if (!customerLat || !customerLng || !restaurantId) {
      return res.status(400).json({ message: "Missing required fields: customerLat, customerLng, or restaurantId" });
    }

    if (typeof customerLat !== "number" || typeof customerLng !== "number") {
      return res.status(400).json({ message: "Invalid coordinates: customerLat and customerLng must be numbers" });
    }

    // Fetch restaurant details
    const restaurant = await Restaurant.findById(restaurantId).lean();
    if (!restaurant || !restaurant.latitude || !restaurant.longitude) {
      return res.status(404).json({ message: "Restaurant not found or missing coordinates" });
    }

    // Fetch delivery fee configuration
      const config = await ConfigService.getDeliveryFeeConfig();
      console.log("data:", config)
    if (!config || !config.data) {
      return res.status(404).json({ message: "Delivery fee configuration not found" });
    }

    // Calculate distance
    const distanceResult = await mapService.getRoadDistanceBetweenPoints(
      { lat: customerLat, lng: customerLng },
      { lat: restaurant.latitude, lng: restaurant.longitude }
    );

    const distance = distanceResult.distance;

    // Calculate delivery fee
    const { baseFee, additionalFeePerKm, surcharge } = config.data;
    const extraDistance = Math.max(0, distance - 1);
    let deliveryFee = baseFee + extraDistance * additionalFeePerKm + surcharge;
      
    // Apply min/max fee caps (10,000 to 100,000 VNĐ)
    deliveryFee = Math.max(10000, Math.min(100000, deliveryFee));

    new SuccessResponse({
      message: "Calculate delivery fee successfully",
      data: {
        distance: Number(distance.toFixed(2)),
        deliveryFee: Number(deliveryFee.toFixed(0)),
      },
    }).send(res);
  } catch (error) {
    console.log(`Error calculating delivery fee: ${error.message}`);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error calculating delivery fee",
      error: error.message,
    });
  }
};

module.exports = { calculateDeliveryFee };