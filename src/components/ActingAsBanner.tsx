import { getTranslations } from "next-intl/server";
import { UserCog } from "lucide-react";
import { stopActingAsAction } from "@/app/[locale]/(app)/profile/actions";

export default async function ActingAsBanner({
  displayName,
  username,
  realDisplayName,
}: {
  displayName: string;
  username: string;
  realDisplayName: string;
}) {
  const t = await getTranslations("profile.actAs");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-accent bg-accent-soft/60 px-6 py-2 text-xs text-foreground lg:px-10">
      <span className="flex items-center gap-2">
        <UserCog className="h-4 w-4 text-accent-dark" aria-hidden />
        {t("banner", { name: displayName, username, realName: realDisplayName })}
      </span>
      <form action={stopActingAsAction}>
        <button
          type="submit"
          className="rounded-md bg-accent-dark px-3 py-1 font-medium tracking-wide text-white transition-opacity hover:opacity-90"
        >
          {t("stop")}
        </button>
      </form>
    </div>
  );
}
