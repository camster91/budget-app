/**
 * en-CA locale helpers for consistent date/number formatting
 * across the entire budget app.
 */

export const LOCALE = "en-CA";

/** Format a Date as a short month name (e.g. "Jan", "Feb") */
export function formatMonthShort(date: Date): string {
    return date.toLocaleString(LOCALE, { month: "short" });
}

/** Format a Date as a long month + year (e.g. "January 2026") */
export function formatMonthLongYear(date: Date): string {
    return date.toLocaleString(LOCALE, { month: "long", year: "numeric" });
}

/** Format a Date as a locale-friendly date string */
export function formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString(LOCALE);
}

/** Format a Date as a short date + time */
export function formatDateTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString(LOCALE) + " at " + d.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
}

/** Format a Date as month short + year (e.g. "Jan 2026") */
export function formatMonthShortYear(date: Date): string {
    return date.toLocaleDateString(LOCALE, { month: "short", year: "numeric" });
}

/** Format a Date as "Month Day" (e.g. "January 15") */
export function formatMonthDay(date: Date): string {
    return date.toLocaleDateString(LOCALE, { month: "long", day: "numeric" });
}

/** Format a number with exactly N decimal places (locale-aware via Intl) */
export function formatDecimal(value: number, fractionDigits: number = 2): string {
    return new Intl.NumberFormat(LOCALE, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).format(value);
}

/** Format a percentage value (e.g. 12.5 -> "12.5%") */
export function formatPercent(value: number, fractionDigits: number = 1): string {
    return new Intl.NumberFormat(LOCALE, {
        style: "percent",
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).format(value / 100);
}

/** Format a dollar amount using formatCurrency (from utils) */
export { formatCurrency } from "./utils";
