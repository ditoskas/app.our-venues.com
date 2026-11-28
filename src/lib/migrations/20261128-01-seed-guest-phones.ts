import type { Db } from "mongodb";
import type { Migration } from "./index";

// The demo guests seeded without a phone couldn't be sent a WhatsApp
// invitation. Gives each one a number — in different accepted formats on
// purpose, so the phone normalization is exercised: "+39…" (international),
// "69…" (plain Greek 10 digits) and "0030…" (00 prefix).
// Only fills a missing phone; never overwrites one.
const PHONES: { celebration: string; guest: string; phone: string }[] = [
  { celebration: "Dimitris & Maria Marriage", guest: "Giovanni Rossi", phone: "+393205556666" },
  { celebration: "Nikos & Eleni Wedding", guest: "Katerina Vlachou", phone: "6945550002" },
  { celebration: "Christening of Alexandros", guest: "Family Karras", phone: "00306972220003" },
];

export const seedGuestPhones: Migration = {
  id: "20261128-01-seed-guest-phones",
  description: "Give the demo guests without a phone a number, so every guest can get a WhatsApp invitation",
  async up(db: Db) {
    let updated = 0;
    for (const { celebration, guest, phone } of PHONES) {
      const res = await db.collection("Celebrations").updateOne(
        { title: celebration },
        { $set: { "guests.$[g].phone": phone } },
        { arrayFilters: [{ "g.name": guest, "g.phone": { $exists: false } }] }
      );
      updated += res.modifiedCount;
    }
    return `set the phone of ${updated} demo guest(s)`;
  },
};
