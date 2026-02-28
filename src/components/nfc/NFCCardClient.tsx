"use client";

import { useMemo } from "react";

type Props = {
  nodeId: string;
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  nodeName?: string | null;
  logoUrl?: string;
  coverUrl?: string;
  address?: string;
};

export default function NFCCardClient({
  nodeId, serviceId, serviceSlug, serviceName, nodeName, logoUrl, coverUrl, address
}: Props){
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000");

  const nfcUrl = useMemo(()=> `${origin.replace(/\/+$/, "")}/nfc/${nodeId}`, [origin, nodeId]);

  async function requestPhysicalCard(){
    const payload = {
      variant: "classic_a6",
      language: "ar",              // أو "en"
      note: "Default NFC card request"
    };
    const r = await fetch("/api/nfc/request", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ service_id: serviceId, service_node_id: nodeId, payload })
    });
    const j = await r.json();
    if(r.ok) alert("Request submitted!"); else alert(j.error||"Failed");
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h1 className="text-xl font-semibold">NFC card for this location</h1>
        <p className="text-slate-600 mt-1">Program this URL into your NFC tag, then place the tag near checkout.</p>

        <div className="mt-3 p-3 rounded-lg border bg-slate-50 font-mono text-sm break-all">{nfcUrl}</div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="btn"
            onClick={()=>{ navigator.clipboard.writeText(nfcUrl); }}
          >Copy URL</button>

          <a className="btn btn-outline" href={nfcUrl} target="_blank" rel="noreferrer">Test it</a>

          <button className="btn" onClick={requestPhysicalCard}>Order NFC card</button>

          <button className="btn btn-primary" onClick={()=>window.print()}>Print A6 tent</button>
        </div>
      </div>

      {/* كرت A6 للطباعة (تصميم بسيط وأنيق) */}
      <div className="bg-white rounded-xl shadow p-6 noprint:hidden print:block">
        <div className="nfc-a6 relative overflow-hidden">
          {coverUrl && (
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.06] bg-center bg-cover"
              style={{ backgroundImage: `url(${coverUrl})` }}
            />
          )}
          <div className="relative p-5">
            <header className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl overflow-hidden ring-1 ring-indigo-100 grid place-items-center bg-indigo-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover"/> : <span className="font-bold text-indigo-700">R</span>}
              </div>
              <div className="min-w-0">
                <div className="font-semibold" dir="auto">{serviceName}</div>
                {nodeName && <div className="text-xs text-slate-600" dir="auto">{nodeName}</div>}
                {address && <div className="text-[11px] text-slate-500" dir="auto">{address}</div>}
              </div>
              <div className="ml-auto text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full ring-1 ring-emerald-100">NFC-enabled</div>
            </header>

            <div className="text-center my-4">
              <div className="text-lg font-semibold">قرّب جوالك للتقييم</div>
              <div className="text-slate-600 text-sm">Tap your phone to leave a quick review</div>
            </div>

            <div className="text-center mt-4 text-[11px] text-slate-500 break-all">{nfcUrl}</div>

            <footer className="mt-4 text-center text-[10px] text-slate-400">
              rateverse.io • Verified via NFC / QR / Invite
            </footer>
          </div>
        </div>
      </div>

      <style jsx>{`
        .nfc-a6 {
          width: 148mm;  /* A6 */
          min-height: 105mm;
          border: 1px solid #e5e7eb; border-radius: 12px; background: white;
        }
        @media print {
          .noprint\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          body { background: white; }
          .nfc-a6 { border: none; }
        }
      `}</style>
    </div>
  );
}
