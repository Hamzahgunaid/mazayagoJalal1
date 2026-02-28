"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { User, Store, MapPin, Shield, LogOut, Home, Sparkles } from "lucide-react";


type Item = { href: string; label: string; icon: "user" | "store" | "map" | "shield" | "home" | "offers" };
export default function UserMenuClient({
  avatarUrl,
  displayName,
  items,
  signOutLabel = "Sign out",
  signingOutLabel = "Signing out...",
}: {
  avatarUrl?: string;
  displayName: string;
  items: Item[];
  signOutLabel?: string;
  signingOutLabel?: string;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function IconSel({ k }: { k: Item["icon"] }) {
    const cls = "icon-std";
    if (k === "store") return <Store className={cls} />;
    if (k === "map") return <MapPin className={cls} />;
    if (k === "shield") return <Shield className={cls} />;
    if (k === "home") return <Home className={cls} />;
    if (k === "offers") return <Sparkles className={cls} />;
    return <User className={cls} />;
  }

  const renderItems = () => (
    <>
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-text transition hover:bg-primary-weak"
          onClick={() => setOpen(false)}
          role="menuitem"
        >
          <IconSel k={it.icon} />
          <span className="text-sm">{it.label}</span>
        </Link>
      ))}

      <button
        type="button"
        onClick={async () => {
          if (loggingOut) return;
          setOpen(false);
          setLoggingOut(true);
          try {
            const res = await fetch("/api/auth/logout", { method: "POST" });
            if (!res.ok) throw new Error("Failed to sign out");
            window.location.href = "/offers";
          } catch (err) {
            console.error(err);
            setLoggingOut(false);
          }
        }}
        className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-danger hover:bg-danger/10 disabled:opacity-60"
        disabled={loggingOut}
      >
        <LogOut className="icon-std-strong" /> <span>{loggingOut ? signingOutLabel : signOutLabel}</span>
      </button>
    </>
  );

  return (
    <div className="relative" ref={triggerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-full px-2.5 py-1.5 text-text hover:bg-primary-weak transition duration-fast ease-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="size-9 rounded-full overflow-hidden ring-1 ring-border bg-background">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted">
              <User className="icon-std" />
            </div>
          )}
        </span>
        <span className="max-w-[160px] truncate text-sm text-text">{displayName}</span>
      </button>

      {open && mounted && (
        <>
          {createPortal(
            <div className="md:hidden">
              <div className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
              <div
                role="menu"
                className="fixed inset-x-4 top-24 z-[210] rounded-3xl border border-border bg-surface p-4 shadow-card"
              >
                {renderItems()}
              </div>
            </div>,
            document.body
          )}

          <div className="absolute right-0 top-[calc(100%+0.5rem)] hidden w-56 rounded-2xl border border-border bg-surface p-2 shadow-card md:block">
            {renderItems()}
          </div>
        </>
      )}
    </div>
  );
}
