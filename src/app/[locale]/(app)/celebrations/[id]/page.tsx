import {
  getCelebrationById,
  getActiveLanguages,
  isLiveEventConfirmationRequired,
} from "@/lib/celebrations";
import { notFound } from "next/navigation";
import CelebrationInfoForm, { type CelebrationInfoValues } from "./CelebrationInfoForm";

export default async function CelebrationInfoTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const celebration = await getCelebrationById(id);
  if (!celebration) {
    notFound();
  }

  const initialValues: CelebrationInfoValues = {
    title: celebration.title,
    childGender: celebration.childGender,
    celebrationDate: celebration.celebrationDate
      ? celebration.celebrationDate.toISOString().slice(0, 10)
      : undefined,
    headline: celebration.headline,
    quote: celebration.quote,
    countdownParagraph: celebration.countdownParagraph,
    activeLanguages: getActiveLanguages(celebration),
    maxGuestsPerInvitation: celebration.maxGuestsPerInvitation,
    showMaxGuests: celebration.showMaxGuests ?? false,
    showSeating: celebration.showSeating ?? false,
    showLive: celebration.showLive ?? false,
    showReservation: celebration.showReservation ?? false,
    isSitePublic: celebration.isSitePublic ?? false,
    isConfirmationRequiredOnLiveEvents: isLiveEventConfirmationRequired(celebration),
  };

  return (
    <CelebrationInfoForm
      celebrationId={id}
      celebrationType={celebration.type}
      initialValues={initialValues}
      heroBackgroundUrl={
        celebration.heroBackgroundFilename
          ? `/api/celebrations/${id}/hero-background`
          : undefined
      }
      invitationUrl={
        celebration.invitationFilename ? `/api/celebrations/${id}/invitation` : undefined
      }
    />
  );
}
