"use client";

import { useDict } from "./useDict";

/**
 * Access any translation string from the dictionary.
 * Usage: const t = useTranslations(); t.dashboard.title
 */
export function useTranslations() {
  return useDict();
}