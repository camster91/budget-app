/**
 * Health monitoring script — runs every 5 minutes via cron.
 * - Hits /api/health on the deployed app
 * - Sends Telegram alert on failure
 * - Logs response time
 *
 * Cron: set up a shell wrapper that runs this every 5 minutes.
 */

import { format } from "date-fns";
import { sendTelegramAlert } from "./alert-telegram";

const APP_URL =
  process.env.APP_URL ?? "https://budget.ashbi.ca"; // # TODO(cam): Set APP_URL if different
const HEALTH_PATH = "/api/health";
const TIMEOUT_MS = 10_000;
const MAX_RESPONSE_TIME_MS = 3_000;

async function checkHealth(): Promise<{
  ok: boolean;
  statusCode: number;
  responseTimeMs: number;
  body: unknown;
}> {
  const url = `${APP_URL}${HEALTH_PATH}`;
  const start = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "budget-app-monitor/1.0" },
    });
    clearTimeout(timeout);
    const responseTimeMs = Date.now() - start;

    let body: unknown = {};
    try {
      body = await res.json();
    } catch {
      // non-JSON response
    }

    return {
      ok: res.ok,
      statusCode: res.status,
      responseTimeMs,
      body,
    };
  } catch (err) {
    clearTimeout(timeout);
    return {
      ok: false,
      statusCode: 0,
      responseTimeMs: Date.now() - start,
      body: { error: err instanceof Error ? err.message : String(err) },
    };
  }
}

async function main() {
  const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  console.log(`[monitor] ${timestamp} — checking ${APP_URL}${HEALTH_PATH}`);

  const { ok, statusCode, responseTimeMs, body } = await checkHealth();
  const ms = responseTimeMs;

  if (!ok) {
    console.error(`[monitor] DOWN — status=${statusCode} time=${ms}ms`);
    await sendTelegramAlert({
      message: `Health check failed after ${ms}ms\n\nApp: ${APP_URL}\nStatus: ${statusCode}`,
      level: "critical",
      service: "budget-app",
      metadata: {
        url: `${APP_URL}${HEALTH_PATH}`,
        responseMs: String(ms),
        status: String(statusCode),
      },
    });
    process.exit(1);
  }

  if (ms > MAX_RESPONSE_TIME_MS) {
    console.warn(`[monitor] SLOW — time=${ms}ms (threshold=${MAX_RESPONSE_TIME_MS}ms)`);
    await sendTelegramAlert({
      message: `Health check is slow: ${ms}ms\n\nApp: ${APP_URL}\nThreshold: ${MAX_RESPONSE_TIME_MS}ms`,
      level: "warning",
      service: "budget-app",
      metadata: {
        url: `${APP_URL}${HEALTH_PATH}`,
        responseMs: String(ms),
        thresholdMs: String(MAX_RESPONSE_TIME_MS),
      },
    });
  } else {
    console.log(`[monitor] OK — status=${statusCode} time=${ms}ms`);
  }

  console.log(`[monitor] response: ${JSON.stringify(body)}`);
}

main().catch((err) => {
  console.error("[monitor] Unexpected error:", err);
  process.exit(1);
});
