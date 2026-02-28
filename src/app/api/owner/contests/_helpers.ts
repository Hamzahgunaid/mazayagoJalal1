import { NextRequest, NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
export function ok(data: any = { ok: true }) {
  return NextResponse.json(data);
}
// TODO: بدّلها بمنطقك الحقيقي لاحقًا
export async function requireOwnerAuth(_req: NextRequest) {
  return { userId: null };
}
export function parseId(x: unknown): number {
  const n = Number(x);
  if (!Number.isFinite(n)) throw new Error("Invalid id");
  return n;
}
