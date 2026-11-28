import PlaceholderPage from "@/components/PlaceholderPage";
import { requirePageRole } from "@/lib/auth";

export default async function CouplesPage() {
  await requirePageRole(["Root"]);
  return <PlaceholderPage pageKey="couples" />;
}
