import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Default currency code (ISO 4217) — override via env */
export const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || "CAD";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, locale?: string, currency?: string) {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency || DEFAULT_CURRENCY,
    }).format(amount);
}
