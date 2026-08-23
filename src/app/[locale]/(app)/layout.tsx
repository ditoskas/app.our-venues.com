import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { logoutAction } from "./actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // The proxy already gates every route in this group — this is
  // defense-in-depth in case a page is ever reached another way.
  if (!user) {
    return redirect({ href: "/login", locale: await getLocale() });
  }

  return (
    <>
      <Navbar displayName={user.displayName} logoutAction={logoutAction} />
      <main className="flex-1 w-full px-6 py-10 lg:px-10">{children}</main>
    </>
  );
}
