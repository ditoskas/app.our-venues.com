import { getTranslations, getLocale } from "next-intl/server";
import { resolveSession } from "@/lib/auth";
import { listUsers } from "@/lib/users";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import PageHeader from "@/components/PageHeader";
import ProfileForm from "./ProfileForm";
import ChangePasswordForm from "./ChangePasswordForm";
import ActAsForm, { type ActAsOption } from "./ActAsForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const [t, session] = await Promise.all([getTranslations("profile"), resolveSession()]);

  if (!session) {
    return redirect({ href: "/login", locale: await getLocale() });
  }
  const user = session.effectiveUser;

  // "Act as" is offered to the real (logged-in) Root user only — and stays
  // visible while they're acting as someone, so they can switch or stop.
  const actAsOptions: ActAsOption[] | null =
    session.realUser.role === "Root"
      ? (await listUsers())
          .filter((u) => u.role !== "Root")
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
          .map((u) => ({
            id: u._id.toString(),
            displayName: u.displayName,
            username: u.username,
            role: u.role,
          }))
      : null;

  return (
    <div>
      <PageHeader title={t("title")} />

      <section className="mb-10 rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-5 font-serif text-xl text-foreground">
          {t("accountTitle")}
        </h2>
        <ProfileForm
          displayName={user.displayName}
          defaultLocale={user.defaultLocale ?? routing.defaultLocale}
        />
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-5 font-serif text-xl text-foreground">
          {t("passwordTitle")}
        </h2>
        <ChangePasswordForm />
      </section>

      {actAsOptions && (
        <section className="mt-10 rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-5 font-serif text-xl text-foreground">
            {t("actAs.title")}
          </h2>
          <ActAsForm
            users={actAsOptions}
            actingAsId={session.isActingAs ? user._id.toString() : null}
          />
        </section>
      )}
    </div>
  );
}
