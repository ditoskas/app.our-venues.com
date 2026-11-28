"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, MessageSquareText } from "lucide-react";
import LocalizedField from "./LocalizedField";
import { updateInvitationMessageAction } from "./actions";
import type { LocalizedText } from "@/lib/celebrations";
import type { AppLocale } from "@/i18n/routing";

// The invitation text sent to guests (one per active language), collapsed by
// default above the guest list.
export default function InvitationMessageForm({
  celebrationId,
  initialValue,
  activeLanguages,
}: {
  celebrationId: string;
  initialValue: LocalizedText;
  activeLanguages: AppLocale[];
}) {
  const t = useTranslations("celebrations.invitations");
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    updateInvitationMessageAction.bind(null, celebrationId),
    {}
  );

  return (
    <section className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
      >
        <span className="flex items-center gap-2 font-serif text-lg text-foreground">
          <MessageSquareText size={18} className="text-accent-dark" />
          {t("messageTitle")}
        </span>
        <ChevronDown size={16} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <form action={formAction} className="flex flex-col gap-4 border-t border-border px-6 py-5">
          <p className="max-w-2xl text-sm text-muted">{t("messageDescription")}</p>
          <LocalizedField
            name="invitationMessage"
            label={t("messageLabel")}
            hint={t.raw("placeholdersHint") as string}
            multiline
            rows={8}
            defaultValue={initialValue}
            activeLanguages={activeLanguages}
          />
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-accent-dark px-5 py-2 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? t("saving") : t("saveMessage")}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
