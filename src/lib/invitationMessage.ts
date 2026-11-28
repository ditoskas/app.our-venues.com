// Client-safe helpers for sending invitations from the Guests tab: the
// message text, phone numbers in the format the messaging apps need, and the
// app links. See CLAUDE.md "Guest invitations".

export const INVITE_PLACEHOLDERS = ["{name}", "{couple}", "{date}", "{link}"] as const;

export interface InviteMessageValues {
  name: string;
  couple: string;
  date: string;
  link: string;
}

export function renderInvitationMessage(template: string, values: InviteMessageValues): string {
  return template
    .replaceAll("{name}", values.name)
    .replaceAll("{couple}", values.couple)
    .replaceAll("{date}", values.date)
    .replaceAll("{link}", values.link);
}

// The guest's personal link to the public site (permanent link + invite code).
export function personalInviteLink(origin: string, guid: string, inviteToken: string): string {
  return `${origin.replace(/\/+$/, "")}/celebrations/${guid}?invite=${encodeURIComponent(inviteToken)}`;
}

// International digits without "+" (e.g. "306944111222"), as wa.me expects,
// or null when the number can't be understood. Guests' phones are free text:
//   "+30 694 411 1222", "0030...", "(+39) 320-333-4444" → country code kept
//   a 10-digit Greek number (69…, 2…)                    → "30" prepended
//   anything else without a country code                → null (flagged in the UI)
export function normalizePhone(raw: string | undefined, defaultCountryCode = "30"): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  let digits = trimmed.replace(/[^\d]/g, "");
  if (trimmed.startsWith("+")) {
    // already international
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (defaultCountryCode === "30" && /^(69\d{8}|2\d{9})$/.test(digits)) {
    digits = `30${digits}`;
  } else {
    return null;
  }
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

// Two phone numbers are the same person when they're identical as typed, or
// normalize to the same international number ("+30 694 411 1222",
// "00306944111222" and "6944111222" all match). Used wherever a guest is
// looked up by phone (RSVP, sign-in, duplicate check).
export function samePhone(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  if (a.trim() === b.trim()) return true;
  const na = normalizePhone(a);
  return !!na && na === normalizePhone(b);
}

// Opens a WhatsApp chat with that number, message pre-filled (phone app,
// WhatsApp Web or desktop).
export function whatsappUrl(phoneDigits: string, text: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`;
}

// Viber can't open a specific chat with pre-filled text, so its button opens
// Viber's own "forward" screen with the message and the sender picks the
// contact there (the UI also copies the text to the clipboard).
export function viberForwardUrl(text: string): string {
  return `viber://forward?text=${encodeURIComponent(text)}`;
}
