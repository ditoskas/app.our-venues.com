import { redirectToLogin, resolveSession } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import ActingAsBanner from "@/components/ActingAsBanner";
import { logoutAction } from "./actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await resolveSession();
  const user = session?.effectiveUser;

  // The proxy already gates every route in this group — this is
  // defense-in-depth in case a page is ever reached another way.
  if (!session || !user) {
    return redirectToLogin();
  }

  return (
    <>
      {session.isActingAs && (
        <ActingAsBanner
          displayName={user.displayName}
          username={user.username}
          realDisplayName={session.realUser.displayName}
        />
      )}
      <Navbar displayName={user.displayName} role={user.role} logoutAction={logoutAction} />
      <main className="flex-1 w-full px-6 py-10 lg:px-10">{children}</main>
    </>
  );
}
