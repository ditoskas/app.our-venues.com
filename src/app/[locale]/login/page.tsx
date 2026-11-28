import { getTranslations } from "next-intl/server";
import Image from "next/image";
import LoginForm from "./LoginForm";
import logo from "@/assets/brand/logo-vertical.png";

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
        <div className="mb-8 flex justify-center">
          <Image src={logo} alt={t("brand")} priority className="h-auto w-64 max-w-full" />
        </div>

        <div className="rounded-lg border border-border bg-surface p-8 shadow-sm">
          <LoginForm redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  );
}
