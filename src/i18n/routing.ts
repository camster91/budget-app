import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Start with English; add more locales as translations are added
  locales: ["en"],
  defaultLocale: "en",
  // Keep URLs clean: no /en prefix for default locale
  localePrefix: "as-needed",
});
