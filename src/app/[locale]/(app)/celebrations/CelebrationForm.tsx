"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import ProfessionalPicker, {
  type ProfessionalOption,
} from "@/components/ProfessionalPicker";
import type { Celebration, CelebrationType } from "@/lib/celebrations";
import { getCelebrationBaseDomain } from "@/lib/constants";
import type { Role } from "@/lib/users";

const CELEBRATION_TYPES: CelebrationType[] = ["Marriage", "Christening"];

interface CelebrationFormState {
  error?: string;
}

interface CelebrationFormProps {
  action: (
    prevState: CelebrationFormState,
    formData: FormData
  ) => Promise<CelebrationFormState>;
  mode: "create" | "edit";
  role: Role;
  professionals: ProfessionalOption[];
  initialCelebration?: Pick<
    Celebration,
    "title" | "type" | "professionalId" | "price" | "subdomain" | "husband" | "wife"
  >;
}

export default function CelebrationForm({
  action,
  mode,
  role,
  professionals,
  initialCelebration,
}: CelebrationFormProps) {
  const t = useTranslations("celebrations.form");
  const tTypes = useTranslations("celebrations.types");
  const [state, formAction, isPending] = useActionState(action, {});
  const [type, setType] = useState<CelebrationType>(initialCelebration?.type ?? "Marriage");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label={t("title")}>
        <input
          name="title"
          required
          placeholder={t("titlePlaceholder")}
          defaultValue={initialCelebration?.title}
          className="input"
        />
      </Field>

      <Field label={t("type")}>
        <select
          name="type"
          required
          value={type}
          onChange={(e) => setType(e.target.value as CelebrationType)}
          className="input"
        >
          {CELEBRATION_TYPES.map((celebrationType) => (
            <option key={celebrationType} value={celebrationType}>
              {tTypes(celebrationType)}
            </option>
          ))}
        </select>
      </Field>

      {role === "Root" && (
        <Field label={t("professional")}>
          <ProfessionalPicker
            professionals={professionals}
            defaultValue={initialCelebration?.professionalId}
          />
        </Field>
      )}

      <Field label={t("price")}>
        <input
          type="number"
          name="price"
          required
          min={0}
          step="0.01"
          defaultValue={initialCelebration?.price}
          className="input"
        />
      </Field>

      <Field
        label={t("subdomain")}
        hint={t("subdomainHint", { baseDomain: getCelebrationBaseDomain(type) })}
      >
        <div className="flex items-stretch">
          <input
            name="subdomain"
            placeholder={t("subdomainPlaceholder")}
            defaultValue={initialCelebration?.subdomain}
            className="input rounded-r-none"
          />
          <span className="flex items-center rounded-r-md border border-l-0 border-border bg-accent-soft/40 px-3 text-sm whitespace-nowrap text-muted">
            .{getCelebrationBaseDomain(type)}
          </span>
        </div>
      </Field>

      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-1 text-xs font-medium tracking-wide text-accent-dark uppercase">
          {t("husband")}
        </legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label={t("firstName")}>
            <input
              name="husbandFirstName"
              required
              defaultValue={initialCelebration?.husband.firstName}
              className="input"
            />
          </Field>
          <Field label={t("lastName")}>
            <input
              name="husbandLastName"
              required
              defaultValue={initialCelebration?.husband.lastName}
              className="input"
            />
          </Field>
          <Field label={t("email")}>
            <input
              type="email"
              name="husbandEmail"
              defaultValue={initialCelebration?.husband.email}
              className="input"
            />
          </Field>
          <Field label={t("mobile")}>
            <input
              name="husbandMobile"
              defaultValue={initialCelebration?.husband.mobile}
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
              defaultValue={initialCelebration?.wife.firstName}
              className="input"
            />
          </Field>
          <Field label={t("lastName")}>
            <input
              name="wifeLastName"
              required
              defaultValue={initialCelebration?.wife.lastName}
              className="input"
            />
          </Field>
          <Field label={t("email")}>
            <input
              type="email"
              name="wifeEmail"
              defaultValue={initialCelebration?.wife.email}
              className="input"
            />
          </Field>
          <Field label={t("mobile")}>
            <input
              name="wifeMobile"
              defaultValue={initialCelebration?.wife.mobile}
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
