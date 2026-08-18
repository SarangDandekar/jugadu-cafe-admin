import { StoryManager } from "@/components/StoryManager";

export default function StoryPage() {
  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">Our Story</h2>
      <p className="mb-8 text-muted">
        Change the video or photo in the public Our Story section. Text stays
        the same.
      </p>
      <StoryManager />
    </div>
  );
}
