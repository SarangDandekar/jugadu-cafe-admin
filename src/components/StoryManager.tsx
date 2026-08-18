"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BUCKET, type MediaType, type SiteStoryMedia } from "@/lib/types";

function detectMediaType(file: File): MediaType {
  return file.type.startsWith("video/") ? "video" : "image";
}

export function StoryManager() {
  const [current, setCurrent] = useState<SiteStoryMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("site_story_media")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCurrent((data as SiteStoryMedia | null) ?? null);
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
    if (!file) {
      setError("Choose a video or photo to replace Our Story media.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const mediaType = detectMediaType(file);
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `story/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

    if (uploadError) {
      setSaving(false);
      setError(uploadError.message);
      return;
    }

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data
      .publicUrl;

    const payload = {
      media_type: mediaType,
      file_path: path,
      public_url: publicUrl,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (current?.file_path) {
      await supabase.storage.from(BUCKET).remove([current.file_path]);
    }

    let saveError = null;
    if (current) {
      const { error: updateError } = await supabase
        .from("site_story_media")
        .update(payload)
        .eq("id", current.id);
      saveError = updateError;
    } else {
      await supabase
        .from("site_story_media")
        .update({ is_active: false })
        .eq("is_active", true);
      const { error: insertError } = await supabase
        .from("site_story_media")
        .insert(payload);
      saveError = insertError;
    }

    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }

    setMessage("Our Story media saved — it replaces the video on the public site.");
    await load();
  }

  async function clearStory() {
    if (!current) return;
    if (
      !confirm(
        "Remove the uploaded Our Story media? The public site will fall back to the original video.",
      )
    )
      return;

    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([current.file_path]);
    const { error: updateError } = await supabase
      .from("site_story_media")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Cleared — public site uses the original Our Story video again.");
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
        <h2 className="mb-1 text-lg font-semibold">Our Story media</h2>
        <p className="mb-5 text-sm text-muted">
          Replaces the video in the Our Story section. Founder text and layout
          stay the same. Leave empty / clear to use the original site video.
        </p>

        {current?.public_url && (
          <div className="mb-4 overflow-hidden rounded-xl border border-border bg-black">
            {current.media_type === "video" ? (
              <video
                src={current.public_url}
                controls
                className="max-h-72 w-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.public_url}
                alt="Our Story"
                className="max-h-72 w-full object-cover"
              />
            )}
          </div>
        )}

        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
        />

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save media"}
          </button>
          {current && (
            <button
              type="button"
              onClick={() => void clearStory()}
              className="inline-flex items-center gap-2 rounded-xl border border-danger/40 px-5 py-3 text-danger hover:bg-danger/10"
            >
              <Trash2 className="h-4 w-4" />
              Use original video
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
