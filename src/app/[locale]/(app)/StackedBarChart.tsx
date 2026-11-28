"use client";

import { useMemo, useRef, useState } from "react";

export interface StackedBarSeries {
  key: string;
  label: string;
  color: string;
}

export interface StackedBarDatum {
  label: string;
  values: Record<string, number>;
}

interface TooltipState {
  index: number;
  x: number;
  y: number;
}

const CHART_WIDTH = 720;
const CHART_HEIGHT = 260;
const MARGIN = { top: 28, right: 8, bottom: 24, left: 8 };
const BAR_MAX_WIDTH = 24;
const SEGMENT_GAP = 2;

// Rounds a positive step up to a "clean" size (1/2/5 * 10^n) — see the
// dataviz skill's "round to clean numbers" guidance for y-axis ticks.
function niceStep(roughStep: number): number {
  if (roughStep <= 0) return 1;
  const exponent = Math.floor(Math.log10(roughStep));
  const fraction = roughStep / Math.pow(10, exponent);
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * Math.pow(10, exponent);
}

// Builds a small set of evenly-spaced, clean-number ticks from 0 up to (at
// least) rawMax — e.g. [0, 1000, 2000, 3000] rather than 5 fixed fractions
// of an arbitrary max, which produces duplicate-looking labels when rawMax
// is small (a count chart topping out at 1 would otherwise render
// 0/0/1/1/1). `integer: true` (count charts) rounds the step to a whole
// number so ticks never land on a fractional "1.5 celebrations".
function buildTicks(rawMax: number, integer: boolean, targetCount = 4): number[] {
  let step = niceStep(rawMax / targetCount || 1);
  if (integer) step = Math.max(1, Math.round(step));

  const ticks: number[] = [];
  for (let t = 0; t <= rawMax + step / 2; t += step) {
    ticks.push(t);
  }
  return ticks.length > 1 ? ticks : [0, step];
}

// A hand-rolled stacked-column chart (no charting library in this project —
// see GoogleMapPicker/EventSeatingLayoutEditor for the same "plain SVG/canvas,
// no dependency" precedent). Each datum stacks `series` bottom-to-top with a
// 2px surface gap between segments and a rounded cap only on the topmost
// visible segment, per the dataviz skill's mark spec.
export default function StackedBarChart({
  data,
  series,
  formatValue,
  totalLabel,
  emptyLabel,
  ariaLabel,
  integerTicks = false,
}: {
  data: StackedBarDatum[];
  series: StackedBarSeries[];
  formatValue: (value: number) => string;
  totalLabel: string;
  emptyLabel: string;
  ariaLabel: string;
  integerTicks?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const totals = useMemo(
    () => data.map((d) => series.reduce((sum, s) => sum + (d.values[s.key] ?? 0), 0)),
    [data, series]
  );
  const grandTotal = totals.reduce((sum, v) => sum + v, 0);

  if (grandTotal === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted">
        {emptyLabel}
      </div>
    );
  }

  const yTicks = buildTicks(Math.max(...totals), integerTicks);
  const maxTotal = yTicks[yTicks.length - 1];
  const plotWidth = CHART_WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const bandWidth = plotWidth / data.length;
  const barWidth = Math.min(BAR_MAX_WIDTH, bandWidth * 0.6);
  const baselineY = MARGIN.top + plotHeight;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-muted">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </div>
        ))}
      </div>

      <div ref={containerRef} className="relative">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full"
          role="img"
          aria-label={ariaLabel}
        >
          {yTicks.map((tick, tickIndex) => {
            const y = baselineY - (tick / maxTotal) * plotHeight;
            return (
              <g key={tickIndex}>
                <line
                  x1={MARGIN.left}
                  x2={CHART_WIDTH - MARGIN.right}
                  y1={y}
                  y2={y}
                  stroke="#e7dfd2"
                  strokeWidth={1}
                />
                <text x={MARGIN.left} y={y - 4} fontSize={9} fill="#8a7f81">
                  {Math.round(tick).toLocaleString()}
                </text>
              </g>
            );
          })}
          <line
            x1={MARGIN.left}
            x2={CHART_WIDTH - MARGIN.right}
            y1={baselineY}
            y2={baselineY}
            stroke="#c3c2b7"
            strokeWidth={1}
          />

          {data.map((d, i) => {
            const total = totals[i];
            const x = MARGIN.left + i * bandWidth + (bandWidth - barWidth) / 2;

            let cumulative = 0;
            const segments = series.map((s) => {
              const value = d.values[s.key] ?? 0;
              const height = (value / maxTotal) * plotHeight;
              const y = baselineY - cumulative - height;
              cumulative += value > 0 ? height + SEGMENT_GAP : 0;
              return { key: s.key, color: s.color, value, y, height };
            });
            const visible = segments.filter((s) => s.value > 0);
            const topmostKey = visible.length ? visible[visible.length - 1].key : null;
            const topY = visible.length ? visible[visible.length - 1].y : baselineY;

            return (
              <g
                key={d.label}
                onMouseEnter={(e) => {
                  const containerRect = containerRef.current?.getBoundingClientRect();
                  const groupRect = e.currentTarget.getBoundingClientRect();
                  if (!containerRect) return;
                  setTooltip({
                    index: i,
                    x: groupRect.left + groupRect.width / 2 - containerRect.left,
                    y: groupRect.top - containerRect.top,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <rect x={x} y={MARGIN.top} width={barWidth} height={plotHeight} fill="transparent" />
                {segments.map((seg) =>
                  seg.value > 0 ? (
                    <rect
                      key={seg.key}
                      x={x}
                      y={seg.y}
                      width={barWidth}
                      height={Math.max(seg.height, 1)}
                      fill={seg.color}
                      rx={seg.key === topmostKey ? 4 : 0}
                    />
                  ) : null
                )}
                {total > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={topY - 6}
                    fontSize={9}
                    textAnchor="middle"
                    fill="#52514e"
                  >
                    {formatValue(total)}
                  </text>
                )}
                <text
                  x={x + barWidth / 2}
                  y={baselineY + 16}
                  fontSize={9}
                  textAnchor="middle"
                  fill="#8a7f81"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>

        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 w-44 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md"
            style={{ left: tooltip.x, top: tooltip.y - 8 }}
          >
            <div className="mb-1 font-medium text-foreground">{data[tooltip.index].label}</div>
            {series.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-4 text-muted">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                </span>
                <span className="text-foreground">
                  {formatValue(data[tooltip.index].values[s.key] ?? 0)}
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between gap-4 border-t border-border pt-1 font-medium text-foreground">
              <span>{totalLabel}</span>
              <span>{formatValue(totals[tooltip.index])}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
