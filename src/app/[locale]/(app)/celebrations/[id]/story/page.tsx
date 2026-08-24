import { notFound } from "next/navigation";
import { getCelebrationById, getActiveLanguages } from "@/lib/celebrations";
import StoryForm, { type StoryValues } from "../StoryForm";
import TimelineManager from "../TimelineManager";
import type { SerializedTimelineItem } from "../TimelineItemForm";

export default async function StoryTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const celebration = await getCelebrationById(id);
  if (!celebration) {
    notFound();
  }

  const storyValues: StoryValues = {
    storyTitle: celebration.storyTitle,
    storySubtitle: celebration.storySubtitle,
    storyParagraph: celebration.storyParagraph,
  };

  const timelineItems: SerializedTimelineItem[] = (celebration.timeline ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    date: item.date ? item.date.toISOString().slice(0, 10) : undefined,
    imageFilename: item.imageFilename,
  }));

  const activeLanguages = getActiveLanguages(celebration);

  return (
    <div>
      <StoryForm
        celebrationId={id}
        initialValues={storyValues}
        activeLanguages={activeLanguages}
      />
      <TimelineManager
        celebrationId={id}
        items={timelineItems}
        activeLanguages={activeLanguages}
      />
    </div>
  );
}
