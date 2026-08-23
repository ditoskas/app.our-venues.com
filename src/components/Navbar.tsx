"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Weddings", href: "/weddings" },
  { label: "Professionals", href: "/professionals" },
  { label: "Couples", href: "/couples" },
  { label: "Story", href: "/story" },
  { label: "Events", href: "/events" },
  { label: "Guests", href: "/guests" },
  { label: "Settings", href: "/settings" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur">
      <div className="flex h-20 w-full items-center justify-between px-6 lg:px-10">
        <Link
          href="/"
          className="font-serif text-2xl italic tracking-wide text-foreground"
        >
          O Gamos Mas
        </Link>

        <nav className="hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group relative py-2 text-xs font-medium tracking-[0.18em] uppercase transition-colors ${
                      isActive
                        ? "text-accent-dark"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
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
      </div>
    </header>
  );
}
