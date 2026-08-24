"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2, Check, X } from "lucide-react";

export default function DeleteCelebrationButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  const t = useTranslations("celebrations");
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        title={t("delete")}
        aria-label={t("delete")}
        className="text-muted transition-colors hover:text-red-600"
      >
        <Trash2 size={16} />
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-xs text-muted">{t("deleteConfirm")}</span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => action())}
        title={t("confirmAction")}
        aria-label={t("confirmAction")}
        className="text-red-600 hover:opacity-75 disabled:opacity-50"
      >
        <Check size={16} />
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        title={t("cancel")}
        aria-label={t("cancel")}
        className="text-muted hover:text-foreground"
      >
        <X size={16} />
      </button>
    </span>
  );
}
