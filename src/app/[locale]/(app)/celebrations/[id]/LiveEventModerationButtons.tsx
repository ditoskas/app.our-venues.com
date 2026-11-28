"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";

// Single-click, no two-step confirm (unlike DeleteLiveEventItemButton) —
// publishing or denying a pending item isn't destructive the way deleting
// is: the record stays either way, only its `status` changes (see
// publishLiveEventItem()/denyLiveEventItem() in lib/celebrations.ts).
export default function LiveEventModerationButtons({
  onPublish,
  onDeny,
}: {
  onPublish: () => Promise<void>;
  onDeny: () => Promise<void>;
}) {
  const t = useTranslations("celebrations.liveEvents");
  const [isPending, startTransition] = useTransition();

  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => onPublish())}
        title={t("publish")}
        aria-label={t("publish")}
        className="text-muted transition-colors hover:text-emerald-600 disabled:opacity-50"
      >
        <Check size={16} />
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => onDeny())}
        title={t("deny")}
        aria-label={t("deny")}
        className="text-muted transition-colors hover:text-red-600 disabled:opacity-50"
      >
        <X size={16} />
      </button>
    </span>
  );
}
