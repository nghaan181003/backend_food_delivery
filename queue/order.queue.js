const { Queue, Worker } = require("bullmq");
const CONSTANTS = require("../config/constants");

const { getDriverLocation, findNearByDrivers } = require("../services/DriverServices");
const { getRedis } = require("../dbs/init.redis");


class OrderQueueManager {
    constructor() {
        this.redisConnection = null;
        this.newOrderQueue = null;
        this.suggestionQueue = null;
        this.newOrderWorker = null;
        this.suggestionWorker = null;
        this.isInitialized = false;
        this.io = null;
    }

    static getInstance() {
        if (!OrderQueueManager.instance) {
            OrderQueueManager.instance = new OrderQueueManager()
        }
        return OrderQueueManager.instance
    }

    setSocket(ioInstance) {
        this.io = ioInstance;
    }

    // Khởi tạo sau khi Redis đã sẵn sàng
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Đảm bảo Redis đã được khởi tạo
            this.redisConnection = getRedis();

            if (!this.redisConnection) {
                throw new Error('Redis connection not available');
            }

            // Khởi tạo queues
            this.newOrderQueue = new Queue(CONSTANTS.QUEUES.NEW_ORDERS, {
                connection: this.redisConnection,
                defaultJobOptions: {
                    removeOnComplete: 100,
                    removeOnFail: 50,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                },
            });

            this.suggestionQueue = new Queue(CONSTANTS.QUEUES.ORDER_SUGGESTIONS, {
                connection: this.redisConnection,
                defaultJobOptions: {
                    removeOnComplete: 50,
                    removeOnFail: 20,
                    delay: 1000,
                },
            });

            // Khởi tạo workers
            await this.initializeWorkers();

            this.isInitialized = true;
            console.log('OrderQueueManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize OrderQueueManager:', error);
            throw error;
        }
    }

    async initializeWorkers() {
        this.newOrderWorker = new Worker(
            CONSTANTS.QUEUES.NEW_ORDERS,
            async (job) => {
                await this.processNewOrder(job);
            },
            {
                connection: this.redisConnection, // Sử dụng this.redisConnection thay vì redisConnection
                concurrency: 10,
                maxStalledCount: 3,
                stalledInterval: 30 * 1000,
            }
        );

        this.suggestionWorker = new Worker(
            CONSTANTS.QUEUES.ORDER_SUGGESTIONS,
            async (job) => {
                await this.processSuggestion(job);
            },
            {
                connection: this.redisConnection, // Sử dụng this.redisConnection thay vì redisConnection
                concurrency: 5,
            }
        );

        this.newOrderWorker.on('failed', (job, err) => {
            console.error(`Order processing failed: ${job.id}`, err);
        });

        this.suggestionWorker.on('failed', (job, err) => {
            console.error(`Suggestion processing failed: ${job.id}`, err);
        });
    }

    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initialize();
        }
    }

    async addNewOrder(orderData) {
        await this.ensureInitialized();

        await this.newOrderQueue.add('process-new-order', orderData, {
            // jobId: orderData._id.toString(),
            delay: 0
        });

        return orderData;
    }

    async processNewOrder(job) {
        try {
            const data = job.data;

            const { getRejectedDrivers } = require("../services/OrderServices")

            // Kiem tra don hang qua han
            const now = Date.now()
            const createdAt = new Date(data.createdAt);

            //TODO: bo comment nay
            // if (now - createdAt > CONSTANTS.ORDER_EXPIRATION_TIME_MS) { // quá 15 phút
            //     console.log(`Order ${data._id} expired. Removing job ${job.id}`);
            //     // await job.remove(); // ✅ Xoá job khỏi queue
            //     return;
            // }
            // Tìm tài xế phù hợp
            const nearByDrivers = await findNearByDrivers({
                lat: data.restLatitude,
                lng: data.restLongitude
            }, CONSTANTS.MAX_SUGGESTION_DISTANCE)


            const rejectedDrivers = await getRejectedDrivers(data._id)
            const rejectedSet = new Set(rejectedDrivers);

            const availableDrivers = nearByDrivers.filter(driver =>
                !rejectedSet.has(driver.driverId)
            );

            if (availableDrivers.length === 0) {
                console.log(`All nearby drivers have rejected order ${data._id}`);
                // Có thể retry sau vài phút hoặc thông báo admin
                await this.retryOrder(data);
                return;
            }




            // Gửi suggestion cho tài xế
            const bestDriver = availableDrivers[0];
            await this.sendSuggestionToDriver(bestDriver, data);

        } catch (error) {
            // console.error(`Error processing order ${data._id}:`, error);
            throw error;
        }
    }

    async retryOrder(order) {
        await this.ensureInitialized();

        const existingJob = await this.newOrderQueue.getJob(order._id.toString());
        // if (existingJob) {
        //     await existingJob.remove(); // Xoá job cũ
        // }


        await this.newOrderQueue.add('process-new-order', order, {
            delay: 5000,
            // jobId: order._id.toString()
        });
    }

    async sendSuggestionToDriver(driver, order) {
        await this.ensureInitialized();

        const { saveSuggestion } = require("../services/OrderServices");
        console.log("Gửi cho tài xế", driver)

        // Tạo suggestion data
        const suggestionData = {
            orderId: order._id,
            driverId: driver.driverId,
            order,
            driverLocation: driver.location,
        };

        await saveSuggestion(driver.driverId, order._id, suggestionData);


        if (this.io) {
            this.io.to(driver.driverId.toString()).emit("order:suggestion", suggestionData)
        }
        else {
            console.warn("Socket.io not initialized when sending suggestion.");
        }

        await this.suggestionQueue.add(
            'suggestion-timeout',
            suggestionData,
            { delay: CONSTANTS.SUGGESTION_TIMEOUT }
        );
    }

    async processSuggestion(job) {
        if (job.name === 'suggestion-timeout') {
            await this.handleSuggestionTimeout(job.data);
        } else {
            console.log("TEST [1]")
        }
    }

    async handleSuggestionTimeout(suggestionData) {
        const { getSuggesttion, removeSuggestion, rejectDriver } = require("../services/OrderServices")
        const { driverId, orderId } = suggestionData;

        // Kiểm tra xem suggestion có còn tồn tại không
        const existingSuggestion = await getSuggesttion(driverId, orderId);

        if (existingSuggestion) {
            // Suggestion timeout, xóa và thử tài xế khác
            await removeSuggestion(driverId, orderId);

            // thêm vào reject
            await rejectDriver(driverId, orderId)
            console.log(`Suggestion timeout for driver ${driverId}, order ${orderId}`);

            // Retry với tài xế khác
            await this.retryOrder(suggestionData.order);
        }
    }

    // Graceful shutdown
    async close() {
        if (this.newOrderWorker) {
            await this.newOrderWorker.close();
        }
        if (this.suggestionWorker) {
            await this.suggestionWorker.close();
        }
        if (this.newOrderQueue) {
            await this.newOrderQueue.close();
        }
        if (this.suggestionQueue) {
            await this.suggestionQueue.close();
        }
    }
}

const instanceOrderQueueManager = OrderQueueManager.getInstance()
module.exports = instanceOrderQueueManager;