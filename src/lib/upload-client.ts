// هذا هلفر *عميل*، لا يستخدم fs/path. يحاول /api/upload/multi أولاً ثم /api/upload.
// يدعم أيضاً النمط الموقّع (signedUrl/publicUrl) إن رجعه /api/upload.
export async function r2Upload(input: File[] | FileList, _folder = 'uploads'): Promise<string[]> {
  const files = Array.from(input || []);
  if (!files.length) return [];

  // 1) جرّب /api/upload/multi (رفع مباشر متعدد)
  try {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    const r = await fetch('/api/upload/multi', { method: 'POST', body: fd });
    if (r.ok) {
      const j = await r.json().catch(() => ({}));
      if (j?.ok && Array.isArray(j.urls)) return j.urls as string[];
      if (j?.ok && j.url) return [j.url as string];
    }
  } catch { /* ignore */ }

  // 2) جرّب /api/upload (رفع ملف-بملف)
  const urls: string[] = [];
  for (const f of files) {
    const fd = new FormData();
    fd.append('file', f);
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({} as any));

      if (r.ok) {
        // حالتان: رفع مباشر أو presign
        if (j?.ok && j.url) { urls.push(j.url); continue; }
        if (j?.signedUrl && j?.publicUrl) {
          const put = await fetch(j.signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': f.type || 'application/octet-stream' },
            body: f,
          });
          if (!put.ok) throw new Error('PUT failed');
          urls.push(j.publicUrl);
          continue;
        }
      }
      throw new Error('Upload failed');
    } catch (e) {
      throw e;
    }
  }
  return urls;
}
