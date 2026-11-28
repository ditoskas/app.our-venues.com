"use client";

import { useTranslations, useFormatter } from "next-intl";
import DeleteLiveEventItemButton from "./DeleteLiveEventItemButton";
import LiveEventModerationButtons from "./LiveEventModerationButtons";
import { deleteLiveEventItemAction, publishLiveEventItemAction, denyLiveEventItemAction } from "./actions";

export interface SerializedLiveEventItem {
  id: string;
  imageFilename: string;
  locationLabel: string;
  uploadedByName: string;
  uploadedAt: string;
  publishedAt?: string;
  title: string;
  description?: string;
}

// Two sections, both read-only tables with per-row actions — no "Add"
// button, no FormDialog/create-edit form like the other tabs' Managers:
// this tab only ever moderates (publish/deny) or removes rows added by
// guests (or the seeder), never creates or edits their content.
export default function LiveEventsManager({
  celebrationId,
  pendingItems,
  publishedItems,
}: {
  celebrationId: string;
  pendingItems: SerializedLiveEventItem[];
  publishedItems: SerializedLiveEventItem[];
}) {
  const t = useTranslations("celebrations.liveEvents");

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="mb-3 text-sm font-medium tracking-wide text-accent-dark uppercase">
          {t("pendingTitle")}
        </h2>
        <LiveEventsTable
          celebrationId={celebrationId}
          items={pendingItems}
          emptyMessage={t("pendingEmpty")}
          dateColumnLabel={t("table.uploadedDate")}
          dateValue={(item) => item.uploadedAt}
          renderActions={(item) => (
            <LiveEventModerationButtons
              onPublish={publishLiveEventItemAction.bind(null, celebrationId, item.id)}
              onDeny={denyLiveEventItemAction.bind(null, celebrationId, item.id)}
            />
          )}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium tracking-wide text-accent-dark uppercase">
          {t("liveFeedTitle")}
        </h2>
        <LiveEventsTable
          celebrationId={celebrationId}
          items={publishedItems}
          emptyMessage={t("empty")}
          dateColumnLabel={t("table.publishedDate")}
          dateValue={(item) => item.publishedAt ?? item.uploadedAt}
          renderActions={(item) => (
            <DeleteLiveEventItemButton
              action={deleteLiveEventItemAction.bind(null, celebrationId, item.id)}
            />
          )}
        />
      </section>
    </div>
  );
}

function LiveEventsTable({
  celebrationId,
  items,
  emptyMessage,
  dateColumnLabel,
  dateValue,
  renderActions,
}: {
  celebrationId: string;
  items: SerializedLiveEventItem[];
  emptyMessage: string;
  dateColumnLabel: string;
  dateValue: (item: SerializedLiveEventItem) => string;
  renderActions: (item: SerializedLiveEventItem) => React.ReactNode;
}) {
  const t = useTranslations("celebrations.liveEvents");
  const tCommon = useTranslations("common");
  const format = useFormatter();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-8 py-16 text-center">
        <p className="text-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[880px] text-sm">
        <thead className="bg-accent-soft/40 text-left text-xs tracking-wide text-muted uppercase">
          <tr>
            <th className="px-4 py-3">{t("table.image")}</th>
            <th className="px-4 py-3">{t("table.location")}</th>
            <th className="px-4 py-3">{t("table.uploadedBy")}</th>
            <th className="px-4 py-3">{dateColumnLabel}</th>
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
                {format.dateTime(new Date(dateValue(item)), {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </td>
              <td className="px-4 py-3 text-foreground">{item.title}</td>
              <td className="max-w-xs truncate px-4 py-3 text-muted">{item.description}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end">{renderActions(item)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
