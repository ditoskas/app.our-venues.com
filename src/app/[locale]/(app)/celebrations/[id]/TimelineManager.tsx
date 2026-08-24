"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Plus, Pencil } from "lucide-react";
import FormDialog from "@/components/FormDialog";
import TimelineItemForm, { type SerializedTimelineItem } from "./TimelineItemForm";
import DeleteTimelineItemButton from "./DeleteTimelineItemButton";
import { localizedLabel } from "./localizedText";
import {
  createTimelineItemAction,
  updateTimelineItemAction,
  deleteTimelineItemAction,
} from "./actions";
import type { AppLocale } from "@/i18n/routing";

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; item: SerializedTimelineItem }
  | null;

export default function TimelineManager({
  celebrationId,
  items,
  activeLanguages,
}: {
  celebrationId: string;
  items: SerializedTimelineItem[];
  activeLanguages: AppLocale[];
}) {
  const t = useTranslations("celebrations.story.timeline");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const [dialog, setDialog] = useState<DialogState>(null);

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl text-foreground">{t("title")}</h2>
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
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-accent-soft/40 text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">{t("table.title")}</th>
                <th className="px-4 py-3">{t("table.description")}</th>
                <th className="px-4 py-3">{t("table.date")}</th>
                <th className="px-4 py-3">{t("table.image")}</th>
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
                  <td className="px-4 py-3">
                    {item.imageFilename ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/celebrations/${celebrationId}/timeline/${item.id}/image`}
                        alt=""
                        className="h-10 w-10 rounded border border-border object-cover"
                      />
                    ) : (
                      <span className="block h-10 w-10 rounded border border-dashed border-border" />
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
                      <DeleteTimelineItemButton
                        action={deleteTimelineItemAction.bind(null, celebrationId, item.id)}
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
          <TimelineItemForm
            action={createTimelineItemAction.bind(null, celebrationId)}
            mode="create"
            activeLanguages={activeLanguages}
          />
        )}
        {dialog?.mode === "edit" && (
          <TimelineItemForm
            key={dialog.item.id}
            action={updateTimelineItemAction.bind(null, celebrationId, dialog.item.id)}
            mode="edit"
            initialItem={dialog.item}
            imageUrl={
              dialog.item.imageFilename
                ? `/api/celebrations/${celebrationId}/timeline/${dialog.item.id}/image`
                : undefined
            }
            activeLanguages={activeLanguages}
          />
        )}
      </FormDialog>
    </div>
  );
}
