"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CelebrationType } from "@/lib/celebrations";
import StackedBarChart, { type StackedBarDatum, type StackedBarSeries } from "./StackedBarChart";

export interface DashboardChartCelebration {
  type: CelebrationType;
  price: number;
  celebrationDate: string;
}

const CELEBRATION_TYPES: CelebrationType[] = ["Marriage", "Christening"];

// Validated categorical palette slots 1 (blue) and 2 (orange) — see the
// dataviz skill's palette reference; this adjacent pair clears every CVD/
// contrast check for a 2-series chart.
const SERIES_COLORS: Record<CelebrationType, string> = {
  Marriage: "#2a78d6",
  Christening: "#eb6834",
};

function emptyMonths(): StackedBarDatum[] {
  return Array.from({ length: 12 }, () => ({
    label: "",
    values: { Marriage: 0, Christening: 0 },
  }));
}

export default function DashboardCharts({
  celebrations,
  years,
  defaultYear,
}: {
  celebrations: DashboardChartCelebration[];
  years: number[];
  defaultYear: number;
}) {
  const t = useTranslations("dashboard.charts");
  const tTypes = useTranslations("celebrations.types");
  const locale = useLocale();
  const [year, setYear] = useState(defaultYear);

  const series: StackedBarSeries[] = useMemo(
    () =>
      CELEBRATION_TYPES.map((type) => ({
        key: type,
        label: tTypes(type),
        color: SERIES_COLORS[type],
      })),
    [tTypes]
  );

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short" }),
    [locale]
  );

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  const countFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const { incomeData, countData } = useMemo(() => {
    const income = emptyMonths();
    const count = emptyMonths();
    for (let month = 0; month < 12; month++) {
      const label = monthFormatter.format(new Date(Date.UTC(2000, month, 1)));
      income[month].label = label;
      count[month].label = label;
    }

    for (const c of celebrations) {
      const date = new Date(c.celebrationDate);
      if (date.getUTCFullYear() !== year) continue;
      const month = date.getUTCMonth();
      income[month].values[c.type] += c.price;
      count[month].values[c.type] += 1;
    }

    return { incomeData: income, countData: count };
  }, [celebrations, year, monthFormatter]);

  return (
    <div className="mb-12">
      <div className="mb-6 flex items-center justify-end">
        <label className="flex items-center gap-3 text-xs font-medium tracking-wide text-muted uppercase">
          {t("yearLabel")}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="input w-auto"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="font-serif text-lg text-foreground">{t("income.title")}</h2>
          <p className="mb-4 text-xs text-muted">{t("income.subtitle")}</p>
          <StackedBarChart
            data={incomeData}
            series={series}
            formatValue={(v) => priceFormatter.format(v)}
            totalLabel={t("total")}
            emptyLabel={t("noData", { year })}
            ariaLabel={t("income.title")}
          />
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="font-serif text-lg text-foreground">{t("count.title")}</h2>
          <p className="mb-4 text-xs text-muted">{t("count.subtitle")}</p>
          <StackedBarChart
            data={countData}
            series={series}
            formatValue={(v) => countFormatter.format(v)}
            totalLabel={t("total")}
            emptyLabel={t("noData", { year })}
            ariaLabel={t("count.title")}
            integerTicks
          />
        </div>
      </div>
    </div>
  );
}
