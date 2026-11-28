import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActiveLanguages, getCelebrationById, type LocalizedText } from "@/lib/celebrations";
import { ensureInviteTokens } from "@/lib/guestInvites";
import { publicAppOrigin } from "@/lib/siteConfig";
import { routing, type AppLocale } from "@/i18n/routing";
import GuestsManager, { type InviteContext } from "../GuestsManager";
import InvitationMessageForm from "../InvitationMessageForm";
import type { SerializedGuestItem } from "../GuestItemForm";

export const dynamic = "force-dynamic";

const DATE_LOCALE: Record<AppLocale, string> = { el: "el-GR", en: "en-GB", ru: "ru-RU" };

// Access is enforced once by [id]/layout.tsx (requireCelebrationAccess).
export default async function GuestsTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const celebration = await getCelebrationById(id);
  if (!celebration) {
    notFound();
  }

  // Every guest needs a personal invitation link before anything is sent.
  const guests = await ensureInviteTokens(celebration);

  const items: SerializedGuestItem[] = guests.map((item) => ({
    id: item.id,
    name: item.name,
    phone: item.phone,
    email: item.email,
    expectedAttendees: item.expectedAttendees,
    confirmedAttendees: item.confirmedAttendees,
    confirmationDate: item.confirmationDate
      ? item.confirmationDate.toISOString().slice(0, 10)
      : undefined,
    deniedDate: item.deniedDate ? item.deniedDate.toISOString().slice(0, 10) : undefined,
    locale: item.locale,
    inviteToken: item.inviteToken,
    invitedAt: item.invitedAt?.toISOString(),
    invitedVia: item.invitedVia,
    inviteCount: item.inviteCount,
    inviteOpenedAt: item.inviteOpenedAt?.toISOString(),
  }));

  // The message per language: the celebration's own template where set,
  // otherwise the default for its type. t.raw() keeps the {name}…
  // placeholders literal (they're ours, not next-intl's).
  const templates = {} as Record<AppLocale, string>;
  const dates = {} as Record<AppLocale, string>;
  for (const locale of routing.locales) {
    const t = await getTranslations({ locale, namespace: "celebrations.invitations.defaultTemplate" });
    templates[locale] = celebration.invitationMessage?.[locale] || (t.raw(celebration.type) as string);
    dates[locale] = celebration.celebrationDate
      ? new Intl.DateTimeFormat(DATE_LOCALE[locale], {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(celebration.celebrationDate)
      : "";
  }

  const invite: InviteContext = {
    origin: publicAppOrigin(),
    guid: celebration.guid,
    couple: `${celebration.husband.firstName} & ${celebration.wife.firstName}`,
    dates,
    templates,
    invitationImageUrl: celebration.invitationFilename ? `/api/celebrations/${id}/invitation` : null,
  };

  return (
    <div className="flex flex-col gap-8">
      <InvitationMessageForm
        celebrationId={id}
        initialValue={templates as LocalizedText}
        activeLanguages={getActiveLanguages(celebration)}
      />
      <GuestsManager celebrationId={id} items={items} invite={invite} />
    </div>
  );
}
