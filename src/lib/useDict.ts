"use client";

import { dict } from "./i18n-dict";

/**
 * Returns the full translation dictionary. Import this in client components.
 * For server components, import `dict` directly from `i18n-dict`.
 */
export function useDict() {
  return dict;
}