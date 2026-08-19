"use client";

import * as tus from "tus-js-client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET } from "@/lib/types";

const CHUNK_SIZE = 6 * 1024 * 1024;
const DIRECT_UPLOAD_MAX = 5 * 1024 * 1024;

function supabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  return url.replace(/\/$/, "");
}

function supabaseAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return key;
}

export async function uploadCafeMedia(
  supabase: SupabaseClient,
  path: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (file.size <= DIRECT_UPLOAD_MAX) {
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw error;
    onProgress?.(100);
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("You need to sign in again before uploading large videos.");
  }

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl()}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey(),
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: CHUNK_SIZE,
      metadata: {
        bucketName: BUCKET,
        objectName: path,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      onError(error) {
        reject(error);
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (!bytesTotal) return;
        onProgress?.(Math.min(99, Math.round((bytesUploaded / bytesTotal) * 100)));
      },
      onSuccess() {
        onProgress?.(100);
        resolve();
      },
    });

    void upload.findPreviousUploads().then((previous) => {
      if (previous.length > 0) {
        upload.resumeFromPreviousUpload(previous[0]);
      }
      upload.start();
    });
  });

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
