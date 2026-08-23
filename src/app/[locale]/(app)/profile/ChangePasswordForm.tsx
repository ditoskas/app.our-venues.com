"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { changePasswordAction } from "./actions";

export default function ChangePasswordForm() {
  const t = useTranslations("profile");
  const [state, formAction, isPending] = useActionState(changePasswordAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium tracking-wide text-muted uppercase">
          {t("currentPassword")}
        </span>
        <input type="password" name="currentPassword" required className="input" />
      </label>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium tracking-wide text-muted uppercase">
            {t("newPassword")}
          </span>
          <input type="password" name="newPassword" required className="input" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium tracking-wide text-muted uppercase">
            {t("confirmPassword")}
          </span>
          <input type="password" name="confirmPassword" required className="input" />
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent-dark px-5 py-2 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? t("changing") : t("changePassword")}
        </button>
      </div>
    </form>
  );
}
