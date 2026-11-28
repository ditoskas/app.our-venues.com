import { sendTransactionalEmail } from "./brevo";

// Brevo template for the 2FA code email — configured in the Brevo
// dashboard with dynamic content placeholders for `code`, `year`, and
// `expirationMinutes` (see sendTwoFactorCodeEmail below).
const TWO_FACTOR_TEMPLATE_ID = 1;

// How long a 2FA code stays valid, in minutes — the source of truth
// guestAccess.ts's CODE_TTL_SECONDS derives from, so the email's stated
// expiry and the code's actual expiry can never drift apart.
export const TWO_FACTOR_CODE_EXPIRATION_MINUTES = 10;

export async function sendTwoFactorCodeEmail(
  email: string,
  code: string
): Promise<void> {
  await sendTransactionalEmail({
    to: [{ email }],
    templateId: TWO_FACTOR_TEMPLATE_ID,
    params: {
      code,
      year: new Date().getFullYear(),
      expirationMinutes: TWO_FACTOR_CODE_EXPIRATION_MINUTES,
    },
  });
}
