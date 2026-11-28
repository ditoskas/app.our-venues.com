"use client";

import { useActionState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordRules";
import { useTranslations } from "next-intl";
import { updateCelebrationCoupleAction } from "./actions";
import type { Spouse } from "@/lib/celebrations";

export default function CoupleInfoForm({
  celebrationId,
  husband,
  wife,
}: {
  celebrationId: string;
  husband: Spouse;
  wife: Spouse;
}) {
  const t = useTranslations("celebrations.form");
  const tCouple = useTranslations("celebrations.coupleInfo");
  const action = updateCelebrationCoupleAction.bind(null, celebrationId);
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-1 text-xs font-medium tracking-wide text-accent-dark uppercase">
          {t("husband")}
        </legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label={t("firstName")}>
            <input
              name="husbandFirstName"
              required
              defaultValue={husband.firstName}
              className="input"
            />
          </Field>
          <Field label={t("lastName")}>
            <input
              name="husbandLastName"
              required
              defaultValue={husband.lastName}
              className="input"
            />
          </Field>
          <Field label={t("email")}>
            <input
              type="email"
              name="husbandEmail"
              defaultValue={husband.email}
              className="input"
            />
          </Field>
          <Field label={t("mobile")}>
            <input
              name="husbandMobile"
              defaultValue={husband.mobile}
              className="input"
            />
          </Field>
          <Field label={t("loginPassword")}>
            <input
              type="password"
              name="husbandPassword"
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              className="input"
            />
            <span className="text-xs text-muted">{t("loginPasswordHint", { min: MIN_PASSWORD_LENGTH })}</span>
          </Field>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-1 text-xs font-medium tracking-wide text-accent-dark uppercase">
          {t("wife")}
        </legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label={t("firstName")}>
            <input
              name="wifeFirstName"
              required
              defaultValue={wife.firstName}
              className="input"
            />
          </Field>
          <Field label={t("lastName")}>
            <input
              name="wifeLastName"
              required
              defaultValue={wife.lastName}
              className="input"
            />
          </Field>
          <Field label={t("email")}>
            <input
              type="email"
              name="wifeEmail"
              defaultValue={wife.email}
              className="input"
            />
          </Field>
          <Field label={t("mobile")}>
            <input
              name="wifeMobile"
              defaultValue={wife.mobile}
              className="input"
            />
          </Field>
          <Field label={t("loginPassword")}>
            <input
              type="password"
              name="wifePassword"
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              className="input"
            />
            <span className="text-xs text-muted">{t("loginPasswordHint", { min: MIN_PASSWORD_LENGTH })}</span>
          </Field>
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent-dark px-5 py-2 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? tCouple("saving") : tCouple("saveSubmit")}
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
