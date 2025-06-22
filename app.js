require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const helmet = require("helmet")
const compression = require('compression')
const cors = require("cors");

const { initializeSocket } = require("./sockets");

const app = express()

// init middlewares
app.use(cors());
app.use(morgan("dev"))
app.use(helmet())
app.use(compression())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// init db
require('./dbs/init.mongodb')

// init redis
const redis = require('./dbs/init.redis');

(async () => {
    try {
        // Khởi tạo Redis trước
        await redis.initRedis();
        console.log('Redis initialized successfully');

        // Sau đó khởi tạo OrderQueueManager
        const orderQueueManager = require('./queue/order.queue');
        await orderQueueManager.initialize();
        console.log('OrderQueueManager initialized successfully');

    } catch (error) {
        console.error('Failed to initialize services:', error);
        process.exit(1);
    }
})();

// ⏰ Start cron jobs
require('./jobs/updateDiscountStatus')
require('./jobs/updatePartnerStatus')
require('./jobs/updateItemStatus')
// init router
app.use("/api/v1", require('./routes'));



// hanling error
app.use((req, res, next) => {
    const error = new Error("Not Found")
    error.status = 404
    next(error)
})

app.use((error, req, res, next) => {
    const statusCode = error.status || 500
    return res.status(statusCode).json({
        status: 'error',
        stack: error.stack,
        code: statusCode,
        message: error.message || "Internal Server Error"
    })
})




module.exports = app

