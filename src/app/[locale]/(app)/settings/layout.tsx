import SettingsSidebar from "@/components/SettingsSidebar";
import { requirePageRole } from "@/lib/auth";

// The whole Settings area (Users, Subscription Packages, LogActions, General)
// is Root-only. Professionals manage their couples' users at /users instead.
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageRole(["Root"]);

  return (
    <div className="flex gap-12">
      <SettingsSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
