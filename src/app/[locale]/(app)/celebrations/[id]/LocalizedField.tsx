"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { LocalizedText } from "@/lib/celebrations";
import type { AppLocale } from "@/i18n/routing";
import { LOCALES } from "./localizedText";

// One field, three languages: renders an input/textarea per locale (all
// mounted at once so FormData picks up every language on submit, see
// `${name}.${lang}` below) and a tab strip to switch which one is visible.
// `required` only applies to the `el` input — el is the primary language
// (see LocalizedText in lib/celebrations.ts), en/ru are optional translations.
// `activeLanguages` (the celebration's "Active Languages" setting, see
// CelebrationInfoForm.tsx) only restricts which tabs are offered — every
// locale's input still renders and submits regardless, so a language that
// gets deactivated doesn't lose whatever was last saved for it, it's just
// not reachable to edit until reactivated.
export default function LocalizedField({
  name,
  label,
  hint,
  multiline,
  rows,
  required,
  defaultValue,
  activeLanguages,
}: {
  name: string;
  label: string;
  hint?: string;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  defaultValue?: LocalizedText;
  activeLanguages: AppLocale[];
}) {
  const tLang = useTranslations("celebrations.languages");
  const [active, setActive] = useState<(typeof LOCALES)[number]>("el");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium tracking-wide text-muted uppercase">
          {label}
        </span>
        <div className="flex gap-1">
          {activeLanguages.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setActive(lang)}
              title={tLang(lang)}
              aria-label={tLang(lang)}
              className={`rounded px-2 py-0.5 text-xs font-semibold uppercase transition-colors ${
                active === lang
                  ? "bg-accent-dark text-white"
                  : "bg-accent-soft/30 text-muted hover:bg-accent-soft/60"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>
      {LOCALES.map((lang) =>
        multiline ? (
          <textarea
            key={lang}
            name={`${name}.${lang}`}
            rows={rows ?? 3}
            required={required && lang === "el"}
            defaultValue={defaultValue?.[lang]}
            className={`input ${active === lang ? "" : "hidden"}`}
          />
        ) : (
          <input
            key={lang}
            name={`${name}.${lang}`}
            required={required && lang === "el"}
            defaultValue={defaultValue?.[lang]}
            className={`input ${active === lang ? "" : "hidden"}`}
          />
        )
      )}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
