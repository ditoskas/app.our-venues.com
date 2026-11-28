import { NextResponse } from "next/server";
import { getCelebrationByGuid, guestSeatCount } from "@/lib/celebrations";
import { bearerToken, verifyGuestToken } from "@/lib/guestAccess";

// Reception Seating — see PUBLIC-API.md. Who sits at which table (names +
// party size), for the "click a table, see who's there" panel, plus — when a
// valid guest token is sent — that guest's own table(s) for the "your table"
// highlight. Unlike the floor plan (on the main celebration route), this
// returns guest names, so it requires `isSitePublic`.
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ guid: string }> }) {
  const { guid } = await params;
  const celebration = await getCelebrationByGuid(guid);
  if (!celebration || !celebration.isSitePublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const guests = celebration.guests ?? [];

  // eventId + tableId → assigned guests. Ids never contain ":".
  const byTable = new Map<string, { name: string; attendees: number }[]>();
  for (const guest of guests) {
    for (const a of guest.tableAssignments ?? []) {
      const key = `${a.eventId}:${a.tableId}`;
      byTable.set(key, [...(byTable.get(key) ?? []), { name: guest.name, attendees: guestSeatCount(guest) }]);
    }
  }
  // Only tables with someone at them.
  const tables = [...byTable.entries()].map(([key, seated]) => {
    const [eventId, tableId] = key.split(":");
    return { eventId, tableId, guests: seated };
  });

  let myAssignments: { eventId: string; tableId: string }[] = [];
  const claims = verifyGuestToken(bearerToken(request));
  if (claims && claims.celebrationId === celebration._id.toString()) {
    const me = guests.find((g) => g.id === claims.guestId);
    myAssignments = (me?.tableAssignments ?? []).map(({ eventId, tableId }) => ({ eventId, tableId }));
  }

  return NextResponse.json({ tables, myAssignments }, { headers: { "Cache-Control": "no-store" } });
}
