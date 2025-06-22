const CONSTANTS = {
    // Redis Keys
    KEYS: {
        DRIVER_LOCATION: 'driver:location:',
        DRIVER_STATUS: 'driver:status:',
        ORDER_SUGGESTIONS: 'order:suggestions:',
        DRIVER_CURRENT_ORDERS: 'driver:orders:',
        ORDER_RETRY_COUNT: 'order:retry:',
        REJECTED_DRIVERS: 'rejected_drivers:'
    },

    // Queue Names
    QUEUES: {
        NEW_ORDERS: 'new-orders',
        ORDER_SUGGESTIONS: 'order-suggestions',
        LOCATION_UPDATES: 'location-updates'
    },

    // Business Rules
    MAX_SUGGESTION_DISTANCE: 50, // 2km
    MAX_DETOUR_DISTANCE: 500, // 500m
    SUGGESTION_TIMEOUT: 120000, // 2 phut
    MAX_RETRY_COUNT: 3,
    MAX_ORDERS_PER_DRIVER: 3,
    ORDER_EXPIRATION_TIME_MS: 2 * 60 * 1000,  //TODO: thay bang 15 phut

    // Driver Status
    DRIVER_STATUS: {
        AVAILABLE: 'available',
        BUSY: 'busy',
        OFFLINE: 'offline',
        HEADING_TO_PICKUP: 'heading_to_pickup',
        HEADING_TO_DELIVERY: 'heading_to_delivery'
    }
};

module.exports = CONSTANTS;
