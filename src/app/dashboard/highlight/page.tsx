import { HighlightManager } from "@/components/HighlightManager";

export default function HighlightPage() {
  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">Highlights</h2>
      <p className="mb-8 text-muted">
        Text under the Highlights title, plus photos and videos in a slider above
        Our Story.
      </p>
      <HighlightManager />
    </div>
  );
}
