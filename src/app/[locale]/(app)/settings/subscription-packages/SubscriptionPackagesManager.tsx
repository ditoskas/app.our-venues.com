"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import FormDialog from "@/components/FormDialog";
import SubscriptionPackageForm from "./SubscriptionPackageForm";
import DeleteSubscriptionPackageButton from "./DeleteSubscriptionPackageButton";
import {
  createSubscriptionPackageAction,
  updateSubscriptionPackageAction,
  deleteSubscriptionPackageAction,
} from "./actions";

export interface SerializedSubscriptionPackage {
  _id: string;
  name: string;
  description: string;
  maxUsers: number;
  maxBronzeMarriages: number;
  maxSilverMarriages: number;
  maxGoldMarriages: number;
}

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; pkg: SerializedSubscriptionPackage }
  | null;

export default function SubscriptionPackagesManager({
  packages,
}: {
  packages: SerializedSubscriptionPackage[];
}) {
  const t = useTranslations("settings.subscriptionPackages");
  const tCommon = useTranslations("common");
  const [dialog, setDialog] = useState<DialogState>(null);

  return (
    <div>
      <PageHeader
        title={t("title")}
        action={
          <button
            type="button"
            onClick={() => setDialog({ mode: "create" })}
            className="rounded-md bg-accent-dark px-4 py-2 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90"
          >
            {t("newPackage")}
          </button>
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-accent-soft/40 text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3">{t("table.name")}</th>
              <th className="px-4 py-3">{t("table.maxUsers")}</th>
              <th className="px-4 py-3">{t("table.maxBronzeMarriages")}</th>
              <th className="px-4 py-3">{t("table.maxSilverMarriages")}</th>
              <th className="px-4 py-3">{t("table.maxGoldMarriages")}</th>
              <th className="px-4 py-3 text-right">{tCommon("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {packages.map((pkg) => (
              <tr key={pkg._id}>
                <td className="px-4 py-3 text-foreground">{pkg.name}</td>
                <td className="px-4 py-3 text-muted">{pkg.maxUsers}</td>
                <td className="px-4 py-3 text-muted">{pkg.maxBronzeMarriages}</td>
                <td className="px-4 py-3 text-muted">{pkg.maxSilverMarriages}</td>
                <td className="px-4 py-3 text-muted">{pkg.maxGoldMarriages}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => setDialog({ mode: "edit", pkg })}
                      title={t("edit")}
                      aria-label={t("edit")}
                      className="text-muted transition-colors hover:text-accent-dark"
                    >
                      <Pencil size={16} />
                    </button>
                    <DeleteSubscriptionPackageButton
                      action={deleteSubscriptionPackageAction.bind(null, pkg._id)}
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
        title={dialog?.mode === "edit" ? t("editTitle") : t("newPackage")}
      >
        {dialog?.mode === "create" && (
          <SubscriptionPackageForm action={createSubscriptionPackageAction} mode="create" />
        )}
        {dialog?.mode === "edit" && (
          <SubscriptionPackageForm
            key={dialog.pkg._id}
            action={updateSubscriptionPackageAction.bind(null, dialog.pkg._id)}
            mode="edit"
            initialPackage={dialog.pkg}
          />
        )}
      </FormDialog>
    </div>
  );
}
