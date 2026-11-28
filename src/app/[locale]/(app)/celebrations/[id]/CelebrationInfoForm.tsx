"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { updateCelebrationInfoAction } from "./actions";
import LocalizedField from "./LocalizedField";
import type { CelebrationType, ChildGender, LocalizedText } from "@/lib/celebrations";
import type { AppLocale } from "@/i18n/routing";

export interface CelebrationInfoValues {
  title: string;
  childGender?: ChildGender;
  celebrationDate?: string;
  headline?: LocalizedText;
  quote?: LocalizedText;
  countdownParagraph?: LocalizedText;
  activeLanguages: AppLocale[];
  maxGuestsPerInvitation?: number;
  showMaxGuests: boolean;
  showSeating: boolean;
  showLive: boolean;
  showReservation: boolean;
  isSitePublic: boolean;
  isConfirmationRequiredOnLiveEvents: boolean;
}

export default function CelebrationInfoForm({
  celebrationId,
  celebrationType,
  initialValues,
  heroBackgroundUrl,
  invitationUrl,
}: {
  celebrationId: string;
  celebrationType: CelebrationType;
  initialValues: CelebrationInfoValues;
  heroBackgroundUrl?: string;
  invitationUrl?: string;
}) {
  const t = useTranslations("celebrations.form");
  const tInfo = useTranslations("celebrations.info");
  const tLang = useTranslations("celebrations.languages");
  const action = updateCelebrationInfoAction.bind(null, celebrationId);
  const [state, formAction, isPending] = useActionState(action, {});
  const [activeLanguages, setActiveLanguages] = useState<AppLocale[]>(
    initialValues.activeLanguages.length ? initialValues.activeLanguages : ["el"]
  );

  function toggleLanguage(lang: "en" | "ru", checked: boolean) {
    setActiveLanguages((prev) =>
      checked ? [...prev, lang] : prev.filter((l) => l !== lang)
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label={t("title")}>
        <input
          name="title"
          required
          placeholder={t("titlePlaceholder")}
          defaultValue={initialValues.title}
          className="input"
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={tInfo("celebrationDate")}>
          <input
            type="date"
            name="celebrationDate"
            defaultValue={initialValues.celebrationDate}
            className="input"
          />
        </Field>
        <Field label={tInfo("maxGuestsPerInvitation")}>
          <input
            type="number"
            name="maxGuestsPerInvitation"
            min={0}
            defaultValue={initialValues.maxGuestsPerInvitation}
            className="input"
          />
        </Field>
      </div>

      {celebrationType === "Christening" && (
        <Field label={tInfo("childGender")} hint={tInfo("childGenderHint")}>
          <select
            name="childGender"
            defaultValue={initialValues.childGender ?? ""}
            className="input"
          >
            <option value="">{tInfo("childGenderNone")}</option>
            <option value="Boy">{tInfo("childGenderBoy")}</option>
            <option value="Girl">{tInfo("childGenderGirl")}</option>
          </select>
        </Field>
      )}

      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-1 text-xs font-medium tracking-wide text-accent-dark uppercase">
          {tInfo("activeLanguages")}
        </legend>
        <p className="mb-3 text-xs text-muted">{tInfo("activeLanguagesHint")}</p>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-foreground opacity-60">
            <input
              type="checkbox"
              checked
              disabled
              className="h-4 w-4 rounded border-border accent-accent-dark"
            />
            {tLang("el")}
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="activeLanguages"
              value="en"
              defaultChecked={initialValues.activeLanguages.includes("en")}
              onChange={(e) => toggleLanguage("en", e.target.checked)}
              className="h-4 w-4 rounded border-border accent-accent-dark"
            />
            {tLang("en")}
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="activeLanguages"
              value="ru"
              defaultChecked={initialValues.activeLanguages.includes("ru")}
              onChange={(e) => toggleLanguage("ru", e.target.checked)}
              className="h-4 w-4 rounded border-border accent-accent-dark"
            />
            {tLang("ru")}
          </label>
        </div>
      </fieldset>

      <LocalizedField
        name="headline"
        label={tInfo("headline")}
        defaultValue={initialValues.headline}
        activeLanguages={activeLanguages}
      />

      <LocalizedField
        name="quote"
        label={tInfo("quote")}
        multiline
        rows={2}
        defaultValue={initialValues.quote}
        activeLanguages={activeLanguages}
      />

      <LocalizedField
        name="countdownParagraph"
        label={tInfo("countdownParagraph")}
        multiline
        rows={3}
        defaultValue={initialValues.countdownParagraph}
        activeLanguages={activeLanguages}
      />

      <Field label={tInfo("heroBackground")} hint={tInfo("heroBackgroundHint")}>
        {heroBackgroundUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroBackgroundUrl}
            alt=""
            className="mb-2 h-32 w-full rounded border border-border object-cover"
          />
        )}
        <input
          type="file"
          name="heroBackground"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="input"
        />
      </Field>

      <Field label={tInfo("invitation")} hint={tInfo("invitationHint")}>
        {invitationUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={invitationUrl}
            alt=""
            className="mb-2 h-32 w-full rounded border border-border object-cover"
          />
        )}
        <input
          type="file"
          name="invitation"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="input"
        />
      </Field>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-8">
        <Checkbox
          name="showMaxGuests"
          label={tInfo("showMaxGuests")}
          defaultChecked={initialValues.showMaxGuests}
        />
        <Checkbox
          name="showSeating"
          label={tInfo("showSeating")}
          defaultChecked={initialValues.showSeating}
        />
        <Checkbox
          name="showLive"
          label={tInfo("showLive")}
          defaultChecked={initialValues.showLive}
        />
        <Checkbox
          name="showReservation"
          label={tInfo("showReservation")}
          defaultChecked={initialValues.showReservation}
        />
        <Checkbox
          name="isSitePublic"
          label={tInfo("isSitePublic")}
          defaultChecked={initialValues.isSitePublic}
        />
        <Checkbox
          name="isConfirmationRequiredOnLiveEvents"
          label={tInfo("isConfirmationRequiredOnLiveEvents")}
          defaultChecked={initialValues.isConfirmationRequiredOnLiveEvents}
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent-dark px-5 py-2 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? tInfo("saving") : tInfo("saveSubmit")}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-border accent-accent-dark"
      />
      {label}
    </label>
  );
}
