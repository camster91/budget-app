/**
 * Structured JSON logger — writes one JSON line per log entry.
 * In production, pipe stdout to your log aggregator (Loki, Datadog, etc.)
 * or use `journalctl -u budget-app -o json` on systemd.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

function log(level: LogLevel, message: string, extra?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "production" && level === "debug") {
        return; // Skip debug logs in production
    }
    const entry = {
        time: new Date().toISOString(),
        level,
        msg: message,
        ...(extra || {}),
    };
    const output = JSON.stringify(entry);
    if (level === "error") {
        process.stderr.write(output + "\n");
    } else {
        process.stdout.write(output + "\n");
    }
}

export const logger = {
    debug: (msg: string, extra?: Record<string, unknown>) => log("debug", msg, extra),
    info: (msg: string, extra?: Record<string, unknown>) => log("info", msg, extra),
    warn: (msg: string, extra?: Record<string, unknown>) => log("warn", msg, extra),
    error: (msg: string, extra?: Record<string, unknown> | unknown) => {
        const normalized: Record<string, unknown> =
            extra && typeof extra === "object" && !Array.isArray(extra)
                ? (extra as Record<string, unknown>)
                : { raw: extra };
        log("error", msg, normalized);
    },
};
