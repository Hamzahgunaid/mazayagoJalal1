'use client';

import { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import CountrySelect from '@/components/common/CountrySelect';

const MapPicker = dynamic(() => import('@/components/common/MapPickerClient'), { ssr: false });

type ContestSettings = {
  geo_restrictions?: {
    countries?: string[];
    center?: any;
    radius_km?: number | null;
  };
  eligibility_json?: {
    rscore_min?: number | null;
    account_age_days?: number | null;
    verified_only?: boolean;
  };
};

export default function Restrictions({ contestId }: { contestId: string }) {
  const [data, setData] = useState<ContestSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId]);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/owner/contests/${contestId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load restrictions');
      const info = await res.json();
      setData({
        geo_restrictions: info?.contest?.geo_restrictions || info?.geo_restrictions || {},
        eligibility_json: info?.contest?.eligibility_json || info?.eligibility_json || {},
      });
    } catch (err: any) {
      setMessage(err?.message || 'Unable to load restrictions.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/owner/contests/${contestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          geo_restrictions: data.geo_restrictions ?? null,
          eligibility_json: data.eligibility_json ?? null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save restrictions');
      setMessage('Restrictions updated.');
      await load();
    } catch (err: any) {
      setMessage(err?.message || 'Failed to save restrictions.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-muted">Loading restrictions...</div>;
  if (!data) return <div className="text-sm text-danger">Unable to load restrictions.</div>;

  return (
    <div className="space-y-4">
      {message && <div className="text-sm text-muted">{message}</div>}

      <section className="space-y-2 p-4 rounded-2xl border bg-white/80 shadow-sm">
        <div className="font-semibold">Allowed countries</div>
        <p className="text-xs text-muted">Select the countries that can participate in this contest.</p>
        <CountrySelect
          value={data.geo_restrictions?.countries || []}
          multiple
          onChange={(val: string[]) =>
            setData((prev) => ({
              ...(prev || {}),
              geo_restrictions: {
                ...(prev?.geo_restrictions || {}),
                countries: val,
              },
            }))
          }
        />
      </section>

      <section className="space-y-2 p-4 rounded-2xl border bg-white/80 shadow-sm">
        <div className="font-semibold">Geofence (optional)</div>
        <p className="text-xs text-muted">Choose a map center and radius to limit in-person activations.</p>
        <Suspense fallback={<div className="text-xs text-muted p-2">Loading map…</div>}>
          <MapPicker
            onPick={(point: any) =>
              setData((prev) => ({
                ...(prev || {}),
                geo_restrictions: {
                  ...(prev?.geo_restrictions || {}),
                  center: point,
                },
              }))
            }
          />
        </Suspense>
        <input
          className="border p-2 rounded-xl mt-2"
          type="number"
          min={0}
          placeholder="Radius (km)"
          value={data.geo_restrictions?.radius_km ?? ''}
          onChange={(e) =>
            setData((prev) => ({
              ...(prev || {}),
              geo_restrictions: {
                ...(prev?.geo_restrictions || {}),
                radius_km: e.target.value === '' ? null : Number(e.target.value),
              },
            }))
          }
        />
      </section>

      <section className="space-y-2 p-4 rounded-2xl border bg-white/80 shadow-sm">
        <div className="font-semibold">Eligibility</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="border p-2 rounded-xl"
            type="number"
            min={0}
            placeholder="Minimum Rscore"
            value={data.eligibility_json?.rscore_min ?? ''}
            onChange={(e) =>
              setData((prev) => ({
                ...(prev || {}),
                eligibility_json: {
                  ...(prev?.eligibility_json || {}),
                  rscore_min: e.target.value === '' ? null : Number(e.target.value),
                },
              }))
            }
          />
          <input
            className="border p-2 rounded-xl"
            type="number"
            min={0}
            placeholder="Account age (days)"
            value={data.eligibility_json?.account_age_days ?? ''}
            onChange={(e) =>
              setData((prev) => ({
                ...(prev || {}),
                eligibility_json: {
                  ...(prev?.eligibility_json || {}),
                  account_age_days: e.target.value === '' ? null : Number(e.target.value),
                },
              }))
            }
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!data.eligibility_json?.verified_only}
              onChange={(e) =>
                setData((prev) => ({
                  ...(prev || {}),
                  eligibility_json: {
                    ...(prev?.eligibility_json || {}),
                    verified_only: e.target.checked,
                  },
                }))
              }
            />
            Verified accounts only
          </label>
        </div>
      </section>

      <button
        className="rv-btn-primary"
        onClick={save}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save restrictions'}
      </button>
    </div>
  );
}
