import createMiddleware from 'next-intl/middleware';
import { defaultLocale, locales } from './src/i18n/settings';
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware({
  defaultLocale,
  locales: Array.from(locales),
  localePrefix: 'never',
});

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminPagePath = pathname.startsWith("/admin");
  const isAdminApiPath = pathname.startsWith("/api/admin");

  if (isAdminPagePath || isAdminApiPath) {
    const token = req.cookies.get("rv_session")?.value;
    if (!token) {
      if (isAdminApiPath) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/sign-in";
      return NextResponse.redirect(url);
    }

    if (isAdminPagePath) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-admin-shell", "1");
      const res = NextResponse.next({ request: { headers: requestHeaders } });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    const apiRes = NextResponse.next();
    apiRes.headers.set("Cache-Control", "no-store");
    return apiRes;
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    '/((?!api|_next|.*\\..*).*)',
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
