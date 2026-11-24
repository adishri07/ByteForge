// Private file storage (Supabase Storage bucket "uploads"). Server only.
// Owner: Member 3
import { getDb } from "./db";

const BUCKET = "uploads";

export async function uploadFile(path: string, bytes: Buffer, contentType: string) {
  const { error } = await getDb().storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
  return path;
}

export async function downloadFile(path: string): Promise<Buffer> {
  const { data, error } = await getDb().storage.from(BUCKET).download(path);
  if (error || !data) throw error ?? new Error("File not found");
  return Buffer.from(await data.arrayBuffer());
}

// a short-lived link the browser can use to show a private image (1 hour)
export async function signedUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await getDb().storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}
