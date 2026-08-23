"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { SubscriptionPackage } from "@/lib/subscriptionPackages";

interface SubscriptionPackageFormState {
  error?: string;
}

interface SubscriptionPackageFormProps {
  action: (
    prevState: SubscriptionPackageFormState,
    formData: FormData
  ) => Promise<SubscriptionPackageFormState>;
  mode: "create" | "edit";
  initialPackage?: Pick<
    SubscriptionPackage,
    | "name"
    | "description"
    | "maxUsers"
    | "maxBronzeMarriages"
    | "maxSilverMarriages"
    | "maxGoldMarriages"
  >;
}

export default function SubscriptionPackageForm({
  action,
  mode,
  initialPackage,
}: SubscriptionPackageFormProps) {
  const t = useTranslations("settings.subscriptionPackages");
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label={t("form.name")}>
        <input
          name="name"
          required
          defaultValue={initialPackage?.name}
          className="input"
        />
      </Field>

      <Field label={t("form.description")}>
        <textarea
          name="description"
          required
          rows={3}
          defaultValue={initialPackage?.description}
          className="input"
        />
      </Field>

      <Field label={t("form.maxUsers")}>
        <input
          type="number"
          name="maxUsers"
          min={0}
          required
          defaultValue={initialPackage?.maxUsers}
          className="input"
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field label={t("form.maxBronzeMarriages")}>
          <input
            type="number"
            name="maxBronzeMarriages"
            min={0}
            required
            defaultValue={initialPackage?.maxBronzeMarriages}
            className="input"
          />
        </Field>
        <Field label={t("form.maxSilverMarriages")}>
          <input
            type="number"
            name="maxSilverMarriages"
            min={0}
            required
            defaultValue={initialPackage?.maxSilverMarriages}
            className="input"
          />
        </Field>
        <Field label={t("form.maxGoldMarriages")}>
          <input
            type="number"
            name="maxGoldMarriages"
            min={0}
            required
            defaultValue={initialPackage?.maxGoldMarriages}
            className="input"
          />
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
            ? t("form.saving")
            : mode === "create"
              ? t("form.createSubmit")
              : t("form.saveSubmit")}
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
