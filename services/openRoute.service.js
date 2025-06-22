const axios = require('axios');
require('dotenv').config();

const ORS_BASE_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';
const ORS_API_KEY = "5b3ce3597851110001cf6248624e1bd0362941f69f8006f0e3fec245";

async function getRouteDistance(start, end) {
    try {
        const response = await axios.post(
            ORS_BASE_URL,
            {
                coordinates: [start, end]
            },
            {
                headers: {
                    'Authorization': ORS_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        const route = response.data.routes[0];
        const distanceInMeters = route.summary.distance;
        const durationInSeconds = route.summary.duration;

        return {
            distance_km: (distanceInMeters / 1000).toFixed(2),
            duration_min: (durationInSeconds / 60).toFixed(2)
        };
    } catch (error) {
        console.error('Failed to fetch route:', error.response?.data || error.message);
        throw new Error(error);
    }
}

module.exports = {
    getRouteDistance
};