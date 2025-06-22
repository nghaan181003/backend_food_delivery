const Redis = require('ioredis');
require('dotenv').config();

let client = null;

const REDIS_CONNECT_MESSAGE = {
    code: -99,
    message: {
        vn: 'Redis bị lỗi rồi',
        en: 'Service connection error',
    },
};

const initRedis = async () => {
    if (!client) {
        client = new Redis({
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
            username: process.env.REDIS_USERNAME || 'default',
            password: process.env.REDIS_PASSWORD,
            maxRetriesPerRequest: null,

        });
    }

    client.on('connect', () => {
        console.log('🔌 Redis status: connected');
    });

    client.on('ready', () => {
        console.log('✅ Redis status: ready to use');
    });

    client.on('error', (err) => {
        console.error('❌ Redis status: error', err);
        throw new Error(
            REDIS_CONNECT_MESSAGE.message.vn || 'Redis error'
        );
    });

    client.on('end', () => {
        console.warn('⚠️ Redis status: connection closed');
    });

    return client;
};

const getRedis = () => {
    if (!client) throw new Error('Redis client not initialized')
    return client;
};



const closeRedis = async () => {
    if (client) {
        await client.quit();
        console.log('🛑 Redis connection closed.');
    }
};

module.exports = {
    initRedis,
    getRedis,
    closeRedis,
};
