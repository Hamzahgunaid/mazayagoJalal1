export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { fetchFacebookPosts } from "@/lib/tools/giveawayPicker";

export async function GET(_req: Request, { params }: { params: { socialPageId: string } }) {
  try {
    const data = await fetchFacebookPosts(params.socialPageId);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 400 });
  }
}
