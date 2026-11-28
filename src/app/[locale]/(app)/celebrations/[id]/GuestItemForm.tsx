"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { routing, type AppLocale } from "@/i18n/routing";
import type { InviteChannel } from "@/lib/celebrations";

interface GuestItemFormState {
  error?: string;
}

export interface SerializedGuestItem {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  expectedAttendees?: number;
  confirmedAttendees?: number;
  confirmationDate?: string;
  deniedDate?: string;
  locale?: AppLocale;
  // Invitation status (system-managed, display only).
  inviteToken?: string;
  invitedAt?: string;
  invitedVia?: InviteChannel;
  inviteCount?: number;
  inviteOpenedAt?: string;
  tableAssignments?: { eventId: string; tableId: string }[];
}

export default function GuestItemForm({
  action,
  mode,
  initialItem,
}: {
  action: (
    prevState: GuestItemFormState,
    formData: FormData
  ) => Promise<GuestItemFormState>;
  mode: "create" | "edit";
  initialItem?: SerializedGuestItem;
}) {
  const t = useTranslations("celebrations.guests.form");
  const tLang = useTranslations("languageSwitcher");
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label={t("name")}>
        <input
          name="name"
          required
          defaultValue={initialItem?.name}
          className="input"
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t("phone")}>
          <input name="phone" defaultValue={initialItem?.phone} className="input" />
        </Field>
        <Field label={t("email")}>
          <input
            type="email"
            name="email"
            defaultValue={initialItem?.email}
            className="input"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t("expectedAttendees")}>
          <input
            type="number"
            name="expectedAttendees"
            min={0}
            defaultValue={initialItem?.expectedAttendees}
            className="input"
          />
        </Field>
        <Field label={t("confirmedAttendees")}>
          <input
            type="number"
            name="confirmedAttendees"
            min={0}
            defaultValue={initialItem?.confirmedAttendees}
            className="input"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t("confirmationDate")}>
          <input
            type="date"
            name="confirmationDate"
            defaultValue={initialItem?.confirmationDate}
            className="input"
          />
        </Field>
        <Field label={t("invitationLanguage")}>
          <select name="locale" defaultValue={initialItem?.locale ?? routing.defaultLocale} className="input">
            {routing.locales.map((l) => (
              <option key={l} value={l}>
                {tLang(l)}
              </option>
            ))}
          </select>
        </Field>
      </div>

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
