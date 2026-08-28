import { promises as fs } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export type SaveResult = { ok: true; url: string } | { ok: false; error: string };

export async function saveUploadedPhoto(file: File): Promise<SaveResult> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return { ok: false, error: `Unsupported file type "${file.type || "unknown"}". Use JPG, PNG, WEBP, or GIF.` };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: `"${file.name}" is larger than the 10MB limit.` };
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return { ok: true, url: `/uploads/${filename}` };
}

/** Only ever deletes files we ourselves saved under /uploads — never touches placeholders or other paths. */
export async function deleteUploadedPhoto(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return;
  const filename = url.slice("/uploads/".length);
  if (!filename || filename.includes("/") || filename.includes("..")) return;
  try {
    await fs.unlink(path.join(UPLOAD_DIR, filename));
  } catch {
    // already gone — nothing to do
  }
}
