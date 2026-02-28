
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";

export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new NextResponse(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  return u;
}
