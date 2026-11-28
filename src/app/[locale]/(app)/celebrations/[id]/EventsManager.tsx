"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Plus, Pencil, MapPin, Armchair } from "lucide-react";
import { Link } from "@/i18n/navigation";
import FormDialog from "@/components/FormDialog";
import EventItemForm, { type SerializedEventItem } from "./EventItemForm";
import DeleteEventItemButton from "./DeleteEventItemButton";
import { localizedLabel } from "./localizedText";
import {
  createEventItemAction,
  updateEventItemAction,
  deleteEventItemAction,
} from "./actions";
import type { AppLocale } from "@/i18n/routing";

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; item: SerializedEventItem }
  | null;

export default function EventsManager({
  celebrationId,
  items,
  activeLanguages,
}: {
  celebrationId: string;
  items: SerializedEventItem[];
  activeLanguages: AppLocale[];
}) {
  const t = useTranslations("celebrations.events");
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
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-accent-soft/40 text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">{t("table.title")}</th>
                <th className="px-4 py-3">{t("table.description")}</th>
                <th className="px-4 py-3">{t("table.date")}</th>
                <th className="px-4 py-3">{t("table.country")}</th>
                <th className="px-4 py-3">{t("table.city")}</th>
                <th className="px-4 py-3">{t("table.area")}</th>
                <th className="px-4 py-3">{t("table.address")}</th>
                <th className="px-4 py-3">{t("table.postCode")}</th>
                <th className="px-4 py-3">{t("table.map")}</th>
                <th className="px-4 py-3 text-right">{tCommon("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="odd:bg-surface even:bg-accent-soft/15">
                  <td className="px-4 py-3 text-foreground">{localizedLabel(item.title)}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted">
                    {localizedLabel(item.description)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {item.date
                      ? format.dateTime(new Date(item.date), {
                          dateStyle: "medium",
                          timeZone: "UTC",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{item.country}</td>
                  <td className="px-4 py-3 text-muted">{item.city}</td>
                  <td className="px-4 py-3 text-muted">{item.area}</td>
                  <td className="px-4 py-3 text-muted">{item.address}</td>
                  <td className="px-4 py-3 text-muted">{item.postCode}</td>
                  <td className="px-4 py-3">
                    {item.mapLat !== undefined && item.mapLng !== undefined ? (
                      <a
                        href={`https://www.google.com/maps?q=${item.mapLat},${item.mapLng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-muted transition-colors hover:text-accent-dark"
                      >
                        <MapPin size={14} />
                        {t("viewOnMap")}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-4">
                      {item.hasSeating && (
                        <Link
                          href={`/celebrations/${celebrationId}/events/${item.id}/seating-layout`}
                          title={t("configureLayout")}
                          aria-label={t("configureLayout")}
                          className="text-muted transition-colors hover:text-accent-dark"
                        >
                          <Armchair size={16} />
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => setDialog({ mode: "edit", item })}
                        title={t("edit")}
                        aria-label={t("edit")}
                        className="text-muted transition-colors hover:text-accent-dark"
                      >
                        <Pencil size={16} />
                      </button>
                      <DeleteEventItemButton
                        action={deleteEventItemAction.bind(null, celebrationId, item.id)}
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
          <EventItemForm
            action={createEventItemAction.bind(null, celebrationId)}
            mode="create"
            activeLanguages={activeLanguages}
          />
        )}
        {dialog?.mode === "edit" && (
          <EventItemForm
            key={dialog.item.id}
            action={updateEventItemAction.bind(null, celebrationId, dialog.item.id)}
            mode="edit"
            initialItem={dialog.item}
            activeLanguages={activeLanguages}
          />
        )}
      </FormDialog>
    </div>
  );
}
