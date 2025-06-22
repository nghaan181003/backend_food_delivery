const mapService = require("../services/location.service");
const { SuccessResponse } = require('../core/success.response');


/**
 * Controller to fetch route between shipper, restaurant, and customer.
 */
const getRoute = async (req, res) => {
  try {
    const { shipper, restaurant, customer } = req.body;

    if (!shipper || !restaurant || !customer) {
      return res.status(400).json({ message: "Missing required locations." });
    }

    const route = await mapService.fetchRoute(shipper, restaurant, customer);
    res.status(200).json({ route });
  } catch (error) {
    res.status(500).json({ message: "Error fetching route", error: error.message });
  }
};

/**
 * Controller to get coordinates from an address.
 */
const getCoordinates = async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ message: "Address is required." });
    }

    const coordinates = await mapService.getCoordinatesFromAddress(address);
    res.status(200).json({ coordinates });
  } catch (error) {
    res.status(500).json({ message: "Error fetching coordinates", error: error.message });
  }
};

/**
 * Controller to get road distance between two points based on coordinates.
 */
const getDistance = async (req, res) => {
  try {
    const { point1, point2 } = req.body;

    if (!point1 || !point2 || !point1.lat || !point1.lng || !point2.lat || !point2.lng) {
      return res.status(400).json({ message: "Both points with valid coordinates (lat, lng) are required." });
    }

    const result = await mapService.getRoadDistanceBetweenPoints(point1, point2);
    new SuccessResponse({
        message: 'Get road distance successfully',
        data: result,
      }).send(res);
  } catch (error) {
    res.status(500).json({ message: "Error calculating road distance", error: error.message });
  }
};

module.exports = { getRoute, getCoordinates, getDistance };