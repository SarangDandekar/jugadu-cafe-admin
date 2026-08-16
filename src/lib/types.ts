export type GalleryCategory = "food" | "interior" | "moments" | "videos";
export type MediaType = "image" | "video";

export type GalleryItem = {
  id: string;
  title: string;
  media_type: MediaType;
  category: GalleryCategory;
  file_path: string;
  public_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type SiteHighlight = {
  id: string;
  title: string | null;
  body_text: string | null;
  media_type: MediaType | null;
  file_path: string | null;
  public_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const GALLERY_CATEGORIES: { id: GalleryCategory; label: string }[] = [
  { id: "food", label: "Food" },
  { id: "interior", label: "Store" },
  { id: "moments", label: "Moments" },
  { id: "videos", label: "Videos" },
];

export const BUCKET = "cafe-media";
