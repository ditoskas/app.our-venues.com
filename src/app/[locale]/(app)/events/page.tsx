import PlaceholderPage from "@/components/PlaceholderPage";
import { requirePageRole } from "@/lib/auth";

export default async function EventsPage() {
  await requirePageRole(["Root"]);
  return <PlaceholderPage pageKey="events" />;
}
