import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { listCelebrations } from "@/lib/celebrations";
import { getEarliestProfessionalRegistrationYear, getProfessionalById } from "@/lib/professionals";
import DashboardCharts, { type DashboardChartCelebration } from "./DashboardCharts";

export const dynamic = "force-dynamic";

interface ChartsData {
  celebrations: DashboardChartCelebration[];
  years: number[];
  defaultYear: number;
}

// Charts are scoped the same way the Celebrations list already is (see
// celebrations/page.tsx): a Professional only sees their own celebrations'
// income/counts, Root sees every celebration system-wide. A Couple user (or
// a signed-out request, which shouldn't reach this page at all) gets no
// charts section — celebrations/[id]/access.ts's Root+Professional-only
// gate is the precedent this follows.
async function loadChartsData(): Promise<ChartsData | null> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "Root" && user.role !== "Professional")) {
    return null;
  }

  const currentYear = new Date().getFullYear();

  const [allCelebrations, earliestYear] = await Promise.all([
    listCelebrations(),
    user.role === "Root"
      ? getEarliestProfessionalRegistrationYear()
      : getProfessionalById(user.professionalId ?? "").then(
          (professional) => professional?.createdAt.getFullYear() ?? null
        ),
  ]);

  const scoped =
    user.role === "Professional"
      ? allCelebrations.filter((c) => c.professionalId === user.professionalId)
      : allCelebrations;

  const startYear = Math.min(earliestYear ?? currentYear, currentYear);
  const years = Array.from(
    { length: currentYear - startYear + 1 },
    (_, i) => startYear + i
  );

  const celebrationsForCharts: DashboardChartCelebration[] = scoped
    .filter((c) => c.celebrationDate)
    .map((c) => ({
      type: c.type,
      price: c.price ?? 0,
      celebrationDate: c.celebrationDate!.toISOString(),
    }));

  return { celebrations: celebrationsForCharts, years, defaultYear: currentYear };
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const chartsData = await loadChartsData();

  return (
    <div>
      <div className="mb-12 border-b border-border pb-8">
        <p className="mb-2 text-xs font-medium tracking-[0.18em] text-accent-dark uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="font-serif text-4xl text-foreground">{t("title")}</h1>
        <p className="mt-3 max-w-lg text-sm text-muted">{t("subtitle")}</p>
      </div>

      {chartsData && (
        <DashboardCharts
          celebrations={chartsData.celebrations}
          years={chartsData.years}
          defaultYear={chartsData.defaultYear}
        />
      )}
    </div>
  );
}
