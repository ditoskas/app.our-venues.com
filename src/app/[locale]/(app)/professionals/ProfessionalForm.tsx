"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { Professional } from "@/lib/professionals";
import { PLAN_STORAGE_QUOTA_MB, PROFESSIONAL_PLANS } from "@/lib/plans";

interface ProfessionalFormState {
  error?: string;
}

interface ProfessionalFormProps {
  action: (
    prevState: ProfessionalFormState,
    formData: FormData
  ) => Promise<ProfessionalFormState>;
  mode: "create" | "edit";
  initialProfessional?: Pick<
    Professional,
    | "companyName"
    | "contactPerson"
    | "phone"
    | "mobile"
    | "email"
    | "website"
    | "country"
    | "city"
    | "address"
    | "postCode"
    | "plan"
    | "storageQuotaMB"
  >;
  logoUrl?: string;
}

export default function ProfessionalForm({
  action,
  mode,
  initialProfessional,
  logoUrl,
}: ProfessionalFormProps) {
  const t = useTranslations("professionals");
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t("form.companyName")}>
          <input
            name="companyName"
            required
            defaultValue={initialProfessional?.companyName}
            className="input"
          />
        </Field>
        <Field label={t("form.contactPerson")}>
          <input
            name="contactPerson"
            required
            defaultValue={initialProfessional?.contactPerson}
            className="input"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t("form.phone")}>
          <input
            name="phone"
            required
            defaultValue={initialProfessional?.phone}
            className="input"
          />
        </Field>
        <Field label={t("form.mobile")}>
          <input
            name="mobile"
            required
            defaultValue={initialProfessional?.mobile}
            className="input"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t("form.email")}>
          <input
            type="email"
            name="email"
            required
            defaultValue={initialProfessional?.email}
            className="input"
          />
        </Field>
        <Field label={t("form.website")}>
          <input
            type="url"
            name="website"
            placeholder="https://"
            defaultValue={initialProfessional?.website}
            className="input"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t("form.country")}>
          <input
            name="country"
            defaultValue={initialProfessional?.country}
            className="input"
          />
        </Field>
        <Field label={t("form.city")}>
          <input
            name="city"
            defaultValue={initialProfessional?.city}
            className="input"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t("form.address")}>
          <input
            name="address"
            defaultValue={initialProfessional?.address}
            className="input"
          />
        </Field>
        <Field label={t("form.postCode")}>
          <input
            name="postCode"
            defaultValue={initialProfessional?.postCode}
            className="input"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t("form.plan")}>
          <select
            name="plan"
            defaultValue={initialProfessional?.plan ?? "Free"}
            className="input"
          >
            {PROFESSIONAL_PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {t(`form.plans.${plan}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label={t("form.storageQuotaMB")}
          hint={t("form.storageQuotaHint", {
            free: PLAN_STORAGE_QUOTA_MB.Free,
            premium: PLAN_STORAGE_QUOTA_MB.Premium,
          })}
        >
          <input
            type="number"
            name="storageQuotaMB"
            min={0}
            step="any"
            defaultValue={initialProfessional?.storageQuotaMB}
            className="input"
          />
        </Field>
      </div>

      <Field label={t("form.logo")} hint={t("form.logoHint")}>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="mb-2 h-16 w-auto rounded border border-border object-contain p-1"
          />
        )}
        <input
          type="file"
          name="logo"
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
            ? t("form.saving")
            : mode === "create"
              ? t("form.createSubmit")
              : t("form.saveSubmit")}
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
