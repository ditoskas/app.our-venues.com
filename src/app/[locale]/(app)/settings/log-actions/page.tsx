import { getFormatter, getTranslations } from "next-intl/server";
import { listLogActions, type LogActionType } from "@/lib/logActions";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

const TYPE_STYLES: Record<LogActionType, string> = {
  info: "text-muted",
  success: "text-emerald-700",
  warning: "text-accent-dark",
  error: "text-red-600",
};

export default async function LogActionsPage() {
  const [t, format, entries] = await Promise.all([
    getTranslations("settings.logActions"),
    getFormatter(),
    listLogActions(),
  ]);

  return (
    <div>
      <PageHeader title={t("title")} />
      <p className="mb-10 max-w-lg text-sm text-muted">{t("description")}</p>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-8 py-24 text-center">
          <span className="mb-4 h-px w-12 bg-accent" />
          <p className="text-sm text-muted">{t("empty")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-accent-soft/40 text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">{t("table.date")}</th>
                <th className="px-4 py-3">{t("table.user")}</th>
                <th className="px-4 py-3">{t("table.type")}</th>
                <th className="px-4 py-3">{t("table.category")}</th>
                <th className="px-4 py-3">{t("table.message")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => (
                <tr
                  key={entry._id.toString()}
                  className="align-top odd:bg-surface even:bg-accent-soft/15"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {format.dateTime(entry.createdAt, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3 text-muted">{entry.userId}</td>
                  <td className={`px-4 py-3 font-medium ${TYPE_STYLES[entry.type]}`}>
                    {entry.type}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {entry.category}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {entry.message}
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
