"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import UserMenu from "./UserMenu";

const NAV_KEYS = ["celebrations", "professionals", "settings"] as const;

export default function Navbar({
  displayName,
  logoutAction,
}: {
  displayName: string;
  logoutAction: () => Promise<void>;
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
              {NAV_KEYS.map((key) => {
                const href = `/${key}`;
                const isActive =
                  pathname === href || pathname.startsWith(`${href}/`);
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
            <UserMenu displayName={displayName} logoutAction={logoutAction} />
          </div>
        </div>
      </div>
    </header>
  );
}
