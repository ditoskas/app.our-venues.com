import { logAction } from "../../logActions";
import {
  addEventItem,
  addGuestItem,
  addLiveEventItem,
  addTimelineItem,
  createCelebration,
  listCelebrations,
  setCelebrationHeroBackground,
  setCelebrationInvitation,
  updateCelebrationInfo,
  updateCelebrationStory,
  type EventItem,
  type GuestItem,
} from "../../celebrations";
import {
  saveCelebrationHeroBackgroundFromPath,
  saveCelebrationInvitationFromPath,
  saveLiveEventImageFromPath,
  saveTimelineImageFromPath,
} from "../../uploads";
import { seedSpouseUser } from "./users";
import { getCelebrationById } from "../../celebrations";
import { getCelebrationSubdomain, reserveSubdomain } from "../../subdomainReservations";
import type { CelebrationSeed, SeededLogin } from "../types";

async function log(message: string, dataTo?: unknown): Promise<void> {
  await logAction({ userId: "system", type: "info", category: "Celebrations", message, dataTo });
}

// Idempotent by title: an existing celebration is left as-is (only its
// Couple logins are ensured/re-linked). Returns the Couple logins, if any.
export async function seedCelebration(
  professionalId: string,
  seed: CelebrationSeed
): Promise<SeededLogin[]> {
  const match = (await listCelebrations()).find((c) => c.title === seed.title);
  const celebrationId = match
    ? match._id.toString()
    : await createSeededCelebration(professionalId, seed);

  if (seed.subdomainLabel) await seedSubdomain(celebrationId, seed.subdomainLabel);

  if (!seed.createCoupleLogins) return [];
  const logins = await Promise.all([
    seedSpouseUser(celebrationId, seed.husband),
    seedSpouseUser(celebrationId, seed.wife),
  ]);
  return logins.filter((l): l is SeededLogin => l !== null);
}

async function createSeededCelebration(
  professionalId: string,
  seed: CelebrationSeed
): Promise<string> {
  const celebration = await createCelebration({
    title: seed.title,
    type: seed.type,
    professionalId,
    husband: seed.husband,
    wife: seed.wife,
  });
  const id = celebration._id.toString();
  const title = celebration.title;
  await log(`Seeded celebration "${title}"`, {
    title,
    type: seed.type,
    professionalId,
    husband: seed.husband,
    wife: seed.wife,
  });

  if (seed.info) {
    const { info } = seed;
    await updateCelebrationInfo(id, {
      title,
      celebrationDate: info.celebrationDate,
      headline: info.headline,
      quote: info.quote,
      countdownParagraph: info.countdownParagraph,
      activeLanguages: info.activeLanguages ?? ["el"],
      maxGuestsPerInvitation: info.maxGuestsPerInvitation,
      showMaxGuests: info.showMaxGuests ?? false,
      showSeating: info.showSeating ?? false,
      showLive: info.showLive ?? false,
      showReservation: info.showReservation ?? false,
      isSitePublic: info.isSitePublic ?? false,
    });
    await log(`Seeded celebration info for "${title}"`, info);
  }

  if (seed.heroBackgroundSourcePath) {
    const filename = await saveCelebrationHeroBackgroundFromPath(
      professionalId,
      id,
      seed.heroBackgroundSourcePath
    );
    await setCelebrationHeroBackground(id, filename);
  }
  if (seed.invitationSourcePath) {
    const filename = await saveCelebrationInvitationFromPath(
      professionalId,
      id,
      seed.invitationSourcePath
    );
    await setCelebrationInvitation(id, filename);
  }

  if (seed.story) {
    await updateCelebrationStory(id, seed.story);
    await log(`Seeded story info for "${title}"`, seed.story);
  }

  if (seed.timeline?.length) {
    for (const item of seed.timeline) {
      const imageFilename = item.imageSourcePath
        ? await saveTimelineImageFromPath(professionalId, id, item.imageSourcePath)
        : undefined;
      await addTimelineItem(id, {
        title: item.title,
        ...(item.description ? { description: item.description } : {}),
        ...(item.date ? { date: item.date } : {}),
        ...(imageFilename ? { imageFilename } : {}),
      });
    }
    await log(
      `Seeded ${seed.timeline.length} timeline item(s) for "${title}"`,
      seed.timeline.map((item) => ({ title: item.title, date: item.date }))
    );
  }

  // Captured so liveEvents below can resolve eventIndex/guestIndex to ids.
  const insertedEvents: EventItem[] = [];
  if (seed.events?.length) {
    for (const item of seed.events) insertedEvents.push(await addEventItem(id, item));
    await log(
      `Seeded ${seed.events.length} event(s) for "${title}"`,
      seed.events.map((item) => ({ title: item.title, date: item.date }))
    );
  }

  const insertedGuests: GuestItem[] = [];
  if (seed.guests?.length) {
    for (const item of seed.guests) insertedGuests.push(await addGuestItem(id, item));
    await log(
      `Seeded ${seed.guests.length} guest(s) for "${title}"`,
      seed.guests.map((item) => ({ name: item.name, confirmationDate: item.confirmationDate }))
    );
  }

  if (seed.liveEvents?.length) {
    for (const item of seed.liveEvents) {
      const event = insertedEvents[item.eventIndex];
      const guest = insertedGuests[item.guestIndex];
      if (!event || !guest) continue;

      const imageFilename = await saveLiveEventImageFromPath(professionalId, id, item.imageSourcePath);
      await addLiveEventItem(id, {
        eventId: event.id,
        uploadedByGuestId: guest.id,
        imageFilename,
        uploadedAt: item.uploadedAt,
        title: item.title,
        ...(item.description ? { description: item.description } : {}),
      });
    }
    await log(
      `Seeded ${seed.liveEvents.length} live event photo(s) for "${title}"`,
      seed.liveEvents.map((item) => ({ title: item.title, uploadedAt: item.uploadedAt }))
    );
  }

  return id;
}

// Idempotent: only reserves when the celebration has no subdomain yet. A
// clash (label taken for that period) is logged, never thrown — seeding must
// not take the app down.
async function seedSubdomain(celebrationId: string, label: string): Promise<void> {
  if (await getCelebrationSubdomain(celebrationId)) return;
  const celebration = await getCelebrationById(celebrationId);
  if (!celebration?.celebrationDate) return;

  const result = await reserveSubdomain(celebration, label, "system");
  await logAction({
    userId: "system",
    type: result.ok ? "info" : "warning",
    category: "Celebrations",
    message: result.ok
      ? `Seeded subdomain ${label}.${result.subdomain.domain} for "${celebration.title}"`
      : `Could not seed subdomain "${label}" for "${celebration.title}" (taken)`,
    ...(result.ok ? { dataTo: result.subdomain } : {}),
  });
}
