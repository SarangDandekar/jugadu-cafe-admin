"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  BUCKET,
  GALLERY_CATEGORIES,
  type GalleryCategory,
  type GalleryItem,
  type MediaType,
} from "@/lib/types";

function detectMediaType(file: File): MediaType {
  return file.type.startsWith("video/") ? "video" : "image";
}

export function GalleryManager() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<GalleryCategory>("moments");
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("gallery_items")
      .select("*")
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setItems((data as GalleryItem[]) ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a photo or video first.");
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const mediaType = detectMediaType(file);
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `gallery/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { error: insertError } = await supabase.from("gallery_items").insert({
      title: title.trim() || file.name,
      media_type: mediaType,
      category: mediaType === "video" ? "videos" : category,
      file_path: path,
      public_url: publicUrl,
      sort_order: items.length,
      is_active: true,
    });

    setUploading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setTitle("");
    setFile(null);
    setMessage("Uploaded — it will show on the public Gallery.");
    await load();
  }

  async function removeItem(item: GalleryItem) {
    if (!confirm(`Delete “${item.title}”?`)) return;

    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([item.file_path]);
    const { error: deleteError } = await supabase
      .from("gallery_items")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Deleted.");
    await load();
  }

  async function toggleActive(item: GalleryItem) {
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("gallery_items")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    await load();
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={onUpload}
        className="rounded-2xl border border-border bg-surface p-6"
      >
        <h2 className="mb-4 text-lg font-semibold">Upload gallery media</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm text-muted">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cheese pizza special"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none ring-primary focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as GalleryCategory)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none ring-primary focus:ring-2"
            >
              {GALLERY_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">
              Videos are filed under Videos automatically.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted">
              Photo or video
            </label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          {message}
        </p>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">
          Gallery items ({items.length})
        </h2>
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-muted">No uploads yet.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                <div className="aspect-[4/3] bg-black">
                  {item.media_type === "video" ? (
                    <video
                      src={item.public_url}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.public_url}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted">
                    {item.category} · {item.media_type} ·{" "}
                    {item.is_active ? "live" : "hidden"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleActive(item)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-background"
                    >
                      {item.is_active ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeItem(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-danger/40 px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
