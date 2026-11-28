"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Link2, MessageCircle, RefreshCw, Share2, X } from "lucide-react";
import {
  normalizePhone,
  personalInviteLink,
  renderInvitationMessage,
  viberForwardUrl,
  whatsappUrl,
} from "@/lib/invitationMessage";
import { routing } from "@/i18n/routing";
import type { InviteChannel } from "@/lib/celebrations";
import { recordGuestInvitedAction, regenerateGuestInviteAction } from "./actions";
import type { SerializedGuestItem } from "./GuestItemForm";
import type { InviteContext } from "./GuestsManager";

const noopSubscribe = () => () => {};

// The sending buttons for one guest. Each one opens the sender's own
// WhatsApp / Viber / phone share sheet with the personal message, then
// records the send — the apps can't report whether the message was really
// sent, so "invited" means "the message was opened for this guest".
export default function GuestInviteActions({
  celebrationId,
  guest,
  invite,
  invitationImage,
}: {
  celebrationId: string;
  guest: SerializedGuestItem;
  invite: InviteContext;
  // Pre-fetched invitation image for the share sheet (null when there's none
  // or it's still loading). Fetched in advance because iOS only allows the
  // share sheet directly inside the tap — not after an await.
  invitationImage: File | null;
}) {
  const t = useTranslations("celebrations.invitations");
  const [copied, setCopied] = useState(false);
  const [confirmingNewLink, setConfirmingNewLink] = useState(false);
  const [isPending, startTransition] = useTransition();

  const locale = guest.locale ?? routing.defaultLocale;
  const link = personalInviteLink(invite.origin, invite.guid, guest.inviteToken ?? "");
  const text = renderInvitationMessage(invite.templates[locale], {
    name: guest.name,
    couple: invite.couple,
    date: invite.dates[locale],
    link,
  });
  const phone = normalizePhone(guest.phone);
  // false during SSR, the real value in the browser — no hydration mismatch.
  const canShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false
  );

  const record = (via: InviteChannel) =>
    startTransition(async () => {
      await recordGuestInvitedAction(celebrationId, guest.id, via);
    });

  const sendWhatsApp = () => {
    if (!phone) return;
    // Open first (still inside the click, so it isn't blocked as a popup).
    window.open(whatsappUrl(phone, text), "_blank", "noopener,noreferrer");
    record("whatsapp");
  };

  const sendViber = async () => {
    // Viber can't target the chat with pre-filled text: its forward screen
    // gets the text and the sender picks the contact. Also copied, in case.
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard unavailable — the forward screen still has the text
    }
    window.location.href = viberForwardUrl(text);
    record("viber");
  };

  const share = async () => {
    const withImage =
      invitationImage && navigator.canShare?.({ files: [invitationImage] })
        ? { files: [invitationImage], text }
        : { text };
    try {
      await navigator.share(withImage);
      record("share");
    } catch {
      // cancelled by the user (AbortError) or not allowed — not a send
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  if (!guest.inviteToken) return null;

  const iconButton = "text-muted transition-colors hover:text-accent-dark disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={sendWhatsApp}
        disabled={!phone || isPending}
        title={phone ? t("sendWhatsApp") : t("noValidPhone")}
        aria-label={phone ? t("sendWhatsApp") : t("noValidPhone")}
        className={`${iconButton} hover:text-emerald-700`}
      >
        <MessageCircle size={16} />
      </button>
      <button
        type="button"
        onClick={sendViber}
        disabled={isPending}
        title={t("sendViber")}
        aria-label={t("sendViber")}
        className={`${iconButton} hover:text-violet-700`}
      >
        <span className="text-[11px] leading-none font-semibold">Vb</span>
      </button>
      {canShare && (
        <button
          type="button"
          onClick={share}
          disabled={isPending}
          title={invitationImage ? t("shareWithImage") : t("share")}
          aria-label={invitationImage ? t("shareWithImage") : t("share")}
          className={iconButton}
        >
          <Share2 size={16} />
        </button>
      )}
      <button type="button" onClick={copyLink} title={copied ? t("copied") : t("copyLink")} aria-label={copied ? t("copied") : t("copyLink")} className={iconButton}>
        {copied ? <Check size={16} /> : <Link2 size={16} />}
      </button>
      {confirmingNewLink ? (
        <span className="flex items-center gap-1">
          <button
            type="button"
            title={t("newLinkConfirm")}
            aria-label={t("newLinkConfirm")}
            onClick={() =>
              startTransition(async () => {
                await regenerateGuestInviteAction(celebrationId, guest.id);
                setConfirmingNewLink(false);
              })
            }
            className="text-red-600 hover:opacity-80"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            title={t("cancel")}
            aria-label={t("cancel")}
            onClick={() => setConfirmingNewLink(false)}
            className={iconButton}
          >
            <X size={16} />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingNewLink(true)}
          title={t("newLink")}
          aria-label={t("newLink")}
          className={iconButton}
        >
          <RefreshCw size={14} />
        </button>
      )}
    </div>
  );
}
