"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import FormDialog from "@/components/FormDialog";
import UserForm from "./UserForm";
import DeleteUserButton from "./DeleteUserButton";
import { createUserAction, updateUserAction, deleteUserAction } from "./actions";
import type { Role } from "@/lib/users";
import type { AppLocale } from "@/i18n/routing";

export interface SerializedUser {
  _id: string;
  displayName: string;
  username: string;
  role: Role;
  professionalId?: string;
  coupleId?: string;
  defaultLocale: AppLocale;
}

type DialogState = { mode: "create" } | { mode: "edit"; user: SerializedUser } | null;

export default function UsersManager({ users }: { users: SerializedUser[] }) {
  const t = useTranslations("settings.users");
  const tCommon = useTranslations("common");
  const [dialog, setDialog] = useState<DialogState>(null);

  return (
    <div>
      <PageHeader
        title={t("title")}
        action={
          <button
            type="button"
            onClick={() => setDialog({ mode: "create" })}
            className="rounded-md bg-accent-dark px-4 py-2 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90"
          >
            {t("newUser")}
          </button>
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-accent-soft/40 text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3">{t("table.name")}</th>
              <th className="px-4 py-3">{t("table.username")}</th>
              <th className="px-4 py-3">{t("table.role")}</th>
              <th className="px-4 py-3">{t("table.linkedId")}</th>
              <th className="px-4 py-3 text-right">{tCommon("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u._id}>
                <td className="px-4 py-3 text-foreground">{u.displayName}</td>
                <td className="px-4 py-3 text-muted">{u.username}</td>
                <td className="px-4 py-3 text-foreground">
                  {t(`roles.${u.role}`)}
                </td>
                <td className="px-4 py-3 text-muted">
                  {u.professionalId ?? u.coupleId ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => setDialog({ mode: "edit", user: u })}
                      title={t("edit")}
                      aria-label={t("edit")}
                      className="text-muted transition-colors hover:text-accent-dark"
                    >
                      <Pencil size={16} />
                    </button>
                    <DeleteUserButton action={deleteUserAction.bind(null, u._id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormDialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog?.mode === "edit" ? t("editTitle") : t("newUser")}
      >
        {dialog?.mode === "create" && (
          <UserForm action={createUserAction} mode="create" />
        )}
        {dialog?.mode === "edit" && (
          <UserForm
            key={dialog.user._id}
            action={updateUserAction.bind(null, dialog.user._id)}
            mode="edit"
            initialUser={dialog.user}
          />
        )}
      </FormDialog>
    </div>
  );
}
