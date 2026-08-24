"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Plus, Pencil, Phone, Mail } from "lucide-react";
import FormDialog from "@/components/FormDialog";
import GuestItemForm, { type SerializedGuestItem } from "./GuestItemForm";
import DeleteGuestItemButton from "./DeleteGuestItemButton";
import {
  createGuestItemAction,
  updateGuestItemAction,
  deleteGuestItemAction,
} from "./actions";

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; item: SerializedGuestItem }
  | null;

export default function GuestsManager({
  celebrationId,
  items,
}: {
  celebrationId: string;
  items: SerializedGuestItem[];
}) {
  const t = useTranslations("celebrations.guests");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const [dialog, setDialog] = useState<DialogState>(null);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setDialog({ mode: "create" })}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent-dark px-4 py-2 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          {t("add")}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-8 py-16 text-center">
          <p className="text-sm text-muted">{t("empty")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-accent-soft/40 text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">{t("table.name")}</th>
                <th className="px-4 py-3">{t("table.communication")}</th>
                <th className="px-4 py-3">{t("table.expectedAttendees")}</th>
                <th className="px-4 py-3">{t("table.confirmedAttendees")}</th>
                <th className="px-4 py-3">{t("table.confirmationDate")}</th>
                <th className="px-4 py-3 text-right">{tCommon("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={
                    item.confirmationDate
                      ? "bg-emerald-50"
                      : item.deniedDate
                        ? "bg-red-50"
                        : "odd:bg-surface even:bg-accent-soft/15"
                  }
                >
                  <td className="px-4 py-3 text-foreground">{item.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 text-xs">
                      {item.phone && (
                        <a
                          href={`tel:${item.phone}`}
                          className="flex items-center gap-1.5 text-muted transition-colors hover:text-accent-dark"
                        >
                          <Phone size={12} />
                          {item.phone}
                        </a>
                      )}
                      {item.email && (
                        <a
                          href={`mailto:${item.email}`}
                          className="flex items-center gap-1.5 text-muted transition-colors hover:text-accent-dark"
                        >
                          <Mail size={12} />
                          {item.email}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{item.expectedAttendees}</td>
                  <td className="px-4 py-3 text-muted">{item.confirmedAttendees}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {item.confirmationDate ? (
                      <span className="font-medium text-emerald-700">
                        {t("confirmed")} ·{" "}
                        {format.dateTime(new Date(item.confirmationDate), {
                          dateStyle: "medium",
                          timeZone: "UTC",
                        })}
                      </span>
                    ) : item.deniedDate ? (
                      <span className="font-medium text-red-600">
                        {t("denied")} ·{" "}
                        {format.dateTime(new Date(item.deniedDate), {
                          dateStyle: "medium",
                          timeZone: "UTC",
                        })}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-4">
                      <button
                        type="button"
                        onClick={() => setDialog({ mode: "edit", item })}
                        title={t("edit")}
                        aria-label={t("edit")}
                        className="text-muted transition-colors hover:text-accent-dark"
                      >
                        <Pencil size={16} />
                      </button>
                      <DeleteGuestItemButton
                        action={deleteGuestItemAction.bind(null, celebrationId, item.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormDialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog?.mode === "edit" ? t("editTitle") : t("newTitle")}
      >
        {dialog?.mode === "create" && (
          <GuestItemForm
            action={createGuestItemAction.bind(null, celebrationId)}
            mode="create"
          />
        )}
        {dialog?.mode === "edit" && (
          <GuestItemForm
            key={dialog.item.id}
            action={updateGuestItemAction.bind(null, celebrationId, dialog.item.id)}
            mode="edit"
            initialItem={dialog.item}
          />
        )}
      </FormDialog>
    </div>
  );
}
