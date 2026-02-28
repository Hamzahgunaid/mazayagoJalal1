// src/components/qr/QRPosterClient.tsx
"use client";

import { useMemo, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

type Props = {
  nodeId: string;
  serviceName: string;
  nodeName?: string | null;
  logoUrl?: string;
  coverUrl?: string;
  address?: string;
  serviceSlug?: string;
};

export default function QRPosterClient({
  nodeId,
  serviceName,
  nodeName,
  logoUrl,
  coverUrl,
  address,
  serviceSlug,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000");

  // رابط ثابت لا يتغير
  const qrUrl = useMemo(() => {
    return `${origin.replace(/\/+$/, "")}/qr/${nodeId}`;
  }, [origin, nodeId]);

  function printPage() {
    window.print();
  }

  function downloadSVG() {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rateverse-qr-${serviceSlug || "service"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPNG() {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const xml = new XMLSerializer().serializeToString(svg);
    const svg64 = window.btoa(unescape(encodeURIComponent(xml)));
    const image64 = "data:image/svg+xml;base64," + svg64;

    const img = new Image();
    img.src = image64;
    await img.decode();

    const size = 2048; // دقة عالية للطباعة
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rateverse-qr-${serviceSlug || "service"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  return (
    <div className="space-y-4">
      {/* أزرار التحكم (غير مرئية عند الطباعة) */}
      <div className="no-print flex flex-wrap gap-2">
        <button className="btn" onClick={downloadSVG}>Download SVG</button>
        <button className="btn" onClick={downloadPNG}>Download PNG</button>
        <button className="btn btn-primary" onClick={printPage}>Print A4</button>
      </div>

      {/* بوستر A4 */}
      <div className="bg-white rounded-xl shadow p-6 a4:shadow-none a4:p-0">
        <div className="poster-a4 mx-auto relative overflow-hidden">
          {/* خلفية غلاف خفيفة (watermark) */}
          {coverUrl && (
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.06] bg-center bg-cover"
              style={{ backgroundImage: `url(${coverUrl})` }}
            />
          )}

          <div className="relative poster-inner">
            {/* هيدر */}
            <header className="flex items-center gap-3 mb-6">
              <div className="shrink-0 w-16 h-16 rounded-2xl bg-indigo-600/10 grid place-items-center overflow-hidden ring-1 ring-indigo-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-indigo-700">R</span>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold leading-tight" dir="auto">
                  {serviceName}
                </h1>
                {nodeName && (
                  <div className="text-slate-600" dir="auto">{nodeName}</div>
                )}
                {address && (
                  <div className="text-xs text-slate-500 mt-1" dir="auto">{address}</div>
                )}
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <span className="inline-block size-1.5 rounded-full bg-emerald-600" />
                  Verified QR
                </span>
              </div>
            </header>

            {/* QR */}
            <div className="mt-2 mb-6 rounded-2xl p-6 bg-white/80 ring-1 ring-slate-200 flex justify-center">
              <QRCodeSVG
                value={qrUrl}
                size={512}
                level="M"
                includeMargin
                ref={svgRef as any}
              />
            </div>

            {/* نص تحفيزي */}
            <div className="text-center space-y-2">
              <div className="text-2xl font-semibold" dir="auto">قيِّمنا الآن</div>
              <div className="text-slate-700">Scan to write a quick review</div>
              <div className="text-xs text-slate-500 break-all mt-1">{qrUrl}</div>
            </div>

            {/* فاصل زخرفي */}
            <div className="my-8 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* تعليمات قصيرة (أيقونات نصية بسيطة دون مكتبات) */}
            <ol className="grid grid-cols-3 gap-4 text-center text-sm">
              <li className="space-y-1">
                <div className="font-semibold">1) افتح الكاميرا</div>
                <div className="text-slate-500">Open your camera</div>
              </li>
              <li className="space-y-1">
                <div className="font-semibold">2) امسح الكود</div>
                <div className="text-slate-500">Scan this QR</div>
              </li>
              <li className="space-y-1">
                <div className="font-semibold">3) اكتب رأيك</div>
                <div className="text-slate-500">Leave your review</div>
              </li>
            </ol>

            {/* فوتر صغير */}
            <footer className="mt-10 text-center text-xs text-slate-400">
              rateverse.io • Trusted reviews via QR / Invite / Organic
            </footer>
          </div>
        </div>
      </div>

      <style jsx>{`
        .poster-a4 { max-width: 210mm; }
        .poster-inner {
          width: 210mm; min-height: 297mm;
          padding: 16mm 12mm;
          border: 1px solid #e5e7eb; border-radius: 12px; background: white;
          box-sizing: border-box;
        }
        @media print {
          .no-print { display: none !important; }
          .poster-inner { border: none; border-radius: 0; padding: 18mm 14mm; box-shadow: none; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
