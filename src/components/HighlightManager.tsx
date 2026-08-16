"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BUCKET, type MediaType, type SiteHighlight } from "@/lib/types";

function detectMediaType(file: File): MediaType {
  return file.type.startsWith("video/") ? "video" : "image";
}

export function HighlightManager() {
  const [current, setCurrent] = useState<SiteHighlight | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [clearMedia, setClearMedia] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("site_highlights")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
    } else {
      const row = (data as SiteHighlight | null) ?? null;
      setCurrent(row);
      setTitle(row?.title ?? "");
      setBodyText(row?.body_text ?? "");
      setClearMedia(false);
      setFile(null);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    let mediaType: MediaType | null = current?.media_type ?? null;
    let filePath: string | null = current?.file_path ?? null;
    let publicUrl: string | null = current?.public_url ?? null;

    if (clearMedia && !file) {
      if (filePath) {
        await supabase.storage.from(BUCKET).remove([filePath]);
      }
      mediaType = null;
      filePath = null;
      publicUrl = null;
    }

    if (file) {
      if (filePath) {
        await supabase.storage.from(BUCKET).remove([filePath]);
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `highlight/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        setSaving(false);
        setError(uploadError.message);
        return;
      }

      mediaType = detectMediaType(file);
      filePath = path;
      publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data
        .publicUrl;
    }

    const payload = {
      title: title.trim() || null,
      body_text: bodyText.trim() || null,
      media_type: mediaType,
      file_path: filePath,
      public_url: publicUrl,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (!payload.title && !payload.body_text && !payload.public_url) {
      setSaving(false);
      setError("Add a title, text, or media before saving.");
      return;
    }

    let saveError = null;
    if (current) {
      const { error: updateError } = await supabase
        .from("site_highlights")
        .update(payload)
        .eq("id", current.id);
      saveError = updateError;
    } else {
      // Deactivate any previous actives, then insert
      await supabase
        .from("site_highlights")
        .update({ is_active: false })
        .eq("is_active", true);
      const { error: insertError } = await supabase
        .from("site_highlights")
        .insert(payload);
      saveError = insertError;
    }

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setMessage("Highlight saved — it appears above Our Story on the public site.");
    await load();
  }

  async function clearHighlight() {
    if (!current) return;
    if (!confirm("Remove the highlight from the public website?")) return;

    const supabase = createClient();
    if (current.file_path) {
      await supabase.storage.from(BUCKET).remove([current.file_path]);
    }
    const { error: updateError } = await supabase
      .from("site_highlights")
      .update({
        is_active: false,
        title: null,
        body_text: null,
        media_type: null,
        file_path: null,
        public_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Highlight cleared — section hidden on the public site.");
    await load();
  }

  if (loading) {
    return <p className="text-muted">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSave}
        className="rounded-2xl border border-border bg-surface p-6"
      >
        <h2 className="mb-1 text-lg font-semibold">Site highlight</h2>
        <p className="mb-5 text-sm text-muted">
          Shown above Our Story only when content exists. Leave empty / clear to
          hide it.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-muted">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekend special"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none ring-primary focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted">Text</label>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={4}
              placeholder="Short announcement for customers…"
              className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 outline-none ring-primary focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted">
              Photo or video (optional)
            </label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setClearMedia(false);
              }}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
            />
            {current?.public_url && !clearMedia && !file && (
              <div className="mt-3 overflow-hidden rounded-xl border border-border">
                {current.media_type === "video" ? (
                  <video
                    src={current.public_url}
                    controls
                    className="max-h-56 w-full bg-black object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={current.public_url}
                    alt={current.title ?? "Highlight"}
                    className="max-h-56 w-full object-cover"
                  />
                )}
                <label className="flex items-center gap-2 border-t border-border px-3 py-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={clearMedia}
                    onChange={(e) => setClearMedia(e.target.checked)}
                  />
                  Remove current media on save
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save highlight"}
          </button>
          {current && (
            <button
              type="button"
              onClick={() => void clearHighlight()}
              className="inline-flex items-center gap-2 rounded-xl border border-danger/40 px-5 py-3 text-danger hover:bg-danger/10"
            >
              <Trash2 className="h-4 w-4" />
              Clear highlight
            </button>
          )}
        </div>
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
    </div>
  );
}
