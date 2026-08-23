"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export default function UserMenu({
  displayName,
  logoutAction,
}: {
  displayName: string;
  logoutAction: () => Promise<void>;
}) {
  const tNav = useTranslations("nav");
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

      <div className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg">
        <Link
          href="/profile"
          className="block px-3 py-2 text-xs text-foreground transition-colors hover:bg-accent-soft/40"
        >
          {tNav("profile")}
        </Link>
        <form action={logoutAction}>
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
