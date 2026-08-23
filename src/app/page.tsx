import Link from "next/link";

const SECTIONS = [
  {
    label: "Weddings",
    href: "/weddings",
    description: "Active wedding projects and timelines.",
  },
  {
    label: "Professionals",
    href: "/professionals",
    description: "Photographers, venues, and vendors.",
  },
  {
    label: "Couples",
    href: "/couples",
    description: "Couple profiles and contact details.",
  },
  {
    label: "Story",
    href: "/story",
    description: "Love stories and photo galleries.",
  },
  {
    label: "Events",
    href: "/events",
    description: "Ceremonies, receptions, and dates.",
  },
  {
    label: "Guests",
    href: "/guests",
    description: "Guest lists, RSVPs, and seating.",
  },
  {
    label: "Settings",
    href: "/settings",
    description: "Accounts, branding, preferences.",
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-12 border-b border-border pb-8">
        <p className="mb-2 text-xs font-medium tracking-[0.18em] text-accent-dark uppercase">
          Welcome back
        </p>
        <h1 className="font-serif text-4xl text-foreground">Dashboard</h1>
        <p className="mt-3 max-w-lg text-sm text-muted">
          A single place to plan and orchestrate every wedding and
          christening on O Gamos Mas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-lg border border-border bg-surface p-6 transition-colors hover:border-accent"
          >
            <h2 className="font-serif text-xl text-foreground group-hover:text-accent-dark">
              {section.label}
            </h2>
            <p className="mt-2 text-sm text-muted">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
