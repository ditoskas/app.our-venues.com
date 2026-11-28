import { ObjectId, type Db } from "mongodb";
import type {
  Celebration,
  GuestTableAssignment,
  SeatingLayoutElement,
} from "../celebrations";
import type { Migration } from "./index";

// Demo data for the seating feature (layout designer, "Assign table", and the
// public Reception Seating page): a reception floor plan on the two demo
// weddings, with their guests seated. Nikos & Eleni is the public one, so its
// Reception Seating page shows names too; the test guest Dimitris Toskas sits
// at T3 there ("your table" after opening the personal invitation link).
//
// Never overwrites real data: an event that already has a layout, or a guest
// who already has a table, is left alone. Guests who declined get no table.

// 1400×900 editor canvas: head table at the top, dance floor in the middle,
// band top-right, four round tables on each side.
function buildLayout(): { elements: SeatingLayoutElement[]; tableId: Record<string, string> } {
  const id = () => new ObjectId().toString();
  const tableId: Record<string, string> = {};
  const elements: SeatingLayoutElement[] = [
    { id: id(), type: "table-rect", x: 550, y: 60, width: 300, height: 70, code: "H", maxPeople: 10 },
    { id: id(), type: "placeholder", x: 560, y: 360, width: 280, height: 170, label: "Dance Floor" },
    { id: id(), type: "placeholder", x: 1150, y: 60, width: 180, height: 60, label: "Music Band" },
  ];
  tableId.H = elements[0].id;
  const spots: [number, number][] = [
    [150, 230], [330, 230], [150, 600], [330, 600],
    [970, 230], [1150, 230], [970, 600], [1150, 600],
  ];
  spots.forEach(([x, y], i) => {
    const code = `T${i + 1}`;
    const el: SeatingLayoutElement = { id: id(), type: "table-circle", x, y, width: 100, height: 100, code, maxPeople: 8 };
    tableId[code] = el.id;
    elements.push(el);
  });
  return { elements, tableId };
}

const PLANS: { celebration: string; showSeating: boolean; seats: Record<string, string> }[] = [
  {
    celebration: "Nikos & Eleni Wedding",
    showSeating: true,
    seats: {
      "Andreas Michailidis": "T1",
      "Yannis Doukas": "T1",
      "Katerina Vlachou": "T2",
      "Dimitris Toskas": "T3",
    },
  },
  {
    celebration: "Dimitris & Maria Marriage",
    showSeating: true,
    seats: {
      "Marco Rossi": "T1",
      "Sofia Moretti": "T1",
      "Giovanni Rossi": "T2",
      "Pietro Bianchi": "T3",
    },
  },
];

export const seatingDemo: Migration = {
  id: "20261128-03-seating-demo",
  description: "Seating demo data: reception floor plans and table assignments on the demo weddings",
  async up(db: Db) {
    const col = db.collection<Celebration>("Celebrations");
    const done: string[] = [];

    for (const plan of PLANS) {
      const celebration = await col.findOne({ title: plan.celebration });
      const reception = celebration?.events?.find((e) => e.area === "Reception");
      if (!celebration || !reception) continue;

      let tableId: Record<string, string> = {};
      if (!reception.seatingLayout?.length) {
        const layout = buildLayout();
        tableId = layout.tableId;
        await col.updateOne(
          { _id: celebration._id },
          { $set: { "events.$[e].hasSeating": true, "events.$[e].seatingLayout": layout.elements } },
          { arrayFilters: [{ "e.id": reception.id }] }
        );
      } else {
        // Existing layout: seat guests only at tables with matching codes.
        for (const el of reception.seatingLayout) if (el.code) tableId[el.code] = el.id;
      }
      if (plan.showSeating && !celebration.showSeating) {
        await col.updateOne({ _id: celebration._id }, { $set: { showSeating: true } });
      }

      let seated = 0;
      for (const [guestName, code] of Object.entries(plan.seats)) {
        const guest = celebration.guests?.find((g) => g.name === guestName);
        const table = tableId[code];
        if (!guest || !table || guest.deniedDate || guest.tableAssignments?.length) continue;
        const assignment: GuestTableAssignment = { eventId: reception.id, tableId: table };
        const res = await col.updateOne(
          { _id: celebration._id },
          { $set: { "guests.$[g].tableAssignments": [assignment] } },
          { arrayFilters: [{ "g.id": guest.id, "g.tableAssignments": { $exists: false } }] }
        );
        seated += res.modifiedCount;
      }
      done.push(`${plan.celebration}: ${seated} guest(s) seated`);
    }
    return done.length ? done.join("; ") : "skipped — the demo celebrations don't exist";
  },
};
