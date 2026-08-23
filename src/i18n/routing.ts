import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["el", "en", "ru"],
  defaultLocale: "el",
});

export type AppLocale = (typeof routing.locales)[number];
