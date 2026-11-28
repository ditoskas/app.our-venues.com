"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { key: "celebrationInfo", segment: "" },
  { key: "coupleInfo", segment: "couple-info" },
  { key: "story", segment: "story" },
  { key: "events", segment: "events" },
  { key: "liveEvents", segment: "live-events" },
  { key: "guests", segment: "guests" },
  { key: "domain", segment: "domain" },
] as const;

export default function CelebrationTabsNav({ celebrationId }: { celebrationId: string }) {
  const pathname = usePathname();
  const t = useTranslations("celebrations.tabs");
  const base = `/celebrations/${celebrationId}`;

  return (
    <nav className="border-b border-border">
      <ul className="flex gap-6">
        {TABS.map((tab) => {
          const href = tab.segment ? `${base}/${tab.segment}` : base;
          const isActive = pathname === href;
          return (
            <li key={tab.key}>
              <Link
                href={href}
                className={`inline-block border-b-2 pb-3 text-sm font-medium tracking-wide transition-colors ${
                  isActive
                    ? "border-accent text-accent-dark"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {t(tab.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
