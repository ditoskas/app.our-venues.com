"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Phone, Smartphone, Mail } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import FormDialog from "@/components/FormDialog";
import ProfessionalForm from "./ProfessionalForm";
import DeleteProfessionalButton from "./DeleteProfessionalButton";
import { createProfessionalAction, updateProfessionalAction, deleteProfessionalAction } from "./actions";

export interface SerializedProfessional {
  _id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  mobile: string;
  email: string;
  website?: string;
  country?: string;
  city?: string;
  address?: string;
  postCode?: string;
  logoFilename?: string;
}

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; professional: SerializedProfessional }
  | null;

export default function ProfessionalsManager({
  professionals,
}: {
  professionals: SerializedProfessional[];
}) {
  const t = useTranslations("professionals");
  const tCommon = useTranslations("common");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return professionals;
    return professionals.filter((p) =>
      [
        p.companyName,
        p.contactPerson,
        p.phone,
        p.mobile,
        p.email,
        p.website,
        p.country,
        p.city,
        p.address,
        p.postCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [professionals, query]);

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
            {t("newProfessional")}
          </button>
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-accent-soft/40 text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3" />
              <th className="px-4 py-3">{t("table.companyName")}</th>
              <th className="px-4 py-3">{t("table.contactPerson")}</th>
              <th className="px-4 py-3">{t("table.communication")}</th>
              <th className="px-4 py-3 text-right">{tCommon("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((p) => (
              <tr key={p._id} className="odd:bg-surface even:bg-accent-soft/15">
                <td className="px-4 py-3">
                  {p.logoFilename ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/professionals/${p._id}/logo`}
                      alt=""
                      className="h-8 w-8 rounded border border-border object-contain"
                    />
                  ) : (
                    <span className="block h-8 w-8 rounded border border-dashed border-border" />
                  )}
                </td>
                <td className="px-4 py-3 text-foreground">{p.companyName}</td>
                <td className="px-4 py-3 text-muted">{p.contactPerson}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 text-xs">
                    {p.phone && (
                      <a
                        href={`tel:${p.phone}`}
                        className="flex items-center gap-1.5 text-muted transition-colors hover:text-accent-dark"
                      >
                        <Phone size={12} />
                        {p.phone}
                      </a>
                    )}
                    {p.mobile && (
                      <a
                        href={`tel:${p.mobile}`}
                        className="flex items-center gap-1.5 text-muted transition-colors hover:text-accent-dark"
                      >
                        <Smartphone size={12} />
                        {p.mobile}
                      </a>
                    )}
                    {p.email && (
                      <a
                        href={`mailto:${p.email}`}
                        className="flex items-center gap-1.5 text-muted transition-colors hover:text-accent-dark"
                      >
                        <Mail size={12} />
                        {p.email}
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => setDialog({ mode: "edit", professional: p })}
                      title={t("edit")}
                      aria-label={t("edit")}
                      className="text-muted transition-colors hover:text-accent-dark"
                    >
                      <Pencil size={16} />
                    </button>
                    <DeleteProfessionalButton
                      action={deleteProfessionalAction.bind(null, p._id)}
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
        title={dialog?.mode === "edit" ? t("editTitle") : t("newProfessional")}
      >
        {dialog?.mode === "create" && (
          <ProfessionalForm action={createProfessionalAction} mode="create" />
        )}
        {dialog?.mode === "edit" && (
          <ProfessionalForm
            key={dialog.professional._id}
            action={updateProfessionalAction.bind(null, dialog.professional._id)}
            mode="edit"
            initialProfessional={dialog.professional}
            logoUrl={
              dialog.professional.logoFilename
                ? `/api/professionals/${dialog.professional._id}/logo`
                : undefined
            }
          />
        )}
      </FormDialog>
    </div>
  );
}
