
//upload.ts
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import 'server-only';


export async function saveFileToUploads(name: string, bytes: Uint8Array){
  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const base = path.join(process.cwd(), "public", "uploads", y, m);
  await mkdir(base, { recursive: true });
  const filename = name.replace(/[^a-zA-Z0-9_\.-]/g, "_");
  const full = path.join(base, filename);
  await writeFile(full, bytes);
  const url = `/uploads/${y}/${m}/${filename}`;
  return { path: full, url };
}

export function uniqueNameFrom(original: string){
  const ext = (original.includes(".") ? "." + original.split(".").pop() : "");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}_${rand}${ext}`;
}
