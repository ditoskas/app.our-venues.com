"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { routing } from "@/i18n/routing";
import { updateProfileAction } from "./actions";

export default function ProfileForm({
  displayName,
  defaultLocale,
}: {
  displayName: string;
  defaultLocale: string;
}) {
  const t = useTranslations("profile");
  const tLocale = useTranslations("languageSwitcher");
  const [state, formAction, isPending] = useActionState(updateProfileAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium tracking-wide text-muted uppercase">
            {t("displayName")}
          </span>
          <input
            name="displayName"
            required
            defaultValue={displayName}
            className="input"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium tracking-wide text-muted uppercase">
            {t("language")}
          </span>
          <select name="defaultLocale" defaultValue={defaultLocale} className="input">
            {routing.locales.map((l) => (
              <option key={l} value={l}>
                {tLocale(l)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent-dark px-5 py-2 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? t("saving") : t("saveChanges")}
        </button>
      </div>
    </form>
  );
}
