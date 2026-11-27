// Pure constants/helpers (no DB import) so client components can use them too.
// Upload storage plan. Each plan has a default quota; Root can override it
// per professional via `storageQuotaMB` (see "File uploads" in CLAUDE.md).
export const PROFESSIONAL_PLANS = ["Free", "Premium"] as const;
export type ProfessionalPlan = (typeof PROFESSIONAL_PLANS)[number];

export const PLAN_STORAGE_QUOTA_MB: Record<ProfessionalPlan, number> = {
  Free: 10,
  Premium: 100,
};

export const BYTES_PER_MB = 1024 * 1024;

export function isProfessionalPlan(value: unknown): value is ProfessionalPlan {
  return PROFESSIONAL_PLANS.includes(value as ProfessionalPlan);
}

// A document written before `plan` existed has none — treat it as Free.
export function professionalPlan(p: { plan?: ProfessionalPlan }): ProfessionalPlan {
  return p.plan ?? "Free";
}

// The override wins over the plan default when set.
export function storageQuotaMB(p: { plan?: ProfessionalPlan; storageQuotaMB?: number }): number {
  return p.storageQuotaMB ?? PLAN_STORAGE_QUOTA_MB[professionalPlan(p)];
}

export function formatMB(bytes: number): string {
  const mb = bytes / BYTES_PER_MB;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}
