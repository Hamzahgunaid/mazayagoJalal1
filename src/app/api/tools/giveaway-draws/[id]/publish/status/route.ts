export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDrawById } from "@/lib/tools/giveawayPicker";
import { getR2Json, getR2PipelineClient } from "@/lib/server/r2Pipeline";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const draw = await getDrawById(params.id);
  if (!draw) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const slug = draw.public_view_slug;
  if (!slug) return NextResponse.json({ ok: true, data: { status: "not_published" } });

  const r2 = getR2PipelineClient();
  if (!r2) {
    return NextResponse.json({ ok: true, data: { status: "fallback", storage: "fallback", manifest: null, render_status: null } });
  }

  const base = `giveaway/${slug}`;
  const manifest = await getR2Json(r2, `${base}/manifest.json`);
  const renderStatus = await getR2Json(r2, `${base}/render-status.json`);
  return NextResponse.json({ ok: true, data: { status: renderStatus?.status || "packaged", storage: "R2", manifest, render_status: renderStatus } });
}
