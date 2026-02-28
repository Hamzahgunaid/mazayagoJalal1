import { Pool, PoolConfig } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __rv_pool__: Pool | undefined;
}

function makeConfig(): PoolConfig {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("Missing DATABASE_URL");

  // Remove sslmode from the connection string when present
  let cleaned = raw;
  try {
    const u = new URL(raw);
    if (u.searchParams.has("sslmode")) u.searchParams.delete("sslmode");
    cleaned = u.toString();
  } catch {
    // ignore parse errors
  }

  const shouldUseSsl = process.env.USE_LOCAL_DB !== "true";

  return {
    connectionString: cleaned,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
    max: parseInt(process.env.PGPOOL_MAX || "5", 10),
    idleTimeoutMillis: 30000,
  };
}

/** Lazy singleton Pool */
export function getPool(): Pool {
  if (!globalThis.__rv_pool__) {
    if (!process.env.PGSSLMODE && process.env.USE_LOCAL_DB !== "true") {
      process.env.PGSSLMODE = "no-verify";
    }
    globalThis.__rv_pool__ = new Pool(makeConfig());
  }
  return globalThis.__rv_pool__!;
}

/** Proxy so that pool.query(...) works before connection initialised */
export const pool = new Proxy({} as unknown as Pool, {
  get(_target, prop) {
    const p: any = (getPool() as any)[prop];
    return typeof p === "function" ? p.bind(getPool()) : p;
  },
});

