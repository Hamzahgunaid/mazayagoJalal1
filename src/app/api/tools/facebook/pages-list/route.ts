export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error: "Use FB Connect in UI",
      detail: "This endpoint is deprecated. Use Connect with Facebook inside giveaway picker.",
    },
    { status: 410 },
  );
}
