"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Save, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  BUCKET,
  type HighlightItem,
  type MediaType,
  type SiteHighlight,
} from "@/lib/types";
import { formatBytes, uploadCafeMedia } from "@/lib/uploadMedia";

function detectMediaType(file: File): MediaType {
  return file.type.startsWith("video/") ? "video" : "image";
}

export function HighlightManager() {
  const [copy, setCopy] = useState<SiteHighlight | null>(null);
  const [items, setItems] = useState<HighlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingText, setSavingText] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [bodyText, setBodyText] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: copyRow, error: copyError }, { data: mediaRows, error: mediaError }] =
      await Promise.all([
        supabase
          .from("site_highlights")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("highlight_items")
          .select("*")
          .order("sort_order", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

    if (copyError || mediaError) {
      setError(copyError?.message || mediaError?.message || "Failed to load");
    } else {
      const row = (copyRow as SiteHighlight | null) ?? null;
      setCopy(row);
      setBodyText(row?.body_text ?? "");
      setItems((mediaRows as HighlightItem[]) ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSaveText(e: FormEvent) {
    e.preventDefault();
    setSavingText(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const payload = {
      title: "Highlights",
      body_text: bodyText.trim() || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let saveError = null;
    if (copy) {
      const { error: updateError } = await supabase
        .from("site_highlights")
        .update(payload)
        .eq("id", copy.id);
      saveError = updateError;
    } else {
      await supabase
        .from("site_highlights")
        .update({ is_active: false })
        .eq("is_active", true);
      const { error: insertError } = await supabase
        .from("site_highlights")
        .insert(payload);
      saveError = insertError;
    }

    setSavingText(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }

    setMessage("Highlights text saved — it shows under the Highlights title.");
    await load();
  }

  async function clearText() {
    if (!copy) {
      setBodyText("");
      return;
    }
    if (!confirm("Clear the Highlights text strip on the public site?")) return;

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("site_highlights")
      .update({
        body_text: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", copy.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setBodyText("");
    setMessage("Text cleared.");
    await load();
  }

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      setError("Choose one or more photos or videos.");
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);
    setProgress(null);

    const supabase = createClient();
    let uploaded = 0;

    for (const [index, file] of files.entries()) {
      const mediaType = detectMediaType(file);
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `highlight/${Date.now()}-${index}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      try {
        setProgress(
          `Uploading ${index + 1}/${files.length}: ${file.name} (${formatBytes(file.size)})`,
        );
        const publicUrl = await uploadCafeMedia(supabase, path, file, (pct) => {
          setProgress(
            `Uploading ${index + 1}/${files.length}: ${file.name} — ${pct}%`,
          );
        });

        const { error: insertError } = await supabase.from("highlight_items").insert({
          title: file.name.replace(/\.[^.]+$/, ""),
          media_type: mediaType,
          file_path: path,
          public_url: publicUrl,
          sort_order: items.length + index,
          is_active: true,
        });

        if (insertError) {
          setUploading(false);
          setProgress(null);
          setError(insertError.message);
          return;
        }
      } catch (err) {
        setUploading(false);
        setProgress(null);
        setError(err instanceof Error ? err.message : "Upload failed.");
        return;
      }

      uploaded += 1;
    }

    setUploading(false);
    setProgress(null);
    setFiles([]);
    setMessage(
      uploaded === 1
        ? "Uploaded 1 item — it will show in the Highlights slider."
        : `Uploaded ${uploaded} items — they will show in the Highlights slider.`,
    );
    await load();
  }

  async function removeItem(item: HighlightItem) {
    if (!confirm(`Delete “${item.title}”?`)) return;

    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([item.file_path]);
    const { error: deleteError } = await supabase
      .from("highlight_items")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Deleted.");
    await load();
  }

  async function toggleActive(item: HighlightItem) {
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("highlight_items")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    await load();
  }

  if (loading) {
    return <p className="text-muted">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={onSaveText}
        className="rounded-2xl border border-border bg-surface p-6"
      >
        <h2 className="mb-1 text-lg font-semibold">Highlights text</h2>
        <p className="mb-5 text-sm text-muted">
          The public heading is always “Highlights”. This text sits under that
          title, above the photo/video slider.
        </p>
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={4}
          placeholder="Short announcement for customers…"
          className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 outline-none ring-primary focus:ring-2"
        />
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={savingText}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {savingText ? "Saving…" : "Save text"}
          </button>
          <button
            type="button"
            onClick={() => void clearText()}
            className="inline-flex items-center gap-2 rounded-xl border border-danger/40 px-5 py-3 text-danger hover:bg-danger/10"
          >
            <Trash2 className="h-4 w-4" />
            Clear text
          </button>
        </div>
      </form>

      <form
        onSubmit={onUpload}
        className="rounded-2xl border border-border bg-surface p-6"
      >
        <h2 className="mb-1 text-lg font-semibold">Highlight photos & videos</h2>
        <p className="mb-5 text-sm text-muted">
          Add multiple files at once. They appear in a left/right slider — text
          is not part of the slider.
        </p>
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
        />
        {files.length > 0 && (
          <p className="mt-2 text-sm text-muted">{files.length} file(s) selected</p>
        )}
        <button
          type="submit"
          disabled={uploading}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading…" : "Upload"}
        </button>
        {progress && <p className="mt-3 text-sm text-muted">{progress}</p>}
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
          Slider items ({items.length})
        </h2>
        {items.length === 0 ? (
          <p className="text-muted">No photos or videos yet.</p>
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
                    {item.media_type} · {item.is_active ? "live" : "hidden"}
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
