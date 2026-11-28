import { Collection, ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
import { getDb } from "./mongodb";
import type { AppLocale } from "@/i18n/routing";

export const CELEBRATIONS_COLLECTION = "Celebrations";

export type CelebrationType = "Marriage" | "Christening";

// Guest-facing free text that can be translated into any of the app's
// locales (see i18n/routing.ts) — only present languages are stored, so a
// field with just `{ el: "..." }` simply hasn't been translated yet. `el`
// is treated as the primary/required language wherever one of these fields
// itself is required (see readLocalizedText() in the View page's
// actions.ts). Not used for admin-only fields like Celebration.title.
export type LocalizedText = Partial<Record<AppLocale, string>>;

// Which locales a celebration's guest-facing content (see LocalizedText
// above) is being translated into — set from the Celebration Info tab's
// "Active Languages" checkboxes. `el` is always included (see
// DEFAULT_ACTIVE_LANGUAGES/getActiveLanguages below) since it's the
// primary language required fields fall back to; `en`/`ru` are opt-in per
// celebration. Purely a UI concern (which LocalizedField tabs are offered
// for editing) — it doesn't delete or hide any language's already-saved
// text, so re-activating a language later shows whatever was last saved
// for it.
export const DEFAULT_ACTIVE_LANGUAGES: AppLocale[] = ["el"];

export function getActiveLanguages(celebration: Celebration): AppLocale[] {
  return celebration.activeLanguages?.length
    ? celebration.activeLanguages
    : DEFAULT_ACTIVE_LANGUAGES;
}

export interface Spouse {
  firstName: string;
  lastName: string;
  email?: string;
  mobile?: string;
}

export interface TimelineItem {
  id: string;
  title: LocalizedText;
  description?: LocalizedText;
  date?: Date;
  imageFilename?: string;
}

// One shape/piece in an event's seating layout (EventItem.seatingLayout): a
// round or rectangular table (has `code` + `maxPeople`, no `label`) or a
// free-standing placeholder like "Music Band"/"Dance Floor" (has `label`, no
// `code`/`maxPeople`). x/y/width/height are pixels on the layout editor's
// canvas, top-left origin — a rough visual floor plan, not a scale drawing.
export type SeatingElementType = "table-circle" | "table-rect" | "placeholder";

export interface SeatingLayoutElement {
  id: string;
  type: SeatingElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  code?: string;
  maxPeople?: number;
  label?: string;
}

export interface EventItem {
  id: string;
  title: LocalizedText;
  description?: LocalizedText;
  area?: string;
  date?: Date;
  city?: string;
  address?: string;
  postCode?: string;
  country?: string;
  mapLat?: number;
  mapLng?: number;
  // Opts the event into seating: the Events tab offers "Configure layout"
  // (the table designer) and the public Reception Seating page lists it.
  // Unset = false.
  hasSeating?: boolean;
  // Saved only from the layout editor (updateEventSeatingLayout); the event
  // form keeps it untouched (updateEventItem preserves it).
  seatingLayout?: SeatingLayoutElement[];
}

export type InviteChannel = "whatsapp" | "viber" | "share";

// A guest's table for one event (at most one per eventId). tableId points at
// a SeatingLayoutElement.id of that event; a stale reference (table deleted)
// simply stops resolving to a table.
export interface GuestTableAssignment {
  eventId: string;
  tableId: string;
}

export interface GuestItem {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  expectedAttendees?: number;
  confirmedAttendees?: number;
  confirmationDate?: Date;
  deniedDate?: Date;
  // Language the invitation message is written in for this guest (defaults
  // to "el"). Admin-editable in the guest form.
  locale?: AppLocale;
  // --- Invitations (lib/guestInvites.ts) — system-managed, never set from
  // the guest form; updateGuestItem() preserves them. ---
  // Secret per-guest code in the personal invitation link
  // (/celebrations/{guid}?invite=…); opening it signs the guest in.
  inviteToken?: string;
  invitedAt?: Date; // last time an invitation was sent
  invitedVia?: InviteChannel;
  inviteCount?: number; // how many times it was sent (resends included)
  inviteOpenedAt?: Date; // first time the guest opened their personal link
  // Seating (Guests tab → "Assign table"); preserved by updateGuestItem().
  tableAssignments?: GuestTableAssignment[];
}

// Seats a guest's party takes at a table: confirmed attendees once they've
// RSVP'd, else expected attendees, else 1.
export function guestSeatCount(guest: GuestItem): number {
  return guest.confirmedAttendees ?? guest.expectedAttendees ?? 1;
}

// Seats reserved at one table for one event — derived from the guests'
// assignments, never stored, so it can't drift from the guest list.
export function getTableReservedSeats(guests: GuestItem[], eventId: string, tableId: string): number {
  return guests
    .filter((g) => g.tableAssignments?.some((a) => a.eventId === eventId && a.tableId === tableId))
    .reduce((sum, g) => sum + guestSeatCount(g), 0);
}

// Fields of a GuestItem that the guest form and the RSVP route never carry
// (written only by the invitation flow and the seating assignment), so
// updateGuestItem() must keep them.
export const GUEST_INVITE_FIELDS = [
  "inviteToken",
  "invitedAt",
  "invitedVia",
  "inviteCount",
  "inviteOpenedAt",
  "tableAssignments",
] as const;

// A guest-submitted photo from the "Live Events" tab — `eventId` points at
// one of this celebration's own `EventItem`s (the "location" is a closed
// set: wherever the celebration actually has an event, not free text) and
// `uploadedByGuestId` at one of its `GuestItem`s. Both are plain string
// references, not populated objects — resolved to a display label by
// whichever page reads them (see live-events/page.tsx), same as every
// other id-reference in this file. No LocalizedText here: unlike
// Events/Timeline copy (curated by the admin), title/description on a
// live upload are free text as the uploader typed it, in whatever single
// language they used.
export interface LiveEventItem {
  id: string;
  eventId: string;
  imageFilename: string;
  uploadedByGuestId: string;
  uploadedAt: Date;
  title: string;
  description?: string;
}

export interface Celebration {
  _id: ObjectId;
  guid: string;
  title: string;
  type: CelebrationType;
  professionalId: string;
  husband: Spouse;
  wife: Spouse;
  celebrationDate?: Date;
  headline?: LocalizedText;
  quote?: LocalizedText;
  countdownParagraph?: LocalizedText;
  heroBackgroundFilename?: string;
  invitationFilename?: string;
  activeLanguages?: AppLocale[];
  maxGuestsPerInvitation?: number;
  showMaxGuests?: boolean;
  showSeating?: boolean;
  showLive?: boolean;
  showReservation?: boolean;
  isSitePublic?: boolean;
  storyTitle?: LocalizedText;
  storySubtitle?: LocalizedText;
  storyParagraph?: LocalizedText;
  timeline?: TimelineItem[];
  events?: EventItem[];
  guests?: GuestItem[];
  liveEvents?: LiveEventItem[];
  // Invitation message per language, with {name} {couple} {date} {link}
  // placeholders (lib/invitationMessage.ts). Unset languages use the default.
  invitationMessage?: LocalizedText;
  createdAt: Date;
}

export interface CelebrationInput {
  title: string;
  type: CelebrationType;
  professionalId: string;
  husband: Spouse;
  wife: Spouse;
}

// Fields edited from the View page's "Celebration Info" tab — kept separate
// from CelebrationInput (the create/edit dialog's title/type/professional/
// spouses) since they're saved independently and don't touch each other.
export interface CelebrationInfoInput {
  title: string;
  celebrationDate?: Date;
  headline?: LocalizedText;
  quote?: LocalizedText;
  countdownParagraph?: LocalizedText;
  activeLanguages: AppLocale[];
  maxGuestsPerInvitation?: number;
  showMaxGuests: boolean;
  showSeating: boolean;
  showLive: boolean;
  showReservation: boolean;
  isSitePublic: boolean;
}

// Fields edited from the View page's "Story" tab — the narrative fields,
// separate from the timeline list below.
export interface CelebrationStoryInput {
  storyTitle?: LocalizedText;
  storySubtitle?: LocalizedText;
  storyParagraph?: LocalizedText;
}

async function celebrationsCollection(): Promise<Collection<Celebration>> {
  const db = await getDb();
  return db.collection<Celebration>(CELEBRATIONS_COLLECTION);
}

export async function ensureCelebrationIndexes(): Promise<void> {
  const col = await celebrationsCollection();
  await col.createIndex({ guid: 1 }, { unique: true });
}

export async function listCelebrations(): Promise<Celebration[]> {
  const col = await celebrationsCollection();
  return col.find().sort({ title: 1 }).toArray();
}

export async function getCelebrationById(id: string): Promise<Celebration | null> {
  const col = await celebrationsCollection();
  return col.findOne({ _id: new ObjectId(id) });
}

// The public identifier — used by the /api/public/** routes instead of the
// Mongo _id, which is never exposed outside the authenticated admin app.
export async function getCelebrationByGuid(guid: string): Promise<Celebration | null> {
  const col = await celebrationsCollection();
  return col.findOne({ guid });
}

export async function createCelebration(input: CelebrationInput): Promise<Celebration> {
  const doc: Omit<Celebration, "_id"> = {
    ...input,
    guid: randomUUID(),
    activeLanguages: DEFAULT_ACTIVE_LANGUAGES,
    createdAt: new Date(),
  };
  const col = await celebrationsCollection();
  const result = await col.insertOne(doc as Celebration);
  return { ...doc, _id: result.insertedId } as Celebration;
}

export async function updateCelebration(id: string, input: CelebrationInput): Promise<void> {
  const col = await celebrationsCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: input });
}

// Fields edited from the View page's "Couple Info" tab — husband/wife only,
// leaves title/type/professionalId/info fields untouched.
export async function updateCelebrationCouple(
  id: string,
  input: { husband: Spouse; wife: Spouse }
): Promise<void> {
  const col = await celebrationsCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: input });
}

export async function updateCelebrationInfo(
  id: string,
  input: CelebrationInfoInput
): Promise<void> {
  const set: Partial<Celebration> = {
    title: input.title,
    activeLanguages: input.activeLanguages,
    showMaxGuests: input.showMaxGuests,
    showSeating: input.showSeating,
    showLive: input.showLive,
    showReservation: input.showReservation,
    isSitePublic: input.isSitePublic,
  };
  const unset: Partial<Record<
    "celebrationDate" | "headline" | "quote" | "countdownParagraph" | "maxGuestsPerInvitation",
    ""
  >> = {};

  if (input.celebrationDate !== undefined) set.celebrationDate = input.celebrationDate;
  else unset.celebrationDate = "";

  if (input.headline) set.headline = input.headline;
  else unset.headline = "";

  if (input.quote) set.quote = input.quote;
  else unset.quote = "";

  if (input.countdownParagraph) set.countdownParagraph = input.countdownParagraph;
  else unset.countdownParagraph = "";

  if (input.maxGuestsPerInvitation !== undefined) set.maxGuestsPerInvitation = input.maxGuestsPerInvitation;
  else unset.maxGuestsPerInvitation = "";

  const col = await celebrationsCollection();
  await col.updateOne(
    { _id: new ObjectId(id) },
    Object.keys(unset).length ? { $set: set, $unset: unset } : { $set: set }
  );
}

// Separate from updateCelebrationInfo() the same way setProfessionalLogo()
// is separate from updateProfessional() — the filename is only known after
// the file has actually been written to disk (see the Server Action), so
// it can't be part of the plain CelebrationInfoInput $set/$unset above.
export async function setCelebrationHeroBackground(id: string, filename: string): Promise<void> {
  const col = await celebrationsCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { heroBackgroundFilename: filename } });
}

// Same reasoning as setCelebrationHeroBackground above — the filename is
// only known after the file's been written to disk.
export async function setCelebrationInvitation(id: string, filename: string): Promise<void> {
  const col = await celebrationsCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { invitationFilename: filename } });
}

export async function updateCelebrationStory(
  id: string,
  input: CelebrationStoryInput
): Promise<void> {
  const set: Partial<Celebration> = {};
  const unset: Partial<Record<"storyTitle" | "storySubtitle" | "storyParagraph", "">> = {};

  if (input.storyTitle) set.storyTitle = input.storyTitle;
  else unset.storyTitle = "";

  if (input.storySubtitle) set.storySubtitle = input.storySubtitle;
  else unset.storySubtitle = "";

  if (input.storyParagraph) set.storyParagraph = input.storyParagraph;
  else unset.storyParagraph = "";

  const col = await celebrationsCollection();
  await col.updateOne(
    { _id: new ObjectId(id) },
    Object.keys(unset).length ? { $set: set, $unset: unset } : { $set: set }
  );
}

async function setCelebrationTimeline(id: string, timeline: TimelineItem[]): Promise<void> {
  const col = await celebrationsCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { timeline } });
}

// Timeline items live as a plain array on the Celebration document (not
// their own collection) — small, per-celebration lists, so add/update/delete
// all read-modify-write the whole array rather than using Mongo's
// positional array operators. Simple and correct at this scale; revisit
// only if timelines grow large enough for that to matter.
export async function addTimelineItem(
  id: string,
  item: Omit<TimelineItem, "id">
): Promise<TimelineItem> {
  const celebration = await getCelebrationById(id);
  const newItem: TimelineItem = { id: new ObjectId().toString(), ...item };
  await setCelebrationTimeline(id, [...(celebration?.timeline ?? []), newItem]);
  return newItem;
}

export async function updateTimelineItem(
  id: string,
  itemId: string,
  item: Omit<TimelineItem, "id">
): Promise<void> {
  const celebration = await getCelebrationById(id);
  const timeline = (celebration?.timeline ?? []).map((existing) =>
    existing.id === itemId ? { id: itemId, ...item } : existing
  );
  await setCelebrationTimeline(id, timeline);
}

export async function deleteTimelineItem(id: string, itemId: string): Promise<void> {
  const celebration = await getCelebrationById(id);
  const timeline = (celebration?.timeline ?? []).filter((item) => item.id !== itemId);
  await setCelebrationTimeline(id, timeline);
}

async function setCelebrationEvents(id: string, events: EventItem[]): Promise<void> {
  const col = await celebrationsCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { events } });
}

// Same read-modify-write-the-whole-array approach as the timeline above —
// see that comment for why.
export async function addEventItem(
  id: string,
  item: Omit<EventItem, "id">
): Promise<EventItem> {
  const celebration = await getCelebrationById(id);
  const newItem: EventItem = { id: new ObjectId().toString(), ...item };
  await setCelebrationEvents(id, [...(celebration?.events ?? []), newItem]);
  return newItem;
}

export async function updateEventItem(
  id: string,
  itemId: string,
  item: Omit<EventItem, "id">
): Promise<void> {
  const celebration = await getCelebrationById(id);
  // The event form doesn't carry the seating layout — keep it.
  const events = (celebration?.events ?? []).map((existing) =>
    existing.id === itemId
      ? {
          ...(existing.seatingLayout ? { seatingLayout: existing.seatingLayout } : {}),
          ...item,
          id: itemId,
        }
      : existing
  );
  await setCelebrationEvents(id, events);
}

// Saves an event's whole seating layout (from the layout editor). Atomic,
// touches only that event's seatingLayout.
export async function updateEventSeatingLayout(
  id: string,
  eventId: string,
  elements: SeatingLayoutElement[]
): Promise<void> {
  const col = await celebrationsCollection();
  await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { "events.$[e].seatingLayout": elements } },
    { arrayFilters: [{ "e.id": eventId }] }
  );
}

// Replaces one guest's table assignments. Atomic, touches only that field.
export async function updateGuestTableAssignments(
  id: string,
  guestId: string,
  assignments: GuestTableAssignment[]
): Promise<void> {
  const col = await celebrationsCollection();
  await col.updateOne(
    { _id: new ObjectId(id) },
    assignments.length
      ? { $set: { "guests.$[g].tableAssignments": assignments } }
      : { $unset: { "guests.$[g].tableAssignments": "" } },
    { arrayFilters: [{ "g.id": guestId }] }
  );
}

export async function deleteEventItem(id: string, itemId: string): Promise<void> {
  const celebration = await getCelebrationById(id);
  const events = (celebration?.events ?? []).filter((item) => item.id !== itemId);
  await setCelebrationEvents(id, events);
}

async function setCelebrationGuests(id: string, guests: GuestItem[]): Promise<void> {
  const col = await celebrationsCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { guests } });
}

// Same read-modify-write-the-whole-array approach as timeline/events above.
export async function addGuestItem(
  id: string,
  item: Omit<GuestItem, "id">
): Promise<GuestItem> {
  const celebration = await getCelebrationById(id);
  const newItem: GuestItem = { id: new ObjectId().toString(), ...item };
  await setCelebrationGuests(id, [...(celebration?.guests ?? []), newItem]);
  return newItem;
}

// Replaces the guest's own fields wholesale (callers pass the complete set —
// the RSVP route relies on that to clear confirmationDate vs. deniedDate),
// but always keeps the invitation fields, which neither the guest form nor
// the RSVP route carry.
export async function updateGuestItem(
  id: string,
  itemId: string,
  item: Omit<GuestItem, "id">
): Promise<void> {
  const celebration = await getCelebrationById(id);
  const guests = (celebration?.guests ?? []).map((existing) => {
    if (existing.id !== itemId) return existing;
    const kept: Partial<GuestItem> = {};
    for (const key of GUEST_INVITE_FIELDS) {
      if (existing[key] !== undefined) (kept as Record<string, unknown>)[key] = existing[key];
    }
    return { ...kept, ...item, id: itemId };
  });
  await setCelebrationGuests(id, guests);
}

export async function deleteGuestItem(id: string, itemId: string): Promise<void> {
  const celebration = await getCelebrationById(id);
  const guests = (celebration?.guests ?? []).filter((item) => item.id !== itemId);
  await setCelebrationGuests(id, guests);
}

async function setCelebrationLiveEvents(id: string, liveEvents: LiveEventItem[]): Promise<void> {
  const col = await celebrationsCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { liveEvents } });
}

// Same read-modify-write-the-whole-array approach as timeline/events/guests
// above. No updateLiveEventItem() — the Live Events tab is add(seed-only,
// no admin form)/delete, never edit (see CLAUDE.md "Celebrations" →
// "Live Events tab").
// Atomic $push (not read-modify-write like the other list helpers): guests
// post Live Events photos concurrently from the public site, and two
// simultaneous read-modify-writes would drop one of them.
export async function addLiveEventItem(
  id: string,
  item: Omit<LiveEventItem, "id">
): Promise<LiveEventItem> {
  const newItem: LiveEventItem = { id: new ObjectId().toString(), ...item };
  const col = await celebrationsCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $push: { liveEvents: newItem } });
  return newItem;
}

export async function deleteLiveEventItem(id: string, itemId: string): Promise<void> {
  const celebration = await getCelebrationById(id);
  const liveEvents = (celebration?.liveEvents ?? []).filter((item) => item.id !== itemId);
  await setCelebrationLiveEvents(id, liveEvents);
}

export async function deleteCelebration(id: string): Promise<void> {
  const col = await celebrationsCollection();
  await col.deleteOne({ _id: new ObjectId(id) });
}
