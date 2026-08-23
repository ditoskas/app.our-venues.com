import { getTranslations, getLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import PageHeader from "@/components/PageHeader";
import ProfileForm from "./ProfileForm";
import ChangePasswordForm from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const [t, user] = await Promise.all([getTranslations("profile"), getCurrentUser()]);

  if (!user) {
    return redirect({ href: "/login", locale: await getLocale() });
  }

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
    </div>
  );
}
