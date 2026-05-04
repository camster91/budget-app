export const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

export function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const current = rateLimitMap.get(ip);

    if (!current || now > current.expiresAt) {
        rateLimitMap.set(ip, { count: 1, expiresAt: now + windowMs });
        return true;
    }

    if (current.count >= limit) {
        return false;
    }

    current.count += 1;
    return true;
}
