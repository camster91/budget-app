import redis from "./redis";

/**
 * Safely extracts the client IP from a Next.js Request.
 *
 * When behind a trusted proxy (TRUSTED_PROXY=true), reads from
 * x-real-ip or x-forwarded-for headers set by the reverse proxy.
 * When NOT behind a trusted proxy, returns a fixed key to prevent
 * IP spoofing via injected headers — all direct connections share
 * the same rate-limit bucket, which is still effective against
 * brute-force attacks.
 */
export function getClientIP(request: Request): string {
  const trusted = process.env.TRUSTED_PROXY === "true";
  if (trusted) {
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp;
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
  }
  return "direct-connection";
}

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
