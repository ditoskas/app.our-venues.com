"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Pencil, Mail, Smartphone, Copy, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import PageHeader from "@/components/PageHeader";
import FormDialog from "@/components/FormDialog";
import type { ProfessionalOption } from "@/components/ProfessionalPicker";
import CelebrationForm from "./CelebrationForm";
import DeleteCelebrationButton from "./DeleteCelebrationButton";
import { createCelebrationAction, updateCelebrationAction, deleteCelebrationAction } from "./actions";
import type { Role } from "@/lib/users";
import type { CelebrationType } from "@/lib/celebrations";

export interface SerializedSpouse {
  firstName: string;
  lastName: string;
  email?: string;
  mobile?: string;
}

export interface SerializedCelebration {
  _id: string;
  guid: string;
  title: string;
  type: CelebrationType;
  professionalId: string;
  husband: SerializedSpouse;
  wife: SerializedSpouse;
}

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; celebration: SerializedCelebration }
  | null;

function fullName(spouse: SerializedSpouse): string {
  return `${spouse.firstName} ${spouse.lastName}`;
}

function spouseSearchText(spouse: SerializedSpouse): string {
  return [spouse.firstName, spouse.lastName, spouse.email, spouse.mobile]
    .filter(Boolean)
    .join(" ");
}

export default function CelebrationsManager({
  celebrations,
  role,
  professionals,
}: {
  celebrations: SerializedCelebration[];
  role: Role;
  professionals: ProfessionalOption[];
}) {
  const t = useTranslations("celebrations");
  const tTypes = useTranslations("celebrations.types");
  const tCommon = useTranslations("common");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [query, setQuery] = useState("");

  const professionalName = (id: string) =>
    professionals.find((p) => p._id === id)?.companyName ?? "—";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return celebrations;
    return celebrations.filter((c) => {
      const haystack = [
        c.title,
        c.guid,
        tTypes(c.type),
        spouseSearchText(c.husband),
        spouseSearchText(c.wife),
        professionalName(c.professionalId),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- professionalName/tTypes depend only on the stable `professionals` prop
  }, [celebrations, query, professionals]);

  return (
    <div>
      <PageHeader
        title={t("title")}
        middle={
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="input"
          />
        }
        action={
          // Couples manage their existing celebration; only Root/Professional create.
          role === "Couple" ? undefined : (
            <button
              type="button"
              onClick={() => setDialog({ mode: "create" })}
              className="rounded-md bg-accent-dark px-4 py-2 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90"
            >
              {t("newCelebration")}
            </button>
          )
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-accent-soft/40 text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3">{t("table.title")}</th>
              <th className="px-4 py-3">{t("table.type")}</th>
              <th className="px-4 py-3">{t("table.husband")}</th>
              <th className="px-4 py-3">{t("table.wife")}</th>
              {role === "Root" && (
                <th className="px-4 py-3">{t("table.professional")}</th>
              )}
              <th className="px-4 py-3 text-right">{tCommon("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((c) => (
              <tr key={c._id} className="odd:bg-surface even:bg-accent-soft/15">
                <td className="px-4 py-3">
                  <div className="text-foreground">{c.title}</div>
                  <GuidCell guid={c.guid} />
                </td>
                <td className="px-4 py-3 text-muted">{tTypes(c.type)}</td>
                <td className="px-4 py-3">
                  <SpouseCell spouse={c.husband} />
                </td>
                <td className="px-4 py-3">
                  <SpouseCell spouse={c.wife} />
                </td>
                {role === "Root" && (
                  <td className="px-4 py-3 text-muted">
                    {professionalName(c.professionalId)}
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-4">
                    <Link
                      href={`/celebrations/${c._id}`}
                      title={t("view")}
                      aria-label={t("view")}
                      className="text-muted transition-colors hover:text-accent-dark"
                    >
                      <Eye size={16} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDialog({ mode: "edit", celebration: c })}
                      title={t("edit")}
                      aria-label={t("edit")}
                      className="text-muted transition-colors hover:text-accent-dark"
                    >
                      <Pencil size={16} />
                    </button>
                    <DeleteCelebrationButton
                      action={deleteCelebrationAction.bind(null, c._id)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormDialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog?.mode === "edit" ? t("editTitle") : t("newCelebration")}
      >
        {dialog?.mode === "create" && (
          <CelebrationForm
            action={createCelebrationAction}
            mode="create"
            role={role}
            professionals={professionals}
          />
        )}
        {dialog?.mode === "edit" && (
          <CelebrationForm
            key={dialog.celebration._id}
            action={updateCelebrationAction.bind(null, dialog.celebration._id)}
            mode="edit"
            role={role}
            professionals={professionals}
            initialCelebration={dialog.celebration}
          />
        )}
      </FormDialog>
    </div>
  );
}

function GuidCell({ guid }: { guid: string }) {
  const t = useTranslations("celebrations");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(guid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the
      // GUID is still visible to select/copy by hand, so just no-op.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? t("guidCopied") : t("copyGuid")}
      aria-label={copied ? t("guidCopied") : t("copyGuid")}
      className="mt-1 flex items-center gap-1 font-mono text-xs text-accent-dark transition-colors hover:text-accent"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {guid}
    </button>
  );
}

function SpouseCell({ spouse }: { spouse: SerializedSpouse }) {
  return (
    <div>
      <div className="text-foreground">{fullName(spouse)}</div>
      <div className="mt-1 flex flex-col gap-0.5 text-xs">
        {spouse.mobile && (
          <a
            href={`tel:${spouse.mobile}`}
            className="flex items-center gap-1.5 text-muted transition-colors hover:text-accent-dark"
          >
            <Smartphone size={11} />
            {spouse.mobile}
          </a>
        )}
        {spouse.email && (
          <a
            href={`mailto:${spouse.email}`}
            className="flex items-center gap-1.5 text-muted transition-colors hover:text-accent-dark"
          >
            <Mail size={11} />
            {spouse.email}
          </a>
        )}
      </div>
    </div>
  );
}
