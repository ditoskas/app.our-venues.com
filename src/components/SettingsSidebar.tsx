"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const SIDEBAR_ITEMS = [
  { key: "general", href: "/settings" },
  { key: "users", href: "/settings/users" },
  { key: "subscriptionPackages", href: "/settings/subscription-packages" },
  { key: "logActions", href: "/settings/log-actions" },
] as const;

export default function SettingsSidebar() {
  const pathname = usePathname();
  const t = useTranslations("settings.sidebar");
  const tNav = useTranslations("nav");

  return (
    <aside className="w-48 shrink-0">
      <p className="mb-4 text-xs font-medium tracking-[0.18em] text-accent-dark uppercase">
        {tNav("settings")}
      </p>
      <nav>
        <ul className="flex flex-col gap-1 border-l border-border">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`-ml-px block border-l-2 py-1.5 pl-4 text-sm transition-colors ${
                    isActive
                      ? "border-accent text-accent-dark"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
