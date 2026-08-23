"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Mail, Smartphone } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import FormDialog from "@/components/FormDialog";
import type { ProfessionalOption } from "@/components/ProfessionalPicker";
import MarriageForm from "./MarriageForm";
import DeleteMarriageButton from "./DeleteMarriageButton";
import { createMarriageAction, updateMarriageAction, deleteMarriageAction } from "./actions";
import type { Role } from "@/lib/users";

export interface SerializedSpouse {
  firstName: string;
  lastName: string;
  email?: string;
  mobile?: string;
}

export interface SerializedMarriage {
  _id: string;
  title: string;
  professionalId: string;
  husband: SerializedSpouse;
  wife: SerializedSpouse;
}

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; marriage: SerializedMarriage }
  | null;

function fullName(spouse: SerializedSpouse): string {
  return `${spouse.firstName} ${spouse.lastName}`;
}

function spouseSearchText(spouse: SerializedSpouse): string {
  return [spouse.firstName, spouse.lastName, spouse.email, spouse.mobile]
    .filter(Boolean)
    .join(" ");
}

export default function MarriagesManager({
  marriages,
  role,
  professionals,
}: {
  marriages: SerializedMarriage[];
  role: Role;
  professionals: ProfessionalOption[];
}) {
  const t = useTranslations("weddings");
  const tCommon = useTranslations("common");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [query, setQuery] = useState("");

  const professionalName = (id: string) =>
    professionals.find((p) => p._id === id)?.companyName ?? "—";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return marriages;
    return marriages.filter((m) => {
      const haystack = [
        m.title,
        spouseSearchText(m.husband),
        spouseSearchText(m.wife),
        professionalName(m.professionalId),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- professionalName depends only on the stable `professionals` prop
  }, [marriages, query, professionals]);

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
          <button
            type="button"
            onClick={() => setDialog({ mode: "create" })}
            className="rounded-md bg-accent-dark px-4 py-2 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90"
          >
            {t("newMarriage")}
          </button>
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-accent-soft/40 text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3">{t("table.title")}</th>
              <th className="px-4 py-3">{t("table.husband")}</th>
              <th className="px-4 py-3">{t("table.wife")}</th>
              {role === "Root" && (
                <th className="px-4 py-3">{t("table.professional")}</th>
              )}
              <th className="px-4 py-3 text-right">{tCommon("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((m) => (
              <tr key={m._id}>
                <td className="px-4 py-3 text-foreground">{m.title}</td>
                <td className="px-4 py-3">
                  <SpouseCell spouse={m.husband} />
                </td>
                <td className="px-4 py-3">
                  <SpouseCell spouse={m.wife} />
                </td>
                {role === "Root" && (
                  <td className="px-4 py-3 text-muted">
                    {professionalName(m.professionalId)}
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => setDialog({ mode: "edit", marriage: m })}
                      title={t("edit")}
                      aria-label={t("edit")}
                      className="text-muted transition-colors hover:text-accent-dark"
                    >
                      <Pencil size={16} />
                    </button>
                    <DeleteMarriageButton
                      action={deleteMarriageAction.bind(null, m._id)}
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
        title={dialog?.mode === "edit" ? t("editTitle") : t("newMarriage")}
      >
        {dialog?.mode === "create" && (
          <MarriageForm
            action={createMarriageAction}
            mode="create"
            role={role}
            professionals={professionals}
          />
        )}
        {dialog?.mode === "edit" && (
          <MarriageForm
            key={dialog.marriage._id}
            action={updateMarriageAction.bind(null, dialog.marriage._id)}
            mode="edit"
            role={role}
            professionals={professionals}
            initialMarriage={dialog.marriage}
          />
        )}
      </FormDialog>
    </div>
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
