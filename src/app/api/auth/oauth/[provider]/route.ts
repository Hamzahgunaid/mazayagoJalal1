import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/session";
import { randomUUID } from "node:crypto";

type Provider = "google" | "facebook";

type ProviderConfig = {
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
  prompt?: string;
  mapProfile: (profile: any) => {
    email?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
  };
};

const TERMS_URL = "https://www.mazayago.com/terms";
const PRIVACY_URL = "https://www.mazayago.com/privacy";
const TERMS_VERSION = "2025-08-10";
const PRIVACY_VERSION = "2025-08-10";

function parseFirstLocale(value: string | null) {
  if (!value) return undefined;
  return value.split(",")[0]?.trim() || undefined;
}

function resolveIp(headerList: Headers, req: Request) {
  const forwarded = headerList.get("x-forwarded-for") || headerList.get("x-real-ip") || "";
  const fromForwarded = forwarded.split(",")[0]?.trim();
  if (fromForwarded) return fromForwarded;
  const socketIp = (req as { socket?: { remoteAddress?: string } }).socket?.remoteAddress;
  return socketIp || undefined;
}

const PROVIDER_CONFIG: Record<Provider, ProviderConfig> = {
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    scope: "openid email profile",
    prompt: "select_account",
    mapProfile: (profile) => ({
      email: profile?.email ?? null,
      fullName: profile?.name ?? null,
      avatarUrl: profile?.picture ?? null,
    }),
  },
  facebook: {
    authorizeUrl: "https://www.facebook.com/v24.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v24.0/oauth/access_token",
    userInfoUrl: "https://graph.facebook.com/v24.0/me?fields=id,name,email,picture.width(256).height(256)",
    scope: "public_profile,email",
    mapProfile: (profile) => ({
      email: profile?.email ?? null,
      fullName: profile?.name ?? null,
      avatarUrl: profile?.picture?.data?.url ?? null,
    }),
  },
};

function requiredEnv(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable ${key}`);
  }
  return value;
}

function errorRedirect(origin: string, code: string, detail?: string) {
  const target = new URL("/sign-up", origin);
  target.searchParams.set("error", code);
  if (detail) target.searchParams.set("detail", detail);
  return NextResponse.redirect(target);
}

export async function GET(request: Request, context: { params: { provider: string } }) {
  const provider = (context.params?.provider?.toLowerCase() ?? "") as Provider;
  const config = PROVIDER_CONFIG[provider];
  const url = new URL(request.url);
  const origin = url.origin;

  if (!config) {
    return errorRedirect(origin, "provider_unavailable", "This provider is not enabled yet.");
  }

  try {
    const clientId = requiredEnv(`${provider.toUpperCase()}_OAUTH_CLIENT_ID`);
    const clientSecret = requiredEnv(`${provider.toUpperCase()}_OAUTH_CLIENT_SECRET`);

    const currentState = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    const errorParam = url.searchParams.get("error");
    if (errorParam) {
      return errorRedirect(origin, `oauth_${errorParam}`);
    }

    const redirectUri = `${origin}/api/auth/oauth/${provider}`;
    const cookieStore = cookies();
    const stateCookieName = `rv_oauth_state_${provider}`;

    if (!code) {
      const rawNext = url.searchParams.get("next");
      let nextPath: string | null = null;
      if (rawNext) {
        try {
          const parsedNext = new URL(rawNext, origin);
          if (parsedNext.origin === origin) {
            nextPath = `${parsedNext.pathname}${parsedNext.search}${parsedNext.hash}`;
          }
        } catch {
          nextPath = null;
        }
      }
      const state = randomUUID();
      cookieStore.set(stateCookieName, JSON.stringify({ state, next: nextPath }), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 10 * 60,
      });

      const authorizeUrl = new URL(config.authorizeUrl);
      authorizeUrl.searchParams.set("client_id", clientId);
      authorizeUrl.searchParams.set("redirect_uri", redirectUri);
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("scope", config.scope);
      authorizeUrl.searchParams.set("state", state);
      if (config.prompt) authorizeUrl.searchParams.set("prompt", config.prompt);
      authorizeUrl.searchParams.set("access_type", "offline");

      return NextResponse.redirect(authorizeUrl);
    }

    const storedStateRaw = cookieStore.get(stateCookieName)?.value;
    if (!storedStateRaw) {
      return errorRedirect(origin, "missing_state");
    }
    let nextPath: string | null = null;
    try {
      const parsed = JSON.parse(storedStateRaw);
      if (parsed?.state !== currentState) {
        return errorRedirect(origin, "state_mismatch");
      }
      if (typeof parsed?.next === "string" && parsed.next.startsWith("/")) {
        nextPath = parsed.next;
      }
    } catch (err) {
      return errorRedirect(origin, "state_invalid");
    } finally {
      cookieStore.delete(stateCookieName);
    }

    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      return errorRedirect(origin, "token_exchange_failed");
    }
    const tokenJson = await tokenResponse.json();
    const accessToken = tokenJson?.access_token;
    if (!accessToken) {
      return errorRedirect(origin, "missing_access_token");
    }

    const profileResponse = await fetch(config.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileResponse.ok) {
      return errorRedirect(origin, "profile_fetch_failed");
    }
    const profileJson = await profileResponse.json();
    const mapped = config.mapProfile(profileJson);
    const facebookUserId = provider === "facebook" ? String(profileJson?.id || "").trim() : "";

    if (!mapped.email) {
      if (provider === "facebook") {
        return errorRedirect(origin, "facebook_email_missing");
      }
      return errorRedirect(origin, "email_not_provided");
    }

    const client = await pool.connect();
    let userId: string | undefined;
    try {
      await client.query("BEGIN");
      const user = await client.query<{ id: string }>(
        "SELECT id FROM public.users WHERE email=$1 LIMIT 1",
        [mapped.email]
      );
      let createdUser = false;
      if (user.rows[0]) {
        userId = user.rows[0].id;
      } else {
        const insert = await client.query<{ id: string }>(
        `INSERT INTO public.users (email, full_name, avatar_url, status, created_at, updated_at, meta_json)
         VALUES ($1, $2, $3, 'active', now(), now(), jsonb_build_object('oauth_provider', $4::text))
         RETURNING id`,
          [mapped.email, mapped.fullName ?? mapped.email, mapped.avatarUrl ?? null, provider],
        );
        userId = insert.rows[0]?.id;
        createdUser = true;
      }

      if (provider === "facebook" && userId && facebookUserId) {
        await client.query(
          `UPDATE public.users
              SET meta_json = jsonb_set(
                COALESCE(meta_json, '{}'::jsonb),
                '{oauth,facebook,user_id}',
                to_jsonb($2::text),
                true
              ),
                  updated_at = now()
            WHERE id = $1`,
          [userId, facebookUserId]
        );
      }

      if (createdUser && userId) {
        const headerList = headers();
        const userAgent = headerList.get("user-agent") || null;
        const ip = resolveIp(headerList, request) || null;
        const locale = parseFirstLocale(headerList.get("accept-language")) || null;
        const source = `signup_${provider}`;
        const consentResult = await client.query(
          `INSERT INTO public.user_legal_consents
            (user_id, doc_type, doc_url, doc_version, accepted_at, ip, user_agent, locale, source, metadata)
           VALUES
            ($1, 'terms', $2, $3, now(), $4, $5, $6, $7, '{}'::jsonb),
            ($1, 'privacy', $8, $9, now(), $4, $5, $6, $7, '{}'::jsonb)
           ON CONFLICT (user_id, doc_type, doc_version) DO NOTHING`,
          [userId, TERMS_URL, TERMS_VERSION, ip, userAgent, locale, source, PRIVACY_URL, PRIVACY_VERSION]
        );
        if (consentResult.rowCount > 0) {
          console.info("Inserted legal consents for user", { userId, source });
        }
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    if (!userId) {
      return errorRedirect(origin, "user_creation_failed");
    }

    const headerList = headers();
    const userAgent = headerList.get("user-agent") || undefined;
    const ip = resolveIp(headerList, request);
    await createSession(userId, 30, { userAgent, ip });

    const successUrl = new URL(nextPath || "/", origin);
    successUrl.searchParams.set("signed_with", provider);
    return NextResponse.redirect(successUrl);
  } catch (err: any) {
    console.error(`OAuth error (${provider})`, err);
    return errorRedirect(origin, "oauth_unexpected", err?.message);
  }
}
