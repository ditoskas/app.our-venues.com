"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import type { Role, User } from "@/lib/users";
import { routing } from "@/i18n/routing";
import type { CelebrationOption } from "@/lib/userScope";

const ROLES: Role[] = ["Root", "Professional", "Couple"];

interface UserFormState {
  error?: string;
}

interface UserFormProps {
  action: (
    prevState: UserFormState,
    formData: FormData
  ) => Promise<UserFormState>;
  mode: "create" | "edit";
  initialUser?: Pick<
    User,
    | "displayName"
    | "username"
    | "role"
    | "professionalId"
    | "coupleId"
    | "defaultLocale"
  >;
  // Professional (scoped) mode: role is fixed to Couple and the couple is
  // picked from the professional's own celebrations instead of a raw id.
  celebrationOptions?: CelebrationOption[];
}

export default function UserForm({
  action,
  mode,
  initialUser,
  celebrationOptions,
}: UserFormProps) {
  const scoped = celebrationOptions !== undefined;
  const t = useTranslations("settings.users");
  const tLocale = useTranslations("languageSwitcher");
  const [state, formAction, isPending] = useActionState(action, {});
  const [role, setRole] = useState<Role>(scoped ? "Couple" : (initialUser?.role ?? "Root"));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t("form.displayName")}>
          <input
            name="displayName"
            required
            defaultValue={initialUser?.displayName}
            className="input"
          />
        </Field>
        <Field label={t("form.username")}>
          <input
            name="username"
            required
            defaultValue={initialUser?.username}
            className="input"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label={t("form.password")}
          hint={
            mode === "create"
              ? t("form.passwordHintCreate")
              : t("form.passwordHintEdit")
          }
        >
          <input
            type="password"
            name="password"
            required={mode === "create"}
            className="input"
          />
        </Field>
        {scoped ? (
          <input type="hidden" name="role" value="Couple" />
        ) : (
        <Field label={t("form.role")}>
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="input"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </select>
        </Field>
        )}
      </div>

      <Field label={t("form.defaultLocale")}>
        <select
          name="defaultLocale"
          defaultValue={initialUser?.defaultLocale ?? routing.defaultLocale}
          className="input"
        >
          {routing.locales.map((l) => (
            <option key={l} value={l}>
              {tLocale(l)}
            </option>
          ))}
        </select>
      </Field>

      {role === "Professional" && (
        <Field label={t("form.professionalId")}>
          <input
            name="professionalId"
            required
            defaultValue={initialUser?.professionalId}
            className="input"
          />
        </Field>
      )}

      {role === "Couple" && scoped && (
        <Field label={t("form.celebration")}>
          <select
            name="coupleId"
            required
            defaultValue={initialUser?.coupleId ?? ""}
            className="input"
          >
            <option value="" disabled>
              {t("form.selectCelebration")}
            </option>
            {celebrationOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </Field>
      )}

      {role === "Couple" && !scoped && (
        <Field label={t("form.coupleId")}>
          <input
            name="coupleId"
            required
            defaultValue={initialUser?.coupleId}
            className="input"
          />
        </Field>
      )}

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
