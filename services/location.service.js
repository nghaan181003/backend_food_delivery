const axios = require("axios");

const ORS_API_KEY = "5b3ce3597851110001cf6248624e1bd0362941f69f8006f0e3fec245";
const BASE_URL = "https://api.openrouteservice.org";

/**
 * Fetch route from OpenRouteService API
 */
// const fetchRoute = async (shipper, restaurant, customer) => {
//   try {
//     if (!shipper || !restaurant || !customer) {
//       throw new Error("Missing required parameters.");
//     }

//     const url = `${BASE_URL}/v2/directions/driving-car?api_key=${ORS_API_KEY}`
//       + `&start=${shipper.lng},${shipper.lat}`
//       + `&end=${customer.lng},${customer.lat}`
//       + `&via=${restaurant.lng},${restaurant.lat}`;

//     const response = await axios.get(url);
//     const route = response.data.features[0]?.geometry?.coordinates;

//     if (!route) {
//       throw new Error("No route found.");
//     }

//     return route.map(coord => ({ lat: coord[1], lng: coord[0] }));
//   } catch (error) {
//     console.error("Error fetching route:", error);
//     throw error;
//   }
// };

const fetchRoute = async (shipper, restaurant, customer) => {
  try {
    if (!shipper || !restaurant || !customer) {
      throw new Error("Missing required parameters.");
    }

    // Helper function to fetch a single route segment
    const getRouteSegment = async (start, end) => {
      const url = `${BASE_URL}/v2/directions/driving-car?api_key=${ORS_API_KEY}`
        + `&start=${start.lng},${start.lat}`
        + `&end=${end.lng},${end.lat}`;

      const response = await axios.get(url);
      const route = response.data.features[0]?.geometry?.coordinates;

      if (!route) {
        throw new Error("No route found for segment.");
      }

      return route.map(coord => ({ lat: coord[1], lng: coord[0] }));
    };

    // Fetch route from shipper to restaurant
    const shipperToRestaurant = await getRouteSegment(shipper, restaurant);

    // Fetch route from restaurant to customer
    const restaurantToCustomer = await getRouteSegment(restaurant, customer);

    // Combine the routes, removing duplicate point at restaurant if needed
    const combinedRoute = [...shipperToRestaurant, ...restaurantToCustomer.slice(1)];

    return {
      shipperToRestaurant,
      restaurantToCustomer,
      combinedRoute
    };
  } catch (error) {
    console.error("Error fetching route:", error);
    throw error;
  }
};
/**
 * Fetch distance between two addresses using OpenRouteService API
 */
const getDistanceBetweenAddresses = async (address1, address2) => {
  try {
    const coords1 = await getCoordinatesFromAddress(address1);
    const coords2 = await getCoordinatesFromAddress(address2);

    if (!coords1 || !coords2) {
      throw new Error("Could not retrieve coordinates for given addresses.");
    }

    const coordinates = [[coords1.lng, coords1.lat], [coords2.lng, coords2.lat]];
    const url = `${BASE_URL}/v2/directions/driving-car?api_key=${ORS_API_KEY}`;

    const response = await axios.post(
      url,
      { coordinates },
      { headers: { "Content-Type": "application/json" } }
    );

    if (!response.data.routes || response.data.routes.length === 0) {
      return { error: "No route found between the given addresses." };
    }

    const distance = response.data.routes[0]?.summary?.distance; // Distance in meters
    const duration = response.data.routes[0]?.summary?.duration; // Duration in seconds

    if (!distance || isNaN(distance)) {
      console.error("Invalid distance value:", distance);
      throw new Error("Invalid distance format received from API.");
    }

    if (!duration || isNaN(duration)) {
      console.error("Invalid duration value:", duration);
      throw new Error("Invalid duration format received from API.");
    }

     // Chuyển đổi thời gian từ giây sang giờ và phút
    let formattedDuration;
    const minutes = Math.round(duration / 60); 
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      formattedDuration = remainingMinutes > 0 
        ? `${hours} giờ ${remainingMinutes} phút`
        : `${hours} giờ`;
    } else {
      formattedDuration = `${minutes} phút`;
    }
    console.log((distance / 1000) + " km", formattedDuration);

    return { 
      distance: (distance / 1000) + " km", // Convert meters to km
      duration: formattedDuration 
    };
  } catch (error) {
    console.error("Error fetching data:", error.response?.data || error.message);
    return { error: error.response?.data || error.message };
  }
};



/**
 * Get coordinates from an address using OpenRouteService API
 */
const getCoordinatesFromAddress = async (address) => { // Thay vì (req, res)
  try {
    if (!address) {
      throw new Error("Address is required.");
    }

    const url = `${BASE_URL}/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(address)}`;
    const response = await axios.get(url);
    const coordinates = response.data.features[0]?.geometry?.coordinates;

    if (!coordinates) {
      throw new Error("No coordinates found for address.");
    }

    return { lat: coordinates[1], lng: coordinates[0] };
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null; // Trả về null nếu không tìm thấy
  }
};

/**
 * Calculate road distance between two points using OpenRouteService API
 * @param {Object} point1 - First point with { lat, lng }
 * @param {Object} point2 - Second point with { lat, lng }
 * @returns {Object} Object containing distance (km) and duration (formatted)
 */
const getRoadDistanceBetweenPoints = async (point1, point2) => {
  try {
    if (!point1 || !point2 || !point1.lat || !point1.lng || !point2.lat || !point2.lng) {
      throw new Error("Invalid coordinates provided.");
    }

    const coordinates = [[point1.lng, point1.lat], [point2.lng, point2.lat]];
    const url = `${BASE_URL}/v2/directions/driving-car?api_key=${ORS_API_KEY}`;

    const response = await axios.post(
      url,
      { coordinates },
      { headers: { "Content-Type": "application/json" } }
    );

    if (!response.data.routes || response.data.routes.length === 0) {
      throw new Error("No route found between the given points.");
    }

    const distance = response.data.routes[0]?.summary?.distance; // Distance in meters
    const duration = response.data.routes[0]?.summary?.duration; // Duration in seconds

    if (!distance || isNaN(distance)) {
      throw new Error("Invalid distance format received from API.");
    }

    if (!duration || isNaN(duration)) {
      throw new Error("Invalid duration format received from API.");
    }

    // Chuyển đổi thời gian từ giây sang giờ và phút
    let formattedDuration;
    const minutes = Math.round(duration / 60);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      formattedDuration = remainingMinutes > 0
        ? `${hours} giờ ${remainingMinutes} phút`
        : `${hours} giờ`;
    } else {
      formattedDuration = `${minutes} phút`;
    }

    return {
      distance: Number((distance / 1000).toFixed(2)), 
      distanceUnit: "km",
      duration: duration, 
      durationUnit: "seconds",
      formattedDuration: formattedDuration
    };
  } catch (error) {
    console.error("Error fetching road distance:", error.message);
    throw error;
  }
};

// Thêm vào module.exports
module.exports = { 
  fetchRoute, 
  getCoordinatesFromAddress, 
  getDistanceBetweenAddresses, 
  getRoadDistanceBetweenPoints 
};
