import { Collection, Filter, ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
import { getDb } from "./mongodb";
import type { AppLocale } from "@/i18n/routing";

export const CELEBRATIONS_COLLECTION = "Celebrations";

export type CelebrationType = "Marriage" | "Christening";

// Only meaningful (and only editable in the admin form) when
// type === "Christening" — drives the frontend's guest-facing theme (a
// "boy"/"girl" palette instead of the default Marriage one). Left unset for
// a Christening whose gender hasn't been chosen yet, and for every Marriage.
export type ChildGender = "Boy" | "Girl";

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

// Read-side default for Celebration.isConfirmationRequiredOnLiveEvents —
// centralized (unlike the other booleans on Celebration, which each just
// inline `?? false` at their read sites) since this one defaults the
// opposite way (`?? true`), and getting that backwards would silently
// publish guest photos without review.
export function isLiveEventConfirmationRequired(celebration: Celebration): boolean {
  return celebration.isConfirmationRequiredOnLiveEvents ?? true;
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

// One shape/piece in an event's seating layout (see EventItem.seatingLayout
// below) — a round or rectangular table (has `code` + `maxPeople`, no
// `label`) or a free-standing placeholder like "Music Band"/"Dance Floor"
// (has `label`, no `code`/`maxPeople`). `x`/`y`/`width`/`height` are plain
// pixels on the layout editor's canvas, top-left origin — there's no real
// venue scale/units, this is a rough visual floor plan, not a CAD drawing.
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
  // Gates the "Configure Layout" action on the admin Events tab (see
  // EventsManager.tsx) — only events opted into seating get a table/seat
  // layout designer. Defaults to `false` when unset (`?? false`, same
  // "may not exist on an older document" pattern as Celebration's own
  // booleans), unlike Celebration.isConfirmationRequiredOnLiveEvents which
  // defaults the other way.
  hasSeating?: boolean;
  seatingLayout?: SeatingLayoutElement[];
}

// One guest's table assignment for one event — a celebration can have more
// than one event with seating (e.g. ceremony + reception), so a guest can
// hold at most one assignment per `eventId` (enforced by
// updateGuestTableAssignments() below replacing the whole array, not by a
// DB constraint). `tableId` points at a SeatingLayoutElement.id on that
// event's seatingLayout — not validated against the element still existing/
// still being a table (rather than a placeholder) at read time; a stale
// reference (table deleted or changed back to a placeholder after being
// assigned) just stops resolving to a visible table, same "orphaned
// reference" tolerance as LiveEventItem.eventId/uploadedByGuestId.
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
  tableAssignments?: GuestTableAssignment[];
}

// Seats a guest's whole party takes up at a table — confirmedAttendees once
// RSVP'd, falling back to expectedAttendees, or just 1 (the guest alone) if
// neither was ever set. Used by getTableReservedSeats() below to turn table
// assignments into an occupancy count.
export function guestSeatCount(guest: GuestItem): number {
  return guest.confirmedAttendees ?? guest.expectedAttendees ?? 1;
}

// How many seats are currently reserved at one table for one event —
// derived from GuestItem.tableAssignments rather than stored on the
// SeatingLayoutElement itself, so it can never drift out of sync with the
// guest list (see AssignGuestTableForm.tsx and EventSeatingLayoutEditor.tsx,
// which both display this next to the table's maxPeople capacity).
export function getTableReservedSeats(
  guests: GuestItem[],
  eventId: string,
  tableId: string
): number {
  return guests
    .filter((guest) =>
      guest.tableAssignments?.some(
        (assignment) => assignment.eventId === eventId && assignment.tableId === tableId
      )
    )
    .reduce((sum, guest) => sum + guestSeatCount(guest), 0);
}

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
// "pending" needs a moderator to publish (or deny) it via the admin Live
// Events tab's "Pending Requests" section before it's treated as approved
// content; "published" is approved and shown in that tab's "Live Feed"
// section (see publishLiveEventItem()/denyLiveEventItem() below); "denied"
// is rejected and shown in neither — the record is kept (not deleted) for
// the audit trail via LogActions, same reasoning GuestItem keeps a
// deniedDate rather than removing a denied RSVP. Set at creation time by
// whichever caller adds the item — see
// Celebration.isConfirmationRequiredOnLiveEvents below and
// POST /api/public/celebration/{guid}/live-events. The public feed route
// (GET .../live-events) still returns every item regardless of status —
// only the admin tab currently filters by it.
export type LiveEventStatus = "pending" | "published" | "denied";

export interface LiveEventItem {
  id: string;
  eventId: string;
  imageFilename: string;
  uploadedByGuestId: string;
  uploadedAt: Date;
  title: string;
  description?: string;
  status: LiveEventStatus;
  // When this item's status last became "published" — set either
  // immediately at creation (confirmation not required, see
  // isLiveEventConfirmationRequired()) or when a moderator approves a
  // pending item (publishLiveEventItem()). Distinct from uploadedAt (when
  // the guest originally submitted it) so the admin's "Live Feed" section
  // can sort by actual publish time, not submission time — the two only
  // coincide when confirmation wasn't required.
  publishedAt?: Date;
}

export interface Celebration {
  _id: ObjectId;
  guid: string;
  title: string;
  type: CelebrationType;
  professionalId: string;
  price: number;
  // The subdomain label this celebration's public site is (or will be)
  // served from under a base domain chosen by `type` — see
  // CELEBRATION_BASE_DOMAINS/getCelebrationBaseDomain() in lib/constants.ts.
  // E.g. "dimitris-maria" on a Marriage becomes
  // "dimitris-maria.o-gamos-mas.com". Just the label, no dots/base domain.
  // Optional: not every celebration has one assigned yet. Must be unique
  // among currently-existing celebrations when set — enforced both by the
  // partial unique index on this field (ensureCelebrationIndexes()) and by
  // findCelebrationBySubdomain() at the app layer, same defense-in-depth
  // pattern as guid's unique index.
  subdomain?: string;
  husband: Spouse;
  wife: Spouse;
  childGender?: ChildGender;
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
  // Gates the status a guest-submitted Live Events photo is created with —
  // see LiveEventStatus above and POST
  // /api/public/celebration/{guid}/live-events. Defaults to `true` (via
  // `?? true`, same "may not exist on an older document" pattern the other
  // booleans on this type use with `?? false`) so confirmation is required
  // unless a celebration explicitly opts out.
  isConfirmationRequiredOnLiveEvents?: boolean;
  storyTitle?: LocalizedText;
  storySubtitle?: LocalizedText;
  storyParagraph?: LocalizedText;
  timeline?: TimelineItem[];
  events?: EventItem[];
  guests?: GuestItem[];
  liveEvents?: LiveEventItem[];
  createdAt: Date;
}

export interface CelebrationInput {
  title: string;
  type: CelebrationType;
  professionalId: string;
  price: number;
  subdomain?: string;
  husband: Spouse;
  wife: Spouse;
}

// Fields edited from the View page's "Celebration Info" tab — kept separate
// from CelebrationInput (the create/edit dialog's title/type/professional/
// spouses) since they're saved independently and don't touch each other.
export interface CelebrationInfoInput {
  title: string;
  childGender?: ChildGender;
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
  isConfirmationRequiredOnLiveEvents: boolean;
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
  // Compound + partial index: uniqueness is scoped per `type`, not global —
  // the subdomain resolves under a different base domain per type (see
  // getCelebrationBaseDomain() in lib/constants.ts), so a Marriage and a
  // Christening can share the same subdomain label without colliding (they
  // resolve to different hostnames). The partial filter means only
  // documents that actually have a subdomain set compete for uniqueness, so
  // any number of celebrations with no subdomain yet can coexist (see
  // Celebration.subdomain above).
  await col.createIndex(
    { type: 1, subdomain: 1 },
    { unique: true, partialFilterExpression: { subdomain: { $type: "string" } } }
  );
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

// App-layer uniqueness check backing the compound partial unique index
// above — used by the create/edit Server Actions to return a friendly
// "subdomain taken" error before the DB constraint would reject the write.
// Scoped by `type` since the subdomain resolves under a different base
// domain per type (see ensureCelebrationIndexes() above) — a Marriage and a
// Christening may legitimately share the same subdomain label. `excludeId`
// lets an update re-save a celebration's own unchanged subdomain without
// flagging itself as a duplicate (same shape as GuestsManager's
// findDuplicateGuestContact).
export async function findCelebrationBySubdomain(
  subdomain: string,
  type: CelebrationType,
  excludeId?: string
): Promise<Celebration | null> {
  const col = await celebrationsCollection();
  const filter: Filter<Celebration> = { subdomain, type };
  if (excludeId) {
    filter._id = { $ne: new ObjectId(excludeId) };
  }
  return col.findOne(filter);
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
  // subdomain is the one optional field on CelebrationInput — split out so
  // clearing it in the edit form actually removes it (a plain `$set` with
  // `subdomain: undefined` would just leave the previous value in place,
  // since the driver drops undefined-valued keys before sending the update).
  const { subdomain, ...rest } = input;
  const col = await celebrationsCollection();
  await col.updateOne(
    { _id: new ObjectId(id) },
    subdomain ? { $set: { ...rest, subdomain } } : { $set: rest, $unset: { subdomain: "" } }
  );
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
    isConfirmationRequiredOnLiveEvents: input.isConfirmationRequiredOnLiveEvents,
  };
  const unset: Partial<Record<
    "celebrationDate" | "headline" | "quote" | "countdownParagraph" | "maxGuestsPerInvitation" | "childGender",
    ""
  >> = {};

  if (input.childGender) set.childGender = input.childGender;
  else unset.childGender = "";

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
  const events = (celebration?.events ?? []).map((existing) =>
    existing.id === itemId ? { id: itemId, ...item } : existing
  );
  await setCelebrationEvents(id, events);
}

export async function deleteEventItem(id: string, itemId: string): Promise<void> {
  const celebration = await getCelebrationById(id);
  const events = (celebration?.events ?? []).filter((item) => item.id !== itemId);
  await setCelebrationEvents(id, events);
}

// Saved as one shot from the seating layout editor (celebrations/[id]/events/
// [eventId]/seating-layout/) — the whole elements array replaces whatever
// was there, same "replace, don't patch" simplicity as the other
// read-modify-write helpers in this file. Touches only this one event's
// seatingLayout field, leaving its title/hasSeating/etc. untouched.
export async function updateEventSeatingLayout(
  id: string,
  itemId: string,
  elements: SeatingLayoutElement[]
): Promise<void> {
  const celebration = await getCelebrationById(id);
  const events = (celebration?.events ?? []).map((item) =>
    item.id === itemId ? { ...item, seatingLayout: elements } : item
  );
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

export async function updateGuestItem(
  id: string,
  itemId: string,
  item: Omit<GuestItem, "id">
): Promise<void> {
  const celebration = await getCelebrationById(id);
  const guests = (celebration?.guests ?? []).map((existing) =>
    existing.id === itemId ? { id: itemId, ...item } : existing
  );
  await setCelebrationGuests(id, guests);
}

export async function deleteGuestItem(id: string, itemId: string): Promise<void> {
  const celebration = await getCelebrationById(id);
  const guests = (celebration?.guests ?? []).filter((item) => item.id !== itemId);
  await setCelebrationGuests(id, guests);
}

// Replaces one guest's whole tableAssignments array in one shot — same
// "replace, don't patch" shape as updateEventSeatingLayout() above, and
// touches only this one field, leaving the rest of the guest (name/phone/
// RSVP fields) untouched. Called from the Guests tab's "Assign to table"
// dialog (AssignGuestTableForm.tsx), separate from updateGuestItem() so
// saving the regular guest form doesn't need to know about seating at all —
// updateGuestItemAction() still has to carry the existing value forward
// itself when it replaces the whole item, same as events do for
// seatingLayout.
export async function updateGuestTableAssignments(
  id: string,
  guestId: string,
  assignments: GuestTableAssignment[]
): Promise<void> {
  const celebration = await getCelebrationById(id);
  const guests = (celebration?.guests ?? []).map((item) =>
    item.id === guestId
      ? { ...item, tableAssignments: assignments.length ? assignments : undefined }
      : item
  );
  await setCelebrationGuests(id, guests);
}

async function setCelebrationLiveEvents(id: string, liveEvents: LiveEventItem[]): Promise<void> {
  const col = await celebrationsCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { liveEvents } });
}

// Same read-modify-write-the-whole-array approach as timeline/events/guests
// above. No admin create/edit — only add (seed or guest-submitted via
// POST /api/public/celebration/{guid}/live-events, see PUBLIC-API.md),
// moderate (publishLiveEventItem()/denyLiveEventItem() below), and delete.
export async function addLiveEventItem(
  id: string,
  item: Omit<LiveEventItem, "id">
): Promise<LiveEventItem> {
  const celebration = await getCelebrationById(id);
  const newItem: LiveEventItem = { id: new ObjectId().toString(), ...item };
  await setCelebrationLiveEvents(id, [...(celebration?.liveEvents ?? []), newItem]);
  return newItem;
}

export async function deleteLiveEventItem(id: string, itemId: string): Promise<void> {
  const celebration = await getCelebrationById(id);
  const liveEvents = (celebration?.liveEvents ?? []).filter((item) => item.id !== itemId);
  await setCelebrationLiveEvents(id, liveEvents);
}

// Moves a "pending" item into the admin Live Events tab's "Live Feed"
// section — sets publishedAt to now, which is what that section sorts by.
export async function publishLiveEventItem(id: string, itemId: string): Promise<void> {
  const celebration = await getCelebrationById(id);
  const publishedAt = new Date();
  const liveEvents = (celebration?.liveEvents ?? []).map((item) =>
    item.id === itemId ? { ...item, status: "published" as const, publishedAt } : item
  );
  await setCelebrationLiveEvents(id, liveEvents);
}

// Rejects a "pending" item — kept as a "denied" record (not deleted) for
// the LogActions audit trail, same reasoning GuestItem keeps a deniedDate
// rather than removing a denied RSVP. Shown in neither the "Pending
// Requests" nor "Live Feed" admin sections.
export async function denyLiveEventItem(id: string, itemId: string): Promise<void> {
  const celebration = await getCelebrationById(id);
  const liveEvents = (celebration?.liveEvents ?? []).map((item) =>
    item.id === itemId ? { ...item, status: "denied" as const } : item
  );
  await setCelebrationLiveEvents(id, liveEvents);
}

export async function deleteCelebration(id: string): Promise<void> {
  const col = await celebrationsCollection();
  await col.deleteOne({ _id: new ObjectId(id) });
}
