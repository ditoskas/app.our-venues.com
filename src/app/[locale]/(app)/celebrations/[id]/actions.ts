"use server";

import { canAccessCelebration } from "@/lib/celebrationAccess";
import {
  canReserveSubdomain,
  followCelebrationChange,
  getCelebrationSubdomain,
  isSubdomainAvailable,
  releaseSubdomain,
  reserveSubdomain,
} from "@/lib/subdomainReservations";
import {
  domainForType,
  normalizeLabel,
  reservationPeriod,
  validateLabel,
  type LabelError,
} from "@/lib/siteDomains";
import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  getCelebrationById,
  updateCelebrationInfo,
  setCelebrationHeroBackground,
  setCelebrationInvitation,
  updateCelebrationCouple,
  updateCelebrationStory,
  addTimelineItem,
  updateTimelineItem,
  deleteTimelineItem,
  addEventItem,
  updateEventItem,
  deleteEventItem,
  addGuestItem,
  updateGuestItem,
  deleteGuestItem,
  deleteLiveEventItem,
  type Celebration,
  type CelebrationInfoInput,
  type CelebrationStoryInput,
  type TimelineItem,
  type EventItem,
  type GuestItem,
  type LocalizedText,
} from "@/lib/celebrations";
import {
  saveTimelineImage,
  deleteTimelineImage,
  saveCelebrationHeroBackground,
  saveCelebrationInvitation,
  deleteLiveEventImage,
  assertStorageQuota,
  heroBackgroundUpload,
  invitationUpload,
} from "@/lib/uploads";
import { storageQuotaErrorMessage } from "@/lib/storageQuotaMessage";
import { logAction } from "@/lib/logActions";
import { getCurrentUser, getCurrentUserId } from "@/lib/auth";
import type { User } from "@/lib/users";
import {
  createSpouseUserIfMissing,
  readSpouse,
  readSpousePassword,
  validateSpouseLogins,
} from "../spouses";
import { LOCALES, localizedLabel } from "./localizedText";
import type { AppLocale } from "@/i18n/routing";

export interface CelebrationInfoFormState {
  error?: string;
}

// Shared by every tab's save action in this route — role check +
// professionalId ownership, same shape as assertAccess() in the list's
// actions.ts but returning a translated error string directly instead of
// relying on notFound() (Server Actions can't use that, see access.ts).
async function assertTabAccess(celebration: Celebration): Promise<{ error: string } | { user: User }> {
  const t = await getTranslations("celebrations.errors");
  const user = await getCurrentUser();
  if (!user || !canAccessCelebration(user, celebration)) {
    return { error: t("forbidden") };
  }
  return { user };
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | undefined {
  const s = String(value ?? "").trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function parseOptionalDate(value: FormDataEntryValue | null): Date | undefined {
  const s = String(value ?? "").trim();
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function getHeroBackgroundFile(formData: FormData): File | null {
  const file = formData.get("heroBackground");
  return file instanceof File && file.size > 0 ? file : null;
}

function getInvitationFile(formData: FormData): File | null {
  const file = formData.get("invitation");
  return file instanceof File && file.size > 0 ? file : null;
}

// Reads `${name}.el` / `${name}.en` / `${name}.ru` (see LocalizedField.tsx,
// which renders one input per locale under those names) into a LocalizedText,
// dropping empty languages. Returns undefined if none were filled in at all.
function readLocalizedText(formData: FormData, name: string): LocalizedText | undefined {
  const value: LocalizedText = {};
  for (const lang of LOCALES) {
    const v = String(formData.get(`${name}.${lang}`) ?? "").trim();
    if (v) value[lang] = v;
  }
  return Object.keys(value).length ? value : undefined;
}

// `el` is always active (see DEFAULT_ACTIVE_LANGUAGES in lib/celebrations.ts
// — required fields fall back to it) and isn't its own checkbox in the form;
// `en`/`ru` come from checked `<input name="activeLanguages" value="en"|"ru">`
// checkboxes (see CelebrationInfoForm.tsx).
function readActiveLanguages(formData: FormData): AppLocale[] {
  const extra = formData
    .getAll("activeLanguages")
    .map(String)
    .filter((v): v is AppLocale => v === "en" || v === "ru");
  return ["el", ...extra];
}

function toLoggable(input: CelebrationInfoInput) {
  return {
    ...input,
    celebrationDate: input.celebrationDate?.toISOString(),
  };
}

export async function updateCelebrationInfoAction(
  id: string,
  _prevState: CelebrationInfoFormState,
  formData: FormData
): Promise<CelebrationInfoFormState> {
  const t = await getTranslations("celebrations.errors");
  const tInfo = await getTranslations("celebrations.info.errors");

  const before = await getCelebrationById(id);
  if (!before) return { error: t("notFound") };

  const access = await assertTabAccess(before);
  if ("error" in access) return { error: access.error };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: tInfo("required") };

  const input: CelebrationInfoInput = {
    title,
    celebrationDate: parseOptionalDate(formData.get("celebrationDate")),
    headline: readLocalizedText(formData, "headline"),
    quote: readLocalizedText(formData, "quote"),
    countdownParagraph: readLocalizedText(formData, "countdownParagraph"),
    activeLanguages: readActiveLanguages(formData),
    maxGuestsPerInvitation: parseOptionalNumber(formData.get("maxGuestsPerInvitation")),
    showMaxGuests: formData.get("showMaxGuests") === "on",
    showSeating: formData.get("showSeating") === "on",
    showLive: formData.get("showLive") === "on",
    showReservation: formData.get("showReservation") === "on",
    isSitePublic: formData.get("isSitePublic") === "on",
  };

  // Both images are checked against the owning professional's storage quota
  // together, before anything is written, so a rejected upload never leaves
  // the form half-saved.
  const heroBackground = getHeroBackgroundFile(formData);
  const invitation = getInvitationFile(formData);
  try {
    await assertStorageQuota(before.professionalId, [
      ...(heroBackground ? [heroBackgroundUpload(before.professionalId, id, heroBackground)] : []),
      ...(invitation ? [invitationUpload(before.professionalId, id, invitation)] : []),
    ]);
  } catch (err) {
    const message = await storageQuotaErrorMessage(err);
    if (!message) throw err;
    return { error: message };
  }

  // A reserved subdomain follows the date; a clash rejects the change.
  const actorId = (await getCurrentUserId()) ?? "system";
  const follow = await followCelebrationChange(
    id,
    title,
    { type: before.type, celebrationDate: input.celebrationDate },
    actorId
  );
  if (!follow.ok) return { error: t("subdomainClash", { label: follow.label }) };

  try {
    await updateCelebrationInfo(id, input);
  } catch {
    await followCelebrationChange(id, title, before, actorId); // move it back
    return { error: t("updateFailed") };
  }

  let heroBackgroundFilename = before.heroBackgroundFilename;
  if (heroBackground) {
    heroBackgroundFilename = await saveCelebrationHeroBackground(
      before.professionalId,
      id,
      heroBackground
    );
    await setCelebrationHeroBackground(id, heroBackgroundFilename);
  }

  let invitationFilename = before.invitationFilename;
  if (invitation) {
    invitationFilename = await saveCelebrationInvitation(before.professionalId, id, invitation);
    await setCelebrationInvitation(id, invitationFilename);
  }

  await logAction({
    userId: actorId,
    type: "info",
    category: "Celebrations",
    message: `Updated celebration info "${title}"`,
    dataFrom: toLoggable({
      title: before.title,
      celebrationDate: before.celebrationDate,
      headline: before.headline,
      quote: before.quote,
      countdownParagraph: before.countdownParagraph,
      activeLanguages: before.activeLanguages ?? ["el"],
      maxGuestsPerInvitation: before.maxGuestsPerInvitation,
      showMaxGuests: before.showMaxGuests ?? false,
      showSeating: before.showSeating ?? false,
      showLive: before.showLive ?? false,
      showReservation: before.showReservation ?? false,
      isSitePublic: before.isSitePublic ?? false,
    }),
    dataTo: toLoggable(input),
  });

  revalidatePath(`/celebrations/${id}`);
  return redirect({ href: `/celebrations/${id}`, locale: await getLocale() });
}

export interface CelebrationCoupleFormState {
  error?: string;
}

export async function updateCelebrationCoupleAction(
  id: string,
  _prevState: CelebrationCoupleFormState,
  formData: FormData
): Promise<CelebrationCoupleFormState> {
  const t = await getTranslations("celebrations.errors");
  const tCouple = await getTranslations("celebrations.coupleInfo.errors");

  const before = await getCelebrationById(id);
  if (!before) return { error: t("notFound") };

  const access = await assertTabAccess(before);
  if ("error" in access) return { error: access.error };

  const husband = readSpouse(formData, "husband");
  if ("error" in husband) return { error: tCouple("required") };

  const wife = readSpouse(formData, "wife");
  if ("error" in wife) return { error: tCouple("required") };

  const logins = [
    { spouse: husband, password: readSpousePassword(formData, "husband") },
    { spouse: wife, password: readSpousePassword(formData, "wife") },
  ];
  const loginError = await validateSpouseLogins(logins);
  if (loginError) return { error: loginError };

  try {
    await updateCelebrationCouple(id, { husband, wife });
  } catch {
    return { error: t("updateFailed") };
  }

  const actorId = (await getCurrentUserId()) ?? "system";

  await logAction({
    userId: actorId,
    type: "info",
    category: "Celebrations",
    message: `Updated couple info for "${before.title}"`,
    dataFrom: { husband: before.husband, wife: before.wife },
    dataTo: { husband, wife },
  });

  for (const login of logins) {
    await createSpouseUserIfMissing(id, login, actorId);
  }

  revalidatePath(`/celebrations/${id}/couple-info`);
  return redirect({ href: `/celebrations/${id}/couple-info`, locale: await getLocale() });
}

export interface CelebrationStoryFormState {
  error?: string;
}

export async function updateCelebrationStoryAction(
  id: string,
  _prevState: CelebrationStoryFormState,
  formData: FormData
): Promise<CelebrationStoryFormState> {
  const t = await getTranslations("celebrations.errors");

  const before = await getCelebrationById(id);
  if (!before) return { error: t("notFound") };

  const access = await assertTabAccess(before);
  if ("error" in access) return { error: access.error };

  const input: CelebrationStoryInput = {
    storyTitle: readLocalizedText(formData, "storyTitle"),
    storySubtitle: readLocalizedText(formData, "storySubtitle"),
    storyParagraph: readLocalizedText(formData, "storyParagraph"),
  };

  try {
    await updateCelebrationStory(id, input);
  } catch {
    return { error: t("updateFailed") };
  }

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "info",
    category: "Celebrations",
    message: `Updated story info for "${before.title}"`,
    dataFrom: {
      storyTitle: before.storyTitle,
      storySubtitle: before.storySubtitle,
      storyParagraph: before.storyParagraph,
    },
    dataTo: input,
  });

  revalidatePath(`/celebrations/${id}/story`);
  return redirect({ href: `/celebrations/${id}/story`, locale: await getLocale() });
}

export interface TimelineItemFormState {
  error?: string;
}

function getTimelineImageFile(formData: FormData): File | null {
  const file = formData.get("image");
  return file instanceof File && file.size > 0 ? file : null;
}

function readTimelineItemForm(
  formData: FormData
): { error: string } | { title: LocalizedText; description?: LocalizedText; date?: Date } {
  const title = readLocalizedText(formData, "title");
  if (!title?.el) return { error: "required" };

  const description = readLocalizedText(formData, "description");
  const date = parseOptionalDate(formData.get("date"));

  return { title, ...(description ? { description } : {}), ...(date ? { date } : {}) };
}

export async function createTimelineItemAction(
  celebrationId: string,
  _prevState: TimelineItemFormState,
  formData: FormData
): Promise<TimelineItemFormState> {
  const t = await getTranslations("celebrations.errors");
  const tStory = await getTranslations("celebrations.story.errors");

  const celebration = await getCelebrationById(celebrationId);
  if (!celebration) return { error: t("notFound") };

  const access = await assertTabAccess(celebration);
  if ("error" in access) return { error: access.error };

  const parsed = readTimelineItemForm(formData);
  if ("error" in parsed) return { error: tStory("titleRequired") };

  const image = getTimelineImageFile(formData);
  let imageFilename: string | undefined;
  if (image) {
    try {
      imageFilename = await saveTimelineImage(celebration.professionalId, celebrationId, image);
    } catch (err) {
      const message = await storageQuotaErrorMessage(err);
      if (!message) throw err;
      return { error: message };
    }
  }

  const newItem = await addTimelineItem(celebrationId, {
    title: parsed.title,
    ...(parsed.description ? { description: parsed.description } : {}),
    ...(parsed.date ? { date: parsed.date } : {}),
    ...(imageFilename ? { imageFilename } : {}),
  });

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "success",
    category: "Celebrations",
    message: `Added timeline item "${localizedLabel(newItem.title)}" to "${celebration.title}"`,
    dataTo: newItem,
  });

  revalidatePath(`/celebrations/${celebrationId}/story`);
  return redirect({ href: `/celebrations/${celebrationId}/story`, locale: await getLocale() });
}

export async function updateTimelineItemAction(
  celebrationId: string,
  itemId: string,
  _prevState: TimelineItemFormState,
  formData: FormData
): Promise<TimelineItemFormState> {
  const t = await getTranslations("celebrations.errors");
  const tStory = await getTranslations("celebrations.story.errors");

  const celebration = await getCelebrationById(celebrationId);
  if (!celebration) return { error: t("notFound") };

  const access = await assertTabAccess(celebration);
  if ("error" in access) return { error: access.error };

  const existing = celebration.timeline?.find((item) => item.id === itemId);
  if (!existing) return { error: t("notFound") };

  const parsed = readTimelineItemForm(formData);
  if ("error" in parsed) return { error: tStory("titleRequired") };

  const image = getTimelineImageFile(formData);
  let imageFilename = existing.imageFilename;
  if (image) {
    // New image first (its quota check credits back the one it replaces),
    // old one deleted only once that succeeded — a rejected upload keeps the
    // item's current image.
    try {
      imageFilename = await saveTimelineImage(
        celebration.professionalId,
        celebrationId,
        image,
        existing.imageFilename
      );
    } catch (err) {
      const message = await storageQuotaErrorMessage(err);
      if (!message) throw err;
      return { error: message };
    }
    if (existing.imageFilename) {
      await deleteTimelineImage(celebration.professionalId, celebrationId, existing.imageFilename);
    }
  }

  const updated: Omit<TimelineItem, "id"> = {
    title: parsed.title,
    ...(parsed.description ? { description: parsed.description } : {}),
    ...(parsed.date ? { date: parsed.date } : {}),
    ...(imageFilename ? { imageFilename } : {}),
  };

  await updateTimelineItem(celebrationId, itemId, updated);

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "info",
    category: "Celebrations",
    message: `Updated timeline item "${localizedLabel(parsed.title)}" on "${celebration.title}"`,
    dataFrom: existing,
    dataTo: { id: itemId, ...updated },
  });

  revalidatePath(`/celebrations/${celebrationId}/story`);
  return redirect({ href: `/celebrations/${celebrationId}/story`, locale: await getLocale() });
}

export async function deleteTimelineItemAction(celebrationId: string, itemId: string): Promise<void> {
  const celebration = await getCelebrationById(celebrationId);
  if (!celebration) return;

  const access = await assertTabAccess(celebration);
  if ("error" in access) return;

  const existing = celebration.timeline?.find((item) => item.id === itemId);
  if (!existing) return;

  if (existing.imageFilename) {
    await deleteTimelineImage(celebration.professionalId, celebrationId, existing.imageFilename);
  }

  await deleteTimelineItem(celebrationId, itemId);

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "warning",
    category: "Celebrations",
    message: `Deleted timeline item "${localizedLabel(existing.title)}" from "${celebration.title}"`,
    dataFrom: existing,
  });

  revalidatePath(`/celebrations/${celebrationId}/story`);
}

export interface EventItemFormState {
  error?: string;
}

function readEventItemForm(
  formData: FormData
):
  | { error: string }
  | Omit<EventItem, "id"> {
  const title = readLocalizedText(formData, "title");
  if (!title?.el) return { error: "required" };

  const description = readLocalizedText(formData, "description");
  const area = String(formData.get("area") ?? "").trim() || undefined;
  const date = parseOptionalDate(formData.get("date"));
  const city = String(formData.get("city") ?? "").trim() || undefined;
  const address = String(formData.get("address") ?? "").trim() || undefined;
  const postCode = String(formData.get("postCode") ?? "").trim() || undefined;
  const country = String(formData.get("country") ?? "").trim() || undefined;
  const mapLat = parseOptionalNumber(formData.get("mapLat"));
  const mapLng = parseOptionalNumber(formData.get("mapLng"));

  return {
    title,
    ...(description ? { description } : {}),
    ...(area ? { area } : {}),
    ...(date ? { date } : {}),
    ...(city ? { city } : {}),
    ...(address ? { address } : {}),
    ...(postCode ? { postCode } : {}),
    ...(country ? { country } : {}),
    ...(mapLat !== undefined ? { mapLat } : {}),
    ...(mapLng !== undefined ? { mapLng } : {}),
  };
}

export async function createEventItemAction(
  celebrationId: string,
  _prevState: EventItemFormState,
  formData: FormData
): Promise<EventItemFormState> {
  const t = await getTranslations("celebrations.errors");
  const tEvents = await getTranslations("celebrations.events.errors");

  const celebration = await getCelebrationById(celebrationId);
  if (!celebration) return { error: t("notFound") };

  const access = await assertTabAccess(celebration);
  if ("error" in access) return { error: access.error };

  const parsed = readEventItemForm(formData);
  if ("error" in parsed) return { error: tEvents("titleRequired") };

  const newItem = await addEventItem(celebrationId, parsed);

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "success",
    category: "Celebrations",
    message: `Added event "${localizedLabel(newItem.title)}" to "${celebration.title}"`,
    dataTo: newItem,
  });

  revalidatePath(`/celebrations/${celebrationId}/events`);
  return redirect({ href: `/celebrations/${celebrationId}/events`, locale: await getLocale() });
}

export async function updateEventItemAction(
  celebrationId: string,
  itemId: string,
  _prevState: EventItemFormState,
  formData: FormData
): Promise<EventItemFormState> {
  const t = await getTranslations("celebrations.errors");
  const tEvents = await getTranslations("celebrations.events.errors");

  const celebration = await getCelebrationById(celebrationId);
  if (!celebration) return { error: t("notFound") };

  const access = await assertTabAccess(celebration);
  if ("error" in access) return { error: access.error };

  const existing = celebration.events?.find((item) => item.id === itemId);
  if (!existing) return { error: t("notFound") };

  const parsed = readEventItemForm(formData);
  if ("error" in parsed) return { error: tEvents("titleRequired") };

  await updateEventItem(celebrationId, itemId, parsed);

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "info",
    category: "Celebrations",
    message: `Updated event "${localizedLabel(parsed.title)}" on "${celebration.title}"`,
    dataFrom: existing,
    dataTo: { id: itemId, ...parsed },
  });

  revalidatePath(`/celebrations/${celebrationId}/events`);
  return redirect({ href: `/celebrations/${celebrationId}/events`, locale: await getLocale() });
}

export async function deleteEventItemAction(celebrationId: string, itemId: string): Promise<void> {
  const celebration = await getCelebrationById(celebrationId);
  if (!celebration) return;

  const access = await assertTabAccess(celebration);
  if ("error" in access) return;

  const existing = celebration.events?.find((item) => item.id === itemId);
  if (!existing) return;

  await deleteEventItem(celebrationId, itemId);

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "warning",
    category: "Celebrations",
    message: `Deleted event "${localizedLabel(existing.title)}" from "${celebration.title}"`,
    dataFrom: existing,
  });

  revalidatePath(`/celebrations/${celebrationId}/events`);
}

export interface GuestItemFormState {
  error?: string;
}

function readGuestItemForm(
  formData: FormData
):
  | { error: string }
  | Omit<GuestItem, "id"> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "required" };

  const phone = String(formData.get("phone") ?? "").trim() || undefined;
  const email = String(formData.get("email") ?? "").trim() || undefined;
  const expectedAttendees = parseOptionalNumber(formData.get("expectedAttendees"));
  const confirmedAttendees = parseOptionalNumber(formData.get("confirmedAttendees"));
  const confirmationDate = parseOptionalDate(formData.get("confirmationDate"));

  return {
    name,
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
    ...(expectedAttendees !== undefined ? { expectedAttendees } : {}),
    ...(confirmedAttendees !== undefined ? { confirmedAttendees } : {}),
    ...(confirmationDate ? { confirmationDate } : {}),
  };
}

// Email/phone only need to be unique among this celebration's own guests,
// not globally — two different celebrations can happily invite the same
// person. `excludeId` skips the guest being edited so saving it unchanged
// doesn't flag itself as a duplicate of itself.
function findDuplicateGuestContact(
  guests: GuestItem[],
  input: { email?: string; phone?: string },
  excludeId?: string
): "email" | "phone" | null {
  for (const guest of guests) {
    if (guest.id === excludeId) continue;
    if (input.email && guest.email?.toLowerCase() === input.email.toLowerCase()) {
      return "email";
    }
    if (input.phone && guest.phone === input.phone) {
      return "phone";
    }
  }
  return null;
}

export async function createGuestItemAction(
  celebrationId: string,
  _prevState: GuestItemFormState,
  formData: FormData
): Promise<GuestItemFormState> {
  const t = await getTranslations("celebrations.errors");
  const tGuests = await getTranslations("celebrations.guests.errors");

  const celebration = await getCelebrationById(celebrationId);
  if (!celebration) return { error: t("notFound") };

  const access = await assertTabAccess(celebration);
  if ("error" in access) return { error: access.error };

  const parsed = readGuestItemForm(formData);
  if ("error" in parsed) return { error: tGuests("nameRequired") };

  const duplicate = findDuplicateGuestContact(celebration.guests ?? [], parsed);
  if (duplicate === "email") return { error: tGuests("emailTaken") };
  if (duplicate === "phone") return { error: tGuests("phoneTaken") };

  const newItem = await addGuestItem(celebrationId, parsed);

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "success",
    category: "Celebrations",
    message: `Added guest "${newItem.name}" to "${celebration.title}"`,
    dataTo: newItem,
  });

  revalidatePath(`/celebrations/${celebrationId}/guests`);
  return redirect({ href: `/celebrations/${celebrationId}/guests`, locale: await getLocale() });
}

export async function updateGuestItemAction(
  celebrationId: string,
  itemId: string,
  _prevState: GuestItemFormState,
  formData: FormData
): Promise<GuestItemFormState> {
  const t = await getTranslations("celebrations.errors");
  const tGuests = await getTranslations("celebrations.guests.errors");

  const celebration = await getCelebrationById(celebrationId);
  if (!celebration) return { error: t("notFound") };

  const access = await assertTabAccess(celebration);
  if ("error" in access) return { error: access.error };

  const existing = celebration.guests?.find((item) => item.id === itemId);
  if (!existing) return { error: t("notFound") };

  const parsed = readGuestItemForm(formData);
  if ("error" in parsed) return { error: tGuests("nameRequired") };

  const duplicate = findDuplicateGuestContact(celebration.guests ?? [], parsed, itemId);
  if (duplicate === "email") return { error: tGuests("emailTaken") };
  if (duplicate === "phone") return { error: tGuests("phoneTaken") };

  await updateGuestItem(celebrationId, itemId, parsed);

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "info",
    category: "Celebrations",
    message: `Updated guest "${parsed.name}" on "${celebration.title}"`,
    dataFrom: existing,
    dataTo: { id: itemId, ...parsed },
  });

  revalidatePath(`/celebrations/${celebrationId}/guests`);
  return redirect({ href: `/celebrations/${celebrationId}/guests`, locale: await getLocale() });
}

export async function deleteGuestItemAction(celebrationId: string, itemId: string): Promise<void> {
  const celebration = await getCelebrationById(celebrationId);
  if (!celebration) return;

  const access = await assertTabAccess(celebration);
  if ("error" in access) return;

  const existing = celebration.guests?.find((item) => item.id === itemId);
  if (!existing) return;

  await deleteGuestItem(celebrationId, itemId);

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "warning",
    category: "Celebrations",
    message: `Deleted guest "${existing.name}" from "${celebration.title}"`,
    dataFrom: existing,
  });

  revalidatePath(`/celebrations/${celebrationId}/guests`);
}

// Delete-only — see LiveEventItem in lib/celebrations.ts: no admin create/
// edit action, records are seeded (or, in future, added by a public/guest
// endpoint) and only removable from this tab.
export async function deleteLiveEventItemAction(celebrationId: string, itemId: string): Promise<void> {
  const celebration = await getCelebrationById(celebrationId);
  if (!celebration) return;

  const access = await assertTabAccess(celebration);
  if ("error" in access) return;

  const existing = celebration.liveEvents?.find((item) => item.id === itemId);
  if (!existing) return;

  await deleteLiveEventImage(celebration.professionalId, celebrationId, existing.imageFilename);
  await deleteLiveEventItem(celebrationId, itemId);

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "warning",
    category: "Celebrations",
    message: `Deleted live event photo "${existing.title}" from "${celebration.title}"`,
    dataFrom: existing,
  });

  revalidatePath(`/celebrations/${celebrationId}/live-events`);
}

// ---------------------------------------------------------------------------
// Domain tab — subdomain reservations (docs/CELEBRATION-SUBDOMAINS.md)
// ---------------------------------------------------------------------------

export type SubdomainAvailability =
  | { status: "available" }
  | { status: "taken" }
  | { status: "current" }
  | { status: "invalid"; reason: LabelError }
  | { status: "error" };

// Live check while typing. Same access rules as reserving, minus premium
// (harmless read; the reserve action enforces premium).
export async function checkSubdomainAvailabilityAction(
  id: string,
  rawLabel: string
): Promise<SubdomainAvailability> {
  const celebration = await getCelebrationById(id);
  if (!celebration?.celebrationDate) return { status: "error" };
  const access = await assertTabAccess(celebration);
  if ("error" in access) return { status: "error" };

  const label = normalizeLabel(rawLabel);
  const invalid = validateLabel(label);
  if (invalid) return { status: "invalid", reason: invalid };

  const domain = domainForType(celebration.type);
  const current = await getCelebrationSubdomain(id);
  if (current?.domain === domain && current.label === label) return { status: "current" };

  const free = await isSubdomainAvailable(
    domain,
    label,
    reservationPeriod(celebration.celebrationDate),
    id
  );
  return { status: free ? "available" : "taken" };
}

export interface SubdomainFormState {
  error?: string;
}

export async function reserveSubdomainAction(
  id: string,
  _prevState: SubdomainFormState,
  formData: FormData
): Promise<SubdomainFormState> {
  const t = await getTranslations("celebrations.domain.errors");
  const celebration = await getCelebrationById(id);
  if (!celebration) return { error: t("notFound") };
  const access = await assertTabAccess(celebration);
  if ("error" in access) return { error: access.error };

  if (!(await canReserveSubdomain(celebration))) return { error: t("premiumRequired") };
  if (!celebration.celebrationDate) return { error: t("dateRequired") };

  const label = normalizeLabel(String(formData.get("label") ?? ""));
  const invalid = validateLabel(label);
  if (invalid) return { error: t(`invalid.${invalid}`) };

  const actorId = (await getCurrentUserId()) ?? "system";
  const before = await getCelebrationSubdomain(id);
  const result = await reserveSubdomain(celebration, label, actorId);
  if (!result.ok) return { error: t("taken") };

  if (!before || before.label !== label || before.domain !== result.subdomain.domain) {
    await logAction({
      userId: actorId,
      type: "success",
      category: "Celebrations",
      message: before
        ? `Changed subdomain of "${celebration.title}" to ${label}.${result.subdomain.domain}`
        : `Reserved subdomain ${label}.${result.subdomain.domain} for "${celebration.title}"`,
      ...(before ? { dataFrom: before } : {}),
      dataTo: result.subdomain,
    });
  }

  revalidatePath(`/celebrations/${id}/domain`);
  return redirect({ href: `/celebrations/${id}/domain`, locale: await getLocale() });
}

// Release is allowed even after a Premium → Free downgrade (decision: keep
// existing reservations, but the owner may still give theirs up).
export async function releaseSubdomainAction(id: string): Promise<void> {
  const celebration = await getCelebrationById(id);
  if (!celebration) return;
  const access = await assertTabAccess(celebration);
  if ("error" in access) return;

  const released = await releaseSubdomain(id);
  if (released) {
    await logAction({
      userId: (await getCurrentUserId()) ?? "system",
      type: "warning",
      category: "Celebrations",
      message: `Released subdomain ${released.label}.${released.domain} of "${celebration.title}"`,
      dataFrom: released,
    });
  }
  revalidatePath(`/celebrations/${id}/domain`);
}
