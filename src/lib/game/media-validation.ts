import type { MediaType } from "@/types/database";

interface AllowedType {
  mediaType: Extract<MediaType, "image" | "gif" | "video" | "audio">;
  maxBytes: number;
  extensions: string[];
}

export const ALLOWED_UPLOAD_TYPES: Record<string, AllowedType> = {
  "image/jpeg": { mediaType: "image", maxBytes: 15 * 1024 * 1024, extensions: ["jpg", "jpeg"] },
  "image/png": { mediaType: "image", maxBytes: 15 * 1024 * 1024, extensions: ["png"] },
  "image/webp": { mediaType: "image", maxBytes: 15 * 1024 * 1024, extensions: ["webp"] },
  "image/gif": { mediaType: "gif", maxBytes: 25 * 1024 * 1024, extensions: ["gif"] },
  "video/mp4": { mediaType: "video", maxBytes: 300 * 1024 * 1024, extensions: ["mp4"] },
  "video/webm": { mediaType: "video", maxBytes: 300 * 1024 * 1024, extensions: ["webm"] },
  "video/quicktime": { mediaType: "video", maxBytes: 300 * 1024 * 1024, extensions: ["mov"] },
  "audio/mpeg": { mediaType: "audio", maxBytes: 60 * 1024 * 1024, extensions: ["mp3"] },
  "audio/wav": { mediaType: "audio", maxBytes: 60 * 1024 * 1024, extensions: ["wav"] },
  "audio/x-wav": { mediaType: "audio", maxBytes: 60 * 1024 * 1024, extensions: ["wav"] },
  "audio/mp4": { mediaType: "audio", maxBytes: 60 * 1024 * 1024, extensions: ["m4a"] },
  "audio/x-m4a": { mediaType: "audio", maxBytes: 60 * 1024 * 1024, extensions: ["m4a"] },
};

export interface UploadValidationResult {
  ok: boolean;
  error?: string;
  mediaType?: AllowedType["mediaType"];
  extension?: string;
}

export function validateUpload(file: { type: string; size: number; name: string }): UploadValidationResult {
  const allowed = ALLOWED_UPLOAD_TYPES[file.type];
  if (!allowed) {
    return { ok: false, error: "Unsupported file format. Please upload an image, GIF, MP4/WebM/MOV video, or MP3/WAV/M4A audio file." };
  }
  if (file.size <= 0) return { ok: false, error: "The file appears to be empty." };
  if (file.size > allowed.maxBytes) {
    return { ok: false, error: `File is too large (max ${Math.round(allowed.maxBytes / (1024 * 1024))}MB).` };
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowed.extensions.includes(ext)) {
    return { ok: false, error: "The file extension doesn't match its content type." };
  }
  return { ok: true, mediaType: allowed.mediaType, extension: ext };
}

/** Strips everything but safe filename characters to build a storage-safe path segment. */
export function sanitizeFilename(name: string): string {
  const base = name.replace(/\.[^/.]+$/, "");
  const safe = base
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return safe || "file";
}
