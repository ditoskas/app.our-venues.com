import PlaceholderPage from "@/components/PlaceholderPage";
import { requirePageRole } from "@/lib/auth";

export default async function GuestsPage() {
  await requirePageRole(["Root"]);
  return <PlaceholderPage pageKey="guests" />;
}
