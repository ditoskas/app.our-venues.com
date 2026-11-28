"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import UserMenu from "./UserMenu";

// "dashboard" is the only entry whose route isn't `/${key}` — the dashboard
// lives at the app root (`/`), not `/dashboard` — so nav items carry an
// explicit href instead of the key-derives-the-route shortcut the other
// entries use.
const NAV_ITEMS = [
  { key: "dashboard", href: "/" },
  { key: "celebrations", href: "/celebrations" },
  { key: "professionals", href: "/professionals" },
  { key: "settings", href: "/settings" },
] as const;

export default function Navbar({
  displayName,
  locale,
  logoutAction,
  switchLanguageAction,
}: {
  displayName: string;
  locale: AppLocale;
  logoutAction: () => Promise<void>;
  switchLanguageAction: (formData: FormData) => Promise<void>;
}) {
  const pathname = usePathname();
  const t = useTranslations();
  const tNav = useTranslations("nav");

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur">
      <div className="flex h-20 w-full items-center justify-between px-6 lg:px-10">
        <Link
          href="/"
          className="font-serif text-2xl italic tracking-wide text-foreground"
        >
          {t("brand")}
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <nav>
            <ul className="flex items-center gap-8">
              {NAV_ITEMS.map(({ key, href }) => {
                const isActive =
                  href === "/"
                    ? pathname === "/"
                    : pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      className={`group relative py-2 text-xs font-medium tracking-[0.18em] uppercase transition-colors ${
                        isActive
                          ? "text-accent-dark"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {tNav(key)}
                      <span
                        className={`absolute -bottom-0.5 left-0 h-px bg-accent transition-all duration-300 ${
                          isActive ? "w-full" : "w-0 group-hover:w-full"
                        }`}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="border-l border-border pl-6">
            <UserMenu
              displayName={displayName}
              locale={locale}
              logoutAction={logoutAction}
              switchLanguageAction={switchLanguageAction}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
