import { getTranslations } from "next-intl/server";
import { formatMB } from "./plans";
import { StorageQuotaExceededError } from "./uploads";

export { formatMB };

// For Server Actions: returns the translated "not enough storage" message if
// `err` is a StorageQuotaExceededError, or null so the caller can rethrow /
// handle any other error as before.
export async function storageQuotaErrorMessage(err: unknown): Promise<string | null> {
  if (!(err instanceof StorageQuotaExceededError)) return null;
  const t = await getTranslations("common");
  return t("storageQuotaExceeded", {
    used: formatMB(err.usedBytes),
    quota: formatMB(err.quotaBytes),
    incoming: formatMB(err.incomingBytes),
  });
}
