
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { pool } from "@/lib/db";

export async function requireUser() {
  const u = await currentUser();
  if (!u) return { user: null as any, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  return { user: u, response: null as any };
}

export { pool };
