"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction } from "./actions";

export default function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const t = useTranslations("login");
  const [state, formAction, isPending] = useActionState(loginAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="redirect" value={redirectTo ?? ""} />

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium tracking-wide text-muted uppercase">
          {t("username")}
        </span>
        <input name="username" required autoFocus className="input" />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium tracking-wide text-muted uppercase">
          {t("password")}
        </span>
        <input type="password" name="password" required className="input" />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-md bg-accent-dark px-5 py-2.5 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
