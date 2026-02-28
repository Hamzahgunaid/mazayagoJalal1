'use client';

import { useEffect, useMemo, useState } from 'react';
import { r2Upload } from '@/lib/upload-client';                  // ✅ عميل
import { updateContest, addMedia as addMediaApi } from '@/lib/api_contests';

type Contest = { id: string; slug: string; title: string; rules_json?: any; };
type MediaRow = { id: string; url: string; kind: string; created_at: string };

export default function MediaManager({
  contest,
  onContestUpdate,
}: {
  contest: Contest;
  onContestUpdate?: (c: any) => void;
}) {
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [gallery, setGallery] = useState<string[]>([]);
  const [mediaRows, setMediaRows] = useState<MediaRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // kinds: image | cover | banner | video | avatar | icon
  const avatars = useMemo(() => mediaRows.filter(m => m.kind === 'avatar'), [mediaRows]);
  const icons   = useMemo(() => mediaRows.filter(m => m.kind === 'icon'), [mediaRows]);
  const banners = useMemo(() => mediaRows.filter(m => m.kind === 'banner'), [mediaRows]);
  const images  = useMemo(() => mediaRows.filter(m => m.kind === 'image'), [mediaRows]);

  async function refreshRows() {
    const r = await fetch(`/api/owner/contests/${contest.id}/media`, { cache: 'no-store', credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    setMediaRows(Array.isArray(j?.items) ? j.items : []);
  }

  useEffect(() => {
    const rj = contest.rules_json || {};
    setCoverUrl(rj.cover_url || '');
    setGallery(Array.isArray(rj.gallery_urls) ? rj.gallery_urls : []);
    refreshRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contest.id]);

  async function saveCoverViaUpload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setMsg(null);
    try {
      const [url] = await r2Upload([files[0]], 'offers');
      const payload = {
        rules_json: { ...(contest.rules_json || {}), cover_url: url },
      };
      const res = await updateContest(contest.id, payload);
      setCoverUrl(url);
      onContestUpdate?.(res?.contest || { ...contest, rules_json: payload.rules_json });
      // سجّل كـ cover في contest_media
      await addMediaApi(contest.id, [{ url, kind: 'cover' }]);
      await refreshRows();
      setMsg('Cover updated.');
    } catch (e: any) {
      setMsg(e?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setMsg(null);
    try {
      const [url] = await r2Upload([files[0]], 'offers');
      await addMediaApi(contest.id, [{ url, kind: 'avatar' }]);
      await refreshRows();
      setMsg('Avatar added.');
    } catch (e: any) {
      setMsg(e?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function uploadIcon(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setMsg(null);
    try {
      const [url] = await r2Upload([files[0]], 'offers');
      await addMediaApi(contest.id, [{ url, kind: 'icon' }]);
      await refreshRows();
      setMsg('Icon added.');
    } catch (e: any) {
      setMsg(e?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function uploadGallery(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setMsg(null);
    try {
      const urls = await r2Upload(Array.from(files), 'offers');
      await addMediaApi(contest.id, urls.map((u) => ({ url: u, kind: 'image' })));

      // حدّث rules_json.gallery_urls
      const newGallery = [...gallery, ...urls];
      const payload = {
        rules_json: { ...(contest.rules_json || {}), gallery_urls: newGallery },
      };
      const res = await updateContest(contest.id, payload);
      setGallery(newGallery);
      onContestUpdate?.(res?.contest || { ...contest, rules_json: payload.rules_json });

      await refreshRows();
      setMsg('Gallery updated.');
    } catch (e: any) {
      setMsg(e?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function removeMedia(mediaId: string) {
    setBusy(true); setMsg(null);
    try {
      await fetch(`/api/owner/contests/${contest.id}/media`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ media_id: mediaId }),
      });
      setMediaRows((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (e: any) {
      setMsg(e?.message || 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rv-section space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Media</h2>
        {busy && <div className="text-xs text-slate-500">Working…</div>}
      </div>
      {msg && <div className="rounded-md border p-3 bg-white text-sm">{msg}</div>}

      {/* Cover */}
      <div className="rounded-xl border p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="font-medium">Cover</div>
          <label className="rv-link cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={(e)=>saveCoverViaUpload(e.target.files)} />
            Replace cover
          </label>
        </div>
        {coverUrl ? (
          <div className="mt-3 overflow-hidden rounded-xl">
            <img src={coverUrl} alt="cover" className="w-full h-48 object-cover" />
          </div>
        ) : (
          <div className="mt-3 h-32 rounded-xl bg-gradient-to-r from-slate-100 to-slate-50 grid place-items-center text-slate-500 text-sm">
            No cover yet
          </div>
        )}
      </div>

      {/* Avatar & Icon */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border p-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="font-medium">Avatar</div>
            <label className="rv-link cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={(e)=>uploadAvatar(e.target.files)} />
              Upload
            </label>
          </div>
          <div className="mt-3 flex gap-3">
            {avatars.length === 0 ? (
              <div className="text-sm text-slate-500">No avatar</div>
            ) : (
              avatars.map(a => (
                <div key={a.id} className="relative">
                  <img src={a.url} alt="avatar" className="w-16 h-16 rounded-full object-cover border" />
                  <button
                    onClick={()=>removeMedia(a.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/80 text-white text-xs"
                    title="Remove"
                  >×</button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border p-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="font-medium">Icon</div>
            <label className="rv-link cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={(e)=>uploadIcon(e.target.files)} />
              Upload
            </label>
          </div>
          <div className="mt-3 flex gap-3">
            {icons.length === 0 ? (
              <div className="text-sm text-slate-500">No icon</div>
            ) : (
              icons.map(a => (
                <div key={a.id} className="relative">
                  <img src={a.url} alt="icon" className="w-16 h-16 rounded-lg object-cover border" />
                  <button
                    onClick={()=>removeMedia(a.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/80 text-white text-xs"
                    title="Remove"
                  >×</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Gallery Slider */}
      <div className="rounded-xl border p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="font-medium">Gallery</div>
          <label className="rv-link cursor-pointer">
            <input multiple type="file" accept="image/*" className="hidden" onChange={(e)=>uploadGallery(e.target.files)} />
            Add images
          </label>
        </div>

        {images.length === 0 && gallery.length === 0 ? (
          <div className="mt-3 text-sm text-slate-500">No images yet</div>
        ) : (
          <div className="mt-3 flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2">
            {[...images.map(i => i.url), ...gallery].map((u, i) => (
              <div key={u + i} className="min-w-[220px] h-[140px] snap-start rounded-xl overflow-hidden shadow-sm border">
                <img src={u} alt={`img-${i}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
