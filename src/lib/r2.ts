"use client";

export async function uploadToR2(file: File) {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("filename", file.name);

  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "SIGN_FAIL");

  const put = await fetch(json.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": json.contentType },
    body: file,
  });
  if (!put.ok) throw new Error("PUT_FAIL");

  return json.publicUrl as string;
}
