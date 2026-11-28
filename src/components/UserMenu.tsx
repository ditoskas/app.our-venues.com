"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

export default function UserMenu({
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
  const tNav = useTranslations("nav");
  const tLang = useTranslations("languageSwitcher");
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // The <details> element's open state is native DOM state, so it survives
  // client-side navigation (Navbar stays mounted) — close it explicitly
  // whenever the route changes, e.g. after clicking "Profile".
  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = false;
  }, [pathname]);

  return (
    <details ref={detailsRef} className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        {displayName}
        <span className="text-[10px] transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg">
        <Link
          href="/profile"
          className="block px-3 py-2 text-xs text-foreground transition-colors hover:bg-accent-soft/40"
        >
          {tNav("profile")}
        </Link>

        <div className="border-t border-border py-1">
          <div className="px-3 pt-1 pb-1.5 text-[10px] font-medium tracking-[0.14em] text-muted uppercase">
            {tLang("label")}
          </div>
          {routing.locales.map((option) => (
            <form key={option} action={switchLanguageAction}>
              <input type="hidden" name="locale" value={option} />
              <input type="hidden" name="redirectTo" value={pathname} />
              <button
                type="submit"
                disabled={option === locale}
                className={`block w-full px-3 py-2 text-left text-xs transition-colors ${
                  option === locale
                    ? "cursor-default font-medium text-accent-dark"
                    : "text-foreground hover:bg-accent-soft/40"
                }`}
              >
                {tLang(option)}
              </button>
            </form>
          ))}
        </div>

        <form action={logoutAction} className="border-t border-border pt-1">
          <button
            type="submit"
            className="block w-full px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-accent-soft/40"
          >
            {tNav("logout")}
          </button>
        </form>
      </div>
    </details>
  );
}
