"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Check, Copy, ExternalLink, Globe, Link2, Lock } from "lucide-react";
import { normalizeLabel, subdomainUrl, validateLabel, LABEL_MAX_LENGTH } from "@/lib/siteDomains";
import {
  checkSubdomainAvailabilityAction,
  releaseSubdomainAction,
  reserveSubdomainAction,
  type SubdomainAvailability,
} from "./actions";

interface Period {
  startsAt: string; // ISO, inclusive
  endsAt: string; // ISO, exclusive (00:00 of the day after the last day)
}

export interface CurrentSubdomain extends Period {
  domain: string;
  label: string;
}

export default function DomainManager({
  celebrationId,
  permanentUrl,
  domain,
  isPremium,
  suggestedLabel,
  period,
  current,
}: {
  celebrationId: string;
  permanentUrl: string;
  domain: string;
  isPremium: boolean;
  suggestedLabel: string;
  period: Period | null; // null when the celebration has no date yet
  current: CurrentSubdomain | null;
}) {
  const t = useTranslations("celebrations.domain");

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-2 flex items-center gap-2 font-serif text-xl text-foreground">
          <Link2 size={18} className="text-accent-dark" />
          {t("permanentTitle")}
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-muted">{t("permanentDescription")}</p>
        <UrlRow url={permanentUrl} />
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-2 flex items-center gap-2 font-serif text-xl text-foreground">
          <Globe size={18} className="text-accent-dark" />
          {t("subdomainTitle")}
        </h2>
        <p className="mb-5 max-w-2xl text-sm text-muted">{t("subdomainDescription")}</p>

        {current && <CurrentReservation celebrationId={celebrationId} current={current} />}

        {!isPremium ? (
          <Notice icon={<Lock size={14} />}>
            {current ? t("premiumLapsed") : t("premiumRequired")}
          </Notice>
        ) : !period ? (
          <Notice>{t("dateRequired")}</Notice>
        ) : (
          <ReserveForm
            // Remount when the reservation changes (reserve/change/release),
            // so a stale availability result ("current", "available") from
            // before the change is never shown.
            key={current ? `${current.domain}/${current.label}` : "none"}
            celebrationId={celebrationId}
            domain={domain}
            period={period}
            initialLabel={current?.label ?? suggestedLabel}
            isChange={!!current}
          />
        )}
      </section>
    </div>
  );
}

function CurrentReservation({
  celebrationId,
  current,
}: {
  celebrationId: string;
  current: CurrentSubdomain;
}) {
  const t = useTranslations("celebrations.domain");
  const [now] = useState(() => Date.now());
  const status =
    now < Date.parse(current.startsAt) ? "upcoming" : now < Date.parse(current.endsAt) ? "active" : "ended";
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mb-6 rounded-md border border-accent/40 bg-accent-soft/20 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium tracking-wide uppercase">
        <span className="text-muted">{t("currentTitle")}</span>
        <span
          className={
            status === "active" ? "text-emerald-700" : status === "upcoming" ? "text-accent-dark" : "text-muted"
          }
        >
          · {t(`status.${status}`)}
        </span>
      </div>
      <UrlRow url={subdomainUrl(current.label, current.domain)} />
      <PeriodText period={current} />
      <div className="mt-3">
        {confirming ? (
          <span className="flex items-center gap-3 text-sm">
            {t("releaseConfirm")}
            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => releaseSubdomainAction(celebrationId))}
              className="font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              {t("releaseYes")}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-muted hover:underline">
              {t("cancel")}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-sm text-muted transition-colors hover:text-red-600"
          >
            {t("release")}
          </button>
        )}
      </div>
    </div>
  );
}

function ReserveForm({
  celebrationId,
  domain,
  period,
  initialLabel,
  isChange,
}: {
  celebrationId: string;
  domain: string;
  period: Period;
  initialLabel: string;
  isChange: boolean;
}) {
  const t = useTranslations("celebrations.domain");
  const [state, formAction, isPending] = useActionState(
    reserveSubdomainAction.bind(null, celebrationId),
    {}
  );
  const [raw, setRaw] = useState(initialLabel);
  // Result of the server check, tagged with the label it was for, so a stale
  // answer for a previous label is never shown.
  const [checked, setChecked] = useState<{ label: string; result: SubdomainAvailability } | null>(null);
  const label = normalizeLabel(raw);
  const localError = label ? validateLabel(label) : null;

  // Debounced server-side availability check while typing.
  useEffect(() => {
    if (!label || localError) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkSubdomainAvailabilityAction(celebrationId, label);
      if (!cancelled) setChecked({ label, result });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [celebrationId, label, localError]);

  const availability = checked?.label === label && !localError ? checked.result : null;
  const status = localError
    ? { tone: "error" as const, text: t(`errors.invalid.${localError}`) }
    : availability?.status === "available"
      ? { tone: "ok" as const, text: t("available") }
      : availability?.status === "taken"
        ? { tone: "error" as const, text: t("errors.taken") }
        : availability?.status === "current"
          ? { tone: "muted" as const, text: t("isCurrent") }
          : availability?.status === "invalid"
            ? { tone: "error" as const, text: t(`errors.invalid.${availability.reason}`) }
            : null;

  const canSubmit = availability?.status === "available" && !isPending;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">
        {isChange ? t("changeLabel") : t("label")}
      </span>
      <div className="flex max-w-2xl items-stretch">
        <span className="flex items-center rounded-l-md border border-r-0 border-border bg-accent-soft/20 px-3 text-sm text-muted">
          https://
        </span>
        <input
          name="label"
          value={raw}
          onChange={(e) => setRaw(e.target.value.toLowerCase())}
          maxLength={LABEL_MAX_LENGTH}
          autoComplete="off"
          spellCheck={false}
          aria-label={t("label")}
          className="input min-w-0 flex-1 rounded-none"
        />
        <span className="flex items-center rounded-r-md border border-l-0 border-border bg-accent-soft/20 px-3 text-sm text-muted">
          .{domain}
        </span>
      </div>
      {status && (
        <p
          className={`text-sm ${
            status.tone === "ok" ? "text-emerald-700" : status.tone === "error" ? "text-red-600" : "text-muted"
          }`}
        >
          {status.text}
        </p>
      )}
      <PeriodText period={period} />
      <p className="max-w-2xl text-xs text-muted">{t("invitationHint")}</p>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-accent-dark px-5 py-2 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? t("saving") : isChange ? t("change") : t("reserve")}
        </button>
      </div>
    </form>
  );
}

function PeriodText({ period }: { period: Period }) {
  const t = useTranslations("celebrations.domain");
  const format = useFormatter();
  const opts = { dateStyle: "medium", timeZone: "Europe/Athens" } as const;
  // endsAt is exclusive — show the last included day.
  const lastDay = new Date(Date.parse(period.endsAt) - 1);
  return (
    <p className="mt-2 text-sm text-muted">
      {t("period", {
        from: format.dateTime(new Date(period.startsAt), opts),
        to: format.dateTime(lastDay, opts),
      })}
    </p>
  );
}

function UrlRow({ url }: { url: string }) {
  const t = useTranslations("celebrations.domain");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (permissions/insecure context); the URL
      // stays visible to select by hand.
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 font-mono text-sm break-all text-accent-dark hover:underline"
      >
        {url}
        <ExternalLink size={12} />
      </a>
      <button
        type="button"
        onClick={copy}
        title={copied ? t("copied") : t("copy")}
        aria-label={copied ? t("copied") : t("copy")}
        className="text-muted transition-colors hover:text-accent-dark"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

function Notice({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex max-w-2xl items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted">
      {icon}
      {children}
    </p>
  );
}
