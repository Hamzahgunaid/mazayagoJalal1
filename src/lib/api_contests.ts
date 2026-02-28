
export async function listOwnerContests(){
  const r = await fetch(`/api/owner/contests`, { credentials: 'include' });
  return await r.json();
}
export async function createContest(payload:any){
  const r = await fetch(`/api/owner/contests`, { method:'POST', headers: { 'Content-Type':'application/json' }, credentials:'include', body: JSON.stringify(payload) });
  return await r.json();
}
export async function listPublicContests(){
  const r = await fetch(`/api/contests`, { credentials: 'include' });
  return await r.json();
}
export async function getContest(slug: string) {
  const r = await fetch(
    `/api/contests/by-slug/${encodeURIComponent(slug)}`,
    { credentials: 'include', cache: 'no-store' }
  );
  return await r.json();
}

export async function enterContest(id:string, body:any){
  const r = await fetch(`/api/contests/${id}/enter`, { method:'POST', headers: { 'Content-Type':'application/json' }, credentials:'include', body: JSON.stringify(body) });
  return await r.json();
}
export async function listWinners(id:string){
  const r = await fetch(`/api/contests/${id}/winners`, { credentials:'include' });
  return await r.json();
}



// Update MCQ options for RIDDLE contests

/* ==== FINAL — bottom of src/lib/api_contests.ts (no duplicates) ==== */

export async function updateContest(id: string, patch: any) {
  const r = await fetch(`/api/owner/contests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type':'application/json' },
    credentials: 'include',
    body: JSON.stringify(patch),
  });
  return await r.json();
}

export async function upsertMcqOptions(
  contestId: string,
  options: string[],
  correctIndex: number
) {
  // Update MCQ options for RIDDLE contests
  const r = await fetch(`/api/owner/contests/${contestId}/mcq-options`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    credentials: 'include',
    body: JSON.stringify({ options, correctIndex }),
  });
  return await r.json();
}

export async function createCodeBatch(
  contestId: string,
  name: string,
  pattern?: string | null
) {
  const r = await fetch(`/api/owner/contests/${contestId}/code-batches`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, pattern }),
  });
  return await r.json();
}

export async function bulkAddCodes(
  contestId: string,
  payload: {
    batch_id?: string;
    codes: string[];          // Update MCQ options for RIDDLE contests
    tag?: string;             // Update MCQ options for RIDDLE contests
    sku?: string;             // Update MCQ options for RIDDLE contests
    max_redemptions?: number; // Update MCQ options for RIDDLE contests
  }
) {
  // Update MCQ options for RIDDLE contests
  const r = await fetch(`/api/owner/contests/${contestId}/codes`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return await r.json();
}

export async function listContestMedia(contestId: string) {
  const r = await fetch(`/api/owner/contests/${contestId}/media`, {
    credentials:'include',
    cache:'no-store'
  });
  return await r.json();
}

export async function addMedia(
  contestId: string,
  items: { url: string; kind?: string }[]
) {
  const r = await fetch(`/api/owner/contests/${contestId}/media`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    credentials:'include',
    body: JSON.stringify({ items })
  });
  return await r.json();
}

/* Upload helper — يستخدم Route الموجود لديك: /api/upload */
export async function signR2Upload(fileName: string, contentType: string) {
  // Update MCQ options for RIDDLE contests
  const fd = new FormData();
  fd.append('filename', fileName);
  fd.append('contentType', contentType || 'application/octet-stream');

  const r = await fetch(`/api/upload`, { method:'POST', body: fd });
  const j = await r.json();
  return {
    ok: j?.ok !== false,
    uploadUrl: j.signedUrl,
    publicUrl: j.publicUrl,
    key: j.key,
  };
}

/* Organizer */
export async function getOrganizerByContestId(contestId: string) {
  const r = await fetch(
    `/api/public/contests/${contestId}/organizer`,
    { cache:'no-store' }
  );
  return await r.json();
}
