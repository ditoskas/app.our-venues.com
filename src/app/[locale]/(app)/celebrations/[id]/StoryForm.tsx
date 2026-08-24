"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateCelebrationStoryAction } from "./actions";
import LocalizedField from "./LocalizedField";
import type { LocalizedText } from "@/lib/celebrations";
import type { AppLocale } from "@/i18n/routing";

export interface StoryValues {
  storyTitle?: LocalizedText;
  storySubtitle?: LocalizedText;
  storyParagraph?: LocalizedText;
}

export default function StoryForm({
  celebrationId,
  initialValues,
  activeLanguages,
}: {
  celebrationId: string;
  initialValues: StoryValues;
  activeLanguages: AppLocale[];
}) {
  const t = useTranslations("celebrations.story");
  const action = updateCelebrationStoryAction.bind(null, celebrationId);
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <LocalizedField
        name="storyTitle"
        label={t("title")}
        defaultValue={initialValues.storyTitle}
        activeLanguages={activeLanguages}
      />

      <LocalizedField
        name="storySubtitle"
        label={t("subtitle")}
        defaultValue={initialValues.storySubtitle}
        activeLanguages={activeLanguages}
      />

      <LocalizedField
        name="storyParagraph"
        label={t("paragraph")}
        multiline
        rows={4}
        defaultValue={initialValues.storyParagraph}
        activeLanguages={activeLanguages}
      />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent-dark px-5 py-2 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? t("saving") : t("saveSubmit")}
        </button>
      </div>
    </form>
  );
}
