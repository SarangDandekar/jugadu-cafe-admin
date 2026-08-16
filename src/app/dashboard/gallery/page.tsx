import { GalleryManager } from "@/components/GalleryManager";

export default function GalleryPage() {
  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">Gallery</h2>
      <p className="mb-8 text-muted">
        Uploads appear on the public site Gallery section.
      </p>
      <GalleryManager />
    </div>
  );
}
