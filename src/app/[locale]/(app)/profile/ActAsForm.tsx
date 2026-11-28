"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { startActingAsAction, stopActingAsAction } from "./actions";

export interface ActAsOption {
  id: string;
  displayName: string;
  username: string;
  role: string;
}

export default function ActAsForm({
  users,
  actingAsId,
}: {
  users: ActAsOption[];
  actingAsId: string | null;
}) {
  const t = useTranslations("profile.actAs");
  const tRoles = useTranslations("settings.users.roles");
  const [state, formAction, isPending] = useActionState(startActingAsAction, {});

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-xl text-sm text-muted">{t("description")}</p>

      <form action={formAction} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5 sm:max-w-md">
          <span className="text-xs font-medium tracking-wide text-muted uppercase">
            {t("user")}
          </span>
          <select
            name="userId"
            required
            defaultValue={actingAsId ?? ""}
            className="input"
          >
            <option value="" disabled>
              {t("selectUser")}
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.displayName} ({u.username}) — {tRoles(u.role as "Professional" | "Couple")}
              </option>
            ))}
          </select>
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isPending || users.length === 0}
            className="rounded-md bg-accent-dark px-5 py-2 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? t("starting") : t("start")}
          </button>
        </div>
      </form>

      {actingAsId && (
        <form action={stopActingAsAction}>
          <button
            type="submit"
            className="rounded-md border border-border px-5 py-2 text-sm font-medium tracking-wide text-foreground transition-colors hover:bg-accent-soft/40"
          >
            {t("stop")}
          </button>
        </form>
      )}
    </div>
  );
}
