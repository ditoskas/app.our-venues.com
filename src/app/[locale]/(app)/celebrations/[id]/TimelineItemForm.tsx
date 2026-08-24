"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import LocalizedField from "./LocalizedField";
import type { LocalizedText } from "@/lib/celebrations";
import type { AppLocale } from "@/i18n/routing";

interface TimelineItemFormState {
  error?: string;
}

export interface SerializedTimelineItem {
  id: string;
  title: LocalizedText;
  description?: LocalizedText;
  date?: string;
  imageFilename?: string;
}

export default function TimelineItemForm({
  action,
  mode,
  initialItem,
  imageUrl,
  activeLanguages,
}: {
  action: (
    prevState: TimelineItemFormState,
    formData: FormData
  ) => Promise<TimelineItemFormState>;
  mode: "create" | "edit";
  initialItem?: SerializedTimelineItem;
  imageUrl?: string;
  activeLanguages: AppLocale[];
}) {
  const t = useTranslations("celebrations.story.timeline.form");
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <LocalizedField
        name="title"
        label={t("title")}
        required
        defaultValue={initialItem?.title}
        activeLanguages={activeLanguages}
      />

      <LocalizedField
        name="description"
        label={t("description")}
        multiline
        rows={3}
        defaultValue={initialItem?.description}
        activeLanguages={activeLanguages}
      />

      <Field label={t("date")}>
        <input
          type="date"
          name="date"
          defaultValue={initialItem?.date}
          className="input"
        />
      </Field>

      <Field label={t("image")}>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="mb-2 h-20 w-auto rounded border border-border object-cover"
          />
        )}
        <input
          type="file"
          name="image"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="input"
        />
      </Field>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent-dark px-5 py-2 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending
            ? t("saving")
            : mode === "create"
              ? t("createSubmit")
              : t("saveSubmit")}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
