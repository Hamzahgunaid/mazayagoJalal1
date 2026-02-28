import { cookies } from "next/headers";
import { pool } from "@/lib/db";

export type CurrentUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
};

export async function currentUser(): Promise<CurrentUser | null> {
  const c = cookies();
  const token = c.get("rv_session")?.value;
  if (!token) return null;

  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.display_name, u.phone, u.avatar_url
       FROM public.user_sessions us
       JOIN public.users u ON u.id = us.user_id
       WHERE us.token = $1::uuid AND us.expires_at > now()
       LIMIT 1`,
      [token]
    );
    const row = rows[0] as CurrentUser | undefined;
    return row ?? null;
  } catch (err) {
    console.error('currentUser: failed to load session', err);
    return null;
  }
}

export async function isPlatformAdmin(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM public.platform_roles WHERE user_id=$1 AND role='platform_admin' LIMIT 1`,
      [userId]
    );
    return !!rows[0];
  } catch (err) {
    console.error("isPlatformAdmin: failed to resolve role", err);
    return false;
  }
}

export async function createSession(
  userId: string,
  maxAgeDays = 30,
  extras?: { userAgent?: string; ip?: string }
) {
  const { randomUUID } = await import("node:crypto");
  const token = randomUUID();
  const expires = new Date(Date.now() + maxAgeDays * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO public.user_sessions (user_id, token, created_at, expires_at, user_agent, ip)
     VALUES ($1, $2::uuid, NOW(), $3, $4, $5)`,
    [userId, token, expires, extras?.userAgent ?? null, extras?.ip ?? null]
  );

  const c = cookies();
  c.set("rv_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: maxAgeDays * 24 * 60 * 60
  });

  return { token, expiresAt: expires };
}

export async function logout() {
  const c = cookies();
  const token = c.get("rv_session")?.value;
  if (token) {
    await pool.query(`DELETE FROM public.user_sessions WHERE token=$1::uuid`, [token]);
  }
  c.set("rv_session", "", { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 0 });
}

/** هيلبر بسيط لتقليل تغييرات الملفات الأخرى */
export async function requireUser() {
  return currentUser();
}
