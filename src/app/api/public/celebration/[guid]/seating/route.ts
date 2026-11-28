import { NextResponse } from "next/server";
import { getCelebrationByGuid, guestSeatCount } from "@/lib/celebrations";
import { verifyGuestSessionToken } from "@/lib/guestSession";

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

// Public, unauthenticated — see PUBLIC-API.md. Backs the frontend's
// Reception Seating page: which guests sit at which table, for the "click
// a table, see who's there" panel, plus (only when a valid guest session
// token is sent) that guest's own table(s), for the "mark my table"
// highlight. Gated on `isSitePublic` (unlike the main celebration/events
// route) since, unlike floor-plan geometry, this returns guest names — see
// PUBLIC-API.md "Deliberately excluded" for the general rule this is a
// scoped, deliberate exception to.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ guid: string }> }
) {
  const { guid } = await params;
  const celebration = await getCelebrationByGuid(guid);
  if (!celebration || !celebration.isSitePublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const guests = celebration.guests ?? [];

  // eventId+tableId -> assigned guests (name + confirmed attendee count).
  // Ids are Mongo ObjectId hex strings / crypto.randomUUID() — never
  // contain ":" — so this composite key can't collide across different
  // (eventId, tableId) pairs.
  const guestsByTable = new Map<string, { name: string; attendees: number }[]>();
  for (const guest of guests) {
    for (const assignment of guest.tableAssignments ?? []) {
      const key = `${assignment.eventId}:${assignment.tableId}`;
      const entries = guestsByTable.get(key) ?? [];
      entries.push({ name: guest.name, attendees: guestSeatCount(guest) });
      guestsByTable.set(key, entries);
    }
  }

  // Only tables that actually have someone assigned — nothing to say about
  // an empty one, and it keeps the response from listing every table id
  // that already exists in the main celebration route's seatingLayout.
  const tables = Array.from(guestsByTable.entries()).map(([key, guests]) => {
    const [eventId, tableId] = key.split(":");
    return { eventId, tableId, guests };
  });

  let myAssignments: { eventId: string; tableId: string }[] = [];
  const session = await verifyGuestSessionToken(getBearerToken(request));
  if (session && session.celebrationId === celebration._id.toString()) {
    const guest = guests.find((g) => g.id === session.guestId);
    if (guest) {
      myAssignments = (guest.tableAssignments ?? []).map((a) => ({
        eventId: a.eventId,
        tableId: a.tableId,
      }));
    }
  }

  return NextResponse.json({ tables, myAssignments });
}
