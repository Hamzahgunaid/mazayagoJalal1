"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ResultItem = { label: string; href: string; type: string };
type CmdItem = { id: string; label: string; hint?: string; run: () => void };

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (window as any).openCommandPalette = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/admin/schema", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setTables(Object.keys(j.tables || {})))
      .catch(() => setTables([]));
  }, [open]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!q.trim()) {
        if (active) setResults([]);
        return;
      }
      const r = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
      const data = await r.json().catch(() => []);
      if (active) setResults(data || []);
    })();
    return () => { active = false; };
  }, [q]);

  const commands = useMemo<CmdItem[]>(() => {
    const base: CmdItem[] = [
      { id: "go-console", label: "Open Admin Console", hint: "/admin", run: () => (window.location.href = "/admin") },
      { id: "go-reports", label: "Jump to Reports", hint: "section: reports", run: () => (window.location.href = "/admin?section=reports") },
      { id: "go-audit", label: "Open Audit Log", hint: "section: audit", run: () => (window.location.href = "/admin?section=audit") },
      {
        id: "toggle-readonly-chip",
        label: "Toggle read-only indicator view",
        hint: "show/hide chip",
        run: () => {
          window.dispatchEvent(new CustomEvent("admin:toggle-readonly-chip"));
        },
      },
    ];

    const tableCommands = tables.slice(0, 40).map((table) => ({
      id: `table-${table}`,
      label: `Open table: ${table}`,
      hint: "section: tables",
      run: () => (window.location.href = `/admin?section=tables&table=${encodeURIComponent(table)}`),
    }));

    const keyword = q.trim().toLowerCase();
    const full = [...base, ...tableCommands];
    if (!keyword) return full.slice(0, 18);
    return full.filter((item) => item.label.toLowerCase().includes(keyword) || item.hint?.toLowerCase().includes(keyword)).slice(0, 18);
  }, [q, tables]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-8" onClick={() => setOpen(false)}>
      <div className="w-full max-w-2xl rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Quick search commands, tables, services..."
          className="h-10 w-full rounded-md border border-slate-300 px-3 outline-none"
        />

        <div className="mt-3 max-h-80 overflow-auto">
          <div className="mb-2 px-2 text-xs font-semibold text-slate-500">Commands</div>
          {commands.map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => {
                cmd.run();
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-slate-50"
            >
              <div>
                <div className="font-medium">{cmd.label}</div>
                {cmd.hint && <div className="text-xs text-slate-500">{cmd.hint}</div>}
              </div>
              <div className="text-xs text-slate-400">↩</div>
            </button>
          ))}

          <div className="mt-4 mb-2 px-2 text-xs font-semibold text-slate-500">Search Results</div>
          {results.map((it, idx) => (
            <a key={idx} href={it.href} className="flex items-center justify-between rounded px-3 py-2 hover:bg-slate-50">
              <div>
                <div className="font-medium">{it.label}</div>
                <div className="text-xs text-slate-500">{it.type}</div>
              </div>
              <div className="text-xs text-slate-400">↩</div>
            </a>
          ))}
          {results.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No extra search results.</div>}
        </div>
      </div>
    </div>
  );
}
