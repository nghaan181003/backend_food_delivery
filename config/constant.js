const CONSTANT = {
    // redis keys
    KEYS: {
        DRIVER_LOCATION: 'driver:location:',
        DRIVER_STATUS: 'driver:status:',
        ORDER_SUGGESTIONS: 'order:suggestions:',
        DRIVER_CURRENT_ORDERS: 'driver:orders:',
        ORDER_RETRY_COUNT: 'order:retry:'
    },

    // Queue names
    QUEUES: {
        NEW_ORDERS: 'new-orders',
        ORDER_SUGGESTIONS: 'order-suggestions',
        LOCATION_UPDATES: 'location-updates'
    },

    // BUSSINESS Rules
    MAX_SUGGESTION_DISTANCE: 2000, // 2km
    MAX_DETOUR_DISTANCE: 500, // 500m
    SUGGESTION_TIMEOUT: 30000, // 30s
    MAX_RETRY_COUNT: 3,
    MAX_ORDERS_PER_DRIVER: 3,


    DRIVER_STATUS: {
        AVAILABLE: 'available',
        BUSY: 'busy',
        OFFLINE: 'offline',
        HEADING_TO_PICKUP: 'heading_to_pickup',
        HEADING_TO_DELIVERY: 'heading_to_delivery'
    }
}

module.exports = CONSTANT