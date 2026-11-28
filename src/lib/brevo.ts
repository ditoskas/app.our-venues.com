// Thin client for Brevo's transactional email API — "send a message with
// dynamic content" (https://developers.brevo.com/docs/send-a-transactional-email#send-a-message-with-dynamic-content):
// POST /v3/smtp/email with a templateId + params, letting the template
// (configured in the Brevo dashboard) own the subject/body/sender unless
// overridden here.

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export interface BrevoRecipient {
  email: string;
  name?: string;
}

export interface SendTransactionalEmailInput {
  to: BrevoRecipient[];
  templateId: number;
  params?: Record<string, unknown>;
  sender?: BrevoRecipient;
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not set");
  }

  const body: Record<string, unknown> = {
    to: input.to,
    templateId: input.templateId,
  };
  if (input.params) body.params = input.params;
  if (input.sender) body.sender = input.sender;

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Brevo send failed (${response.status} ${response.statusText}): ${detail}`
    );
  }
}
