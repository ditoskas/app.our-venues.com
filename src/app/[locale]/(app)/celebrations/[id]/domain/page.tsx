import { notFound } from "next/navigation";
import { getCelebrationById } from "@/lib/celebrations";
import { canReserveSubdomain, getCelebrationSubdomain } from "@/lib/subdomainReservations";
import {
  domainForType,
  permanentCelebrationUrl,
  reservationPeriod,
  slugifyForLabel,
} from "@/lib/siteDomains";
import DomainManager from "../DomainManager";

export const dynamic = "force-dynamic";

// Access is enforced once by [id]/layout.tsx (requireCelebrationAccess).
export default async function DomainTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const celebration = await getCelebrationById(id);
  if (!celebration) notFound();

  const [current, isPremium] = await Promise.all([
    getCelebrationSubdomain(id),
    canReserveSubdomain(celebration),
  ]);
  const period = celebration.celebrationDate ? reservationPeriod(celebration.celebrationDate) : null;

  return (
    <DomainManager
      celebrationId={id}
      permanentUrl={permanentCelebrationUrl(celebration.guid)}
      domain={domainForType(celebration.type)}
      isPremium={isPremium}
      suggestedLabel={slugifyForLabel(
        `${celebration.husband.firstName} & ${celebration.wife.firstName}`
      )}
      period={
        period ? { startsAt: period.startsAt.toISOString(), endsAt: period.endsAt.toISOString() } : null
      }
      current={
        current
          ? {
              domain: current.domain,
              label: current.label,
              startsAt: current.startsAt.toISOString(),
              endsAt: current.endsAt.toISOString(),
            }
          : null
      }
    />
  );
}
