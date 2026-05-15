import redis from "./redis";

export async function checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<boolean> {
    try {
        const count = await redis.incr(key);
        if (count === 1) {
            await redis.expire(key, windowSeconds);
        }
        return count <= limit;
    } catch {
        //如果 Redis 挂了就不限制（降级为放行）
        return true;
    }
}
