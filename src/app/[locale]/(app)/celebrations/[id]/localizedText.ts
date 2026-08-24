import type { LocalizedText } from "@/lib/celebrations";
import type { AppLocale } from "@/i18n/routing";

export const LOCALES: AppLocale[] = ["el", "en", "ru"];

// Best-effort single string out of a LocalizedText for places that can only
// show one value — admin tables and log messages. `el` is the primary
// language (see LocalizedText in lib/celebrations.ts), so it's preferred;
// falls back to whichever other language was actually filled in.
export function localizedLabel(value?: LocalizedText): string {
  if (!value) return "";
  return value.el ?? value.en ?? value.ru ?? "";
}
