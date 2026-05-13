import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Default currency code (ISO 4217) — override via env */
export const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || "CAD";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number, locale?: string, currency?: string) {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency || DEFAULT_CURRENCY,
    }).format(cents / 100);
}

/** Convert dollars (user input) to integer cents (database storage) */
export function toCents(dollars: number): number {
    return Math.round(dollars * 100);
}

/** Convert integer cents (database storage) to dollars (for display/math) */
export function fromCents(cents: number): number {
    return cents / 100;
}
