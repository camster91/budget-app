import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, locale?: string, currency?: string) {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency || "CAD",
    }).format(amount);
}
