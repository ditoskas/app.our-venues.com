import { ObjectId, type Db } from "mongodb";
import type { Celebration, GuestItem } from "../celebrations";
import type { Migration } from "./index";

// A real, reachable test guest on the public "Nikos & Eleni Wedding" so the
// invitation flow (WhatsApp/Viber → personal link → RSVP) can be tried end to
// end. Unconfirmed. Added only if the celebration exists and no guest with
// this email is on it yet. The phone is deliberately in the 0030… format.
const GUEST: Omit<GuestItem, "id"> = {
  name: "Dimitris Toskas",
  phone: "00306938699188",
  email: "ditoskas@gmail.com",
  expectedAttendees: 2,
  locale: "el",
};

export const testGuestDimitris: Migration = {
  id: "20261128-02-test-guest-dimitris",
  description: 'Add the test guest "Dimitris Toskas" to "Nikos & Eleni Wedding"',
  async up(db: Db) {
    const res = await db.collection<Celebration>("Celebrations").updateOne(
      { title: "Nikos & Eleni Wedding", "guests.email": { $ne: GUEST.email } },
      { $push: { guests: { id: new ObjectId().toString(), ...GUEST } } }
    );
    return res.modifiedCount
      ? `added "${GUEST.name}" to "Nikos & Eleni Wedding"`
      : `skipped — the celebration doesn't exist or already has this guest`;
  },
};
