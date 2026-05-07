#!/usr/bin/env tsx
/**
 * Sends alerts to Telegram.
 * Usage: tsx scripts/alert-telegram.ts "Deploy failed: budget-app" "production"
 */

import { format } from "date-fns";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // # TODO(cam): Set TELEGRAM_BOT_TOKEN in environment
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // # TODO(cam): Set TELEGRAM_CHAT_ID in environment

type AlertLevel = "info" | "warning" | "error" | "critical";

interface AlertPayload {
  message: string;
  level: AlertLevel;
  service?: string;
  metadata?: Record<string, string>;
}

const EMOJI: Record<AlertLevel, string> = {
  info: "ℹ️",
  warning: "⚠️",
  error: "🚨",
  critical: "🚨🚨",
};

function buildMessage(payload: AlertPayload): string {
  const { message, level, service } = payload;
  const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  const emoji = EMOJI[level];

  let text = `${emoji} *${level.toUpperCase()}* | ${service ?? "budget-app"} | ${timestamp}\n\n${message}`;

  if (payload.metadata) {
    const lines = Object.entries(payload.metadata)
      .map(([k, v]) => `  • *${k}*: \`${v}\``)
      .join("\n");
    text += `\n\n${lines}`;
  }

  return text;
}

export async function sendTelegramAlert(payload: AlertPayload): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping alert");
    console.log("[telegram] Message:", payload.message);
    return false;
  }

  const text = buildMessage(payload);
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown",
      }),
    });

    if (!res.ok) {
      console.error(`[telegram] Failed to send: ${res.status} ${res.statusText}`);
      return false;
    }

    console.log(`[telegram] Alert sent: ${payload.level} — ${payload.message}`);
    return true;
  } catch (err) {
    console.error("[telegram] Error sending alert:", err);
    return false;
  }
}

// CLI entry point
if (require.main === module) {
  const [, , ...args] = process.argv;
  const message = args[0] ?? "No message";
  const level = (args[1] ?? "info") as AlertLevel;
  const service = args[2];

  sendTelegramAlert({ message, level, service }).then((ok) => {
    process.exit(ok ? 0 : 1);
  });
}
