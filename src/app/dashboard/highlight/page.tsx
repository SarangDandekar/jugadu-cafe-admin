import { HighlightManager } from "@/components/HighlightManager";

export default function HighlightPage() {
  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">Highlight</h2>
      <p className="mb-8 text-muted">
        Controls the optional section above Our Story on the public homepage.
      </p>
      <HighlightManager />
    </div>
  );
}
