"use client";

import { useTranslations, useFormatter } from "next-intl";
import DeleteLiveEventItemButton from "./DeleteLiveEventItemButton";
import { deleteLiveEventItemAction } from "./actions";

export interface SerializedLiveEventItem {
  id: string;
  imageFilename: string;
  locationLabel: string;
  uploadedByName: string;
  uploadedAt: string;
  title: string;
  description?: string;
}

// Delete-only — see LiveEventItem in lib/celebrations.ts. No "Add" button,
// no FormDialog/create-edit form like the other tabs' Managers: this tab
// only ever removes rows, never creates or edits them from the admin.
export default function LiveEventsManager({
  celebrationId,
  items,
}: {
  celebrationId: string;
  items: SerializedLiveEventItem[];
}) {
  const t = useTranslations("celebrations.liveEvents");
  const tCommon = useTranslations("common");
  const format = useFormatter();

  return (
    <div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-8 py-16 text-center">
          <p className="text-sm text-muted">{t("empty")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-accent-soft/40 text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">{t("table.image")}</th>
                <th className="px-4 py-3">{t("table.location")}</th>
                <th className="px-4 py-3">{t("table.uploadedBy")}</th>
                <th className="px-4 py-3">{t("table.uploadedDate")}</th>
                <th className="px-4 py-3">{t("table.title")}</th>
                <th className="px-4 py-3">{t("table.description")}</th>
                <th className="px-4 py-3 text-right">{tCommon("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="odd:bg-surface even:bg-accent-soft/15">
                  <td className="px-4 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/celebrations/${celebrationId}/live-events/${item.id}/image`}
                      alt=""
                      className="h-10 w-10 rounded border border-border object-cover"
                    />
                  </td>
                  <td className="px-4 py-3 text-muted">{item.locationLabel}</td>
                  <td className="px-4 py-3 text-muted">{item.uploadedByName}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {format.dateTime(new Date(item.uploadedAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3 text-foreground">{item.title}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted">
                    {item.description}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <DeleteLiveEventItemButton
                        action={deleteLiveEventItemAction.bind(null, celebrationId, item.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
