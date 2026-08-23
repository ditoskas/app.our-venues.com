import { getTranslations } from "next-intl/server";
import PageHeader from "./PageHeader";

export type PlaceholderKey = "couples" | "story" | "events" | "guests" | "general";

export default async function PlaceholderPage({
  pageKey,
}: {
  pageKey: PlaceholderKey;
}) {
  const t = await getTranslations("placeholder");

  return (
    <div>
      <PageHeader title={t(`pages.${pageKey}.title`)} />

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-8 py-24 text-center">
        <span className="mb-4 h-px w-12 bg-accent" />
        <h2 className="font-serif text-2xl text-foreground">
          {t("comingSoon")}
        </h2>
        <p className="mt-3 max-w-md text-sm text-muted">
          {t(`pages.${pageKey}.description`)}
        </p>
      </div>
    </div>
  );
}
