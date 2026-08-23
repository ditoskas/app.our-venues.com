import { getTranslations } from "next-intl/server";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const t = await getTranslations();
  const { redirect: redirectTo } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-serif text-3xl italic text-foreground">
            {t("brand")}
          </p>
          <p className="mt-2 text-sm text-muted">{t("login.subtitle")}</p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-8 shadow-sm">
          <LoginForm redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  );
}
