import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePageRole } from "@/lib/auth";
import { DASHBOARD_SECTIONS_BY_ROLE } from "@/lib/roleAccess";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [t, user] = await Promise.all([
    getTranslations("dashboard"),
    requirePageRole(["Root", "Professional", "Couple"]),
  ]);
  const sectionKeys = DASHBOARD_SECTIONS_BY_ROLE[user.role];

  return (
    <div>
      <div className="mb-12 border-b border-border pb-8">
        <p className="mb-2 text-xs font-medium tracking-[0.18em] text-accent-dark uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="font-serif text-4xl text-foreground">{t("title")}</h1>
        <p className="mt-3 max-w-lg text-sm text-muted">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sectionKeys.map((key) => (
          <Link
            key={key}
            href={`/${key}`}
            className="group rounded-lg border border-border bg-surface p-6 transition-colors hover:border-accent"
          >
            <h2 className="font-serif text-xl text-foreground group-hover:text-accent-dark">
              {t(`sections.${key}.label`)}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {t(`sections.${key}.description`)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
