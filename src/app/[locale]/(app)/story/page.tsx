import PlaceholderPage from "@/components/PlaceholderPage";
import { requirePageRole } from "@/lib/auth";

export default async function StoryPage() {
  await requirePageRole(["Root"]);
  return <PlaceholderPage pageKey="story" />;
}
