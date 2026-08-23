"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import ProfessionalPicker, {
  type ProfessionalOption,
} from "@/components/ProfessionalPicker";
import type { Marriage } from "@/lib/marriages";
import type { Role } from "@/lib/users";

interface MarriageFormState {
  error?: string;
}

interface MarriageFormProps {
  action: (
    prevState: MarriageFormState,
    formData: FormData
  ) => Promise<MarriageFormState>;
  mode: "create" | "edit";
  role: Role;
  professionals: ProfessionalOption[];
  initialMarriage?: Pick<Marriage, "title" | "professionalId" | "husband" | "wife">;
}

export default function MarriageForm({
  action,
  mode,
  role,
  professionals,
  initialMarriage,
}: MarriageFormProps) {
  const t = useTranslations("weddings.form");
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label={t("title")}>
        <input
          name="title"
          required
          placeholder={t("titlePlaceholder")}
          defaultValue={initialMarriage?.title}
          className="input"
        />
      </Field>

      {role === "Root" && (
        <Field label={t("professional")}>
          <ProfessionalPicker
            professionals={professionals}
            defaultValue={initialMarriage?.professionalId}
          />
        </Field>
      )}

      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-1 text-xs font-medium tracking-wide text-accent-dark uppercase">
          {t("husband")}
        </legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label={t("firstName")}>
            <input
              name="husbandFirstName"
              required
              defaultValue={initialMarriage?.husband.firstName}
              className="input"
            />
          </Field>
          <Field label={t("lastName")}>
            <input
              name="husbandLastName"
              required
              defaultValue={initialMarriage?.husband.lastName}
              className="input"
            />
          </Field>
          <Field label={t("email")}>
            <input
              type="email"
              name="husbandEmail"
              defaultValue={initialMarriage?.husband.email}
              className="input"
            />
          </Field>
          <Field label={t("mobile")}>
            <input
              name="husbandMobile"
              defaultValue={initialMarriage?.husband.mobile}
              className="input"
            />
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
              defaultValue={initialMarriage?.wife.firstName}
              className="input"
            />
          </Field>
          <Field label={t("lastName")}>
            <input
              name="wifeLastName"
              required
              defaultValue={initialMarriage?.wife.lastName}
              className="input"
            />
          </Field>
          <Field label={t("email")}>
            <input
              type="email"
              name="wifeEmail"
              defaultValue={initialMarriage?.wife.email}
              className="input"
            />
          </Field>
          <Field label={t("mobile")}>
            <input
              name="wifeMobile"
              defaultValue={initialMarriage?.wife.mobile}
              className="input"
            />
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
