"use client";

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (cb: (resp: any) => void, opts: { scope: string }) => void;
      api: (path: string, cb: (resp: any) => void) => void;
    };
  }
}

const FB_SDK_URL = "https://connect.facebook.net/en_US/sdk.js";
export const FB_SCOPE_MINIMAL_PAGES = "pages_show_list,pages_read_engagement,pages_read_user_content";
export const FB_SCOPE_MANAGE = "pages_show_list,pages_read_engagement,pages_read_user_content,pages_manage_metadata,pages_messaging";

let sdkPromise: Promise<void> | null = null;

export type FacebookManagedPage = {
  id: string;
  name: string;
  access_token: string;
};

export function ensureFacebookSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Facebook SDK can only be loaded in browser"));
  }

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  if (!appId) {
    return Promise.reject(new Error("Missing NEXT_PUBLIC_FACEBOOK_APP_ID"));
  }

  if (window.FB) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    window.fbAsyncInit = function () {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v19.0",
      });
      resolve();
    };

    const existing = document.querySelector(`script[src=\"${FB_SDK_URL}\"]`);
    if (existing) return;

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = FB_SDK_URL;
    script.onerror = () => reject(new Error("Failed to load Facebook SDK"));
    document.body.appendChild(script);
  });

  return sdkPromise;
}

export async function connectAndGetManagedPages(scope: string = FB_SCOPE_MANAGE): Promise<FacebookManagedPage[]> {
  await ensureFacebookSdk();
  const fb = window.FB;
  if (!fb) throw new Error("Facebook SDK unavailable");

  await new Promise<void>((resolve, reject) => {
    fb.login(
      (resp: any) => {
        if (resp?.authResponse) resolve();
        else reject(new Error("Facebook login was not approved"));
      },
      { scope },
    );
  });

  const accounts = await new Promise<any>((resolve, reject) => {
    fb.api("/me/accounts?fields=id,name,access_token", (resp: any) => {
      if (!resp || resp.error) reject(new Error(resp?.error?.message || "Failed to fetch Facebook pages"));
      else resolve(resp);
    });
  });

  return (Array.isArray(accounts?.data) ? accounts.data : [])
    .map((item: any) => ({
      id: String(item?.id || ""),
      name: String(item?.name || ""),
      access_token: String(item?.access_token || ""),
    }))
    .filter((item: FacebookManagedPage) => item.id && item.name && item.access_token);
}
