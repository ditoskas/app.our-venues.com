import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireCelebrationAccess } from "./access";
import CelebrationTabsNav from "./CelebrationTabsNav";

export const dynamic = "force-dynamic";

export default async function CelebrationLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { celebration } = await requireCelebrationAccess(id);
  const t = await getTranslations("celebrations");

  return (
    <div>
      <Link
        href="/celebrations"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent-dark"
      >
        <ArrowLeft size={14} />
        {t("backToList")}
      </Link>

      <h1 className="mb-6 font-serif text-4xl text-foreground">{celebration.title}</h1>

      <CelebrationTabsNav celebrationId={id} />

      <div className="mt-8">{children}</div>
    </div>
  );
}
