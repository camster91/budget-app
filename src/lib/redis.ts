import Redis from "ioredis";

const redis = new Redis({
    host: process.env.REDIS_HOST || "budget-redis",
    port: Number(process.env.REDIS_PORT) || 6379,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
});

redis.on("error", (err) => {
    // Silent fail to avoid crashing the app when Redis is temporarily down
    console.error("[REDIS]", err.message);
});

export default redis;
