"use client";

import { useEffect, useMemo, useState } from "react";

type SchemaResponse = {
  writeEnabled: boolean;
  enums: Record<string, string[]>;
  tables: Record<string, {
    table: string;
    primaryKey: string | null;
    objectType?: "BASE TABLE" | "VIEW";
    columns: Array<{ name: string; type: string; isReadonly: boolean; isPrimaryKey?: boolean; nullable?: boolean }>;
    foreignKeys?: Array<{ column: string; referencesTable: string; referencesColumn: string }>;
    constraints?: Array<{ name: string; type: string }>;
    triggers?: Array<{ name: string; timing: string; event: string }> ;
    relatedFunctions?: string[];
  }>;
};

type Section = "overview" | "tables" | "reports" | "audit" | "settings";
type TableTab = "data" | "stats" | "schema" | "relations";

const SECTION_ITEMS: Array<{ key: Section; label: string }> = [
  { key: "overview", label: "Overview Dashboard" },
  { key: "tables", label: "Tables" },
  { key: "reports", label: "Reports" },
  { key: "audit", label: "Audit Log" },
  { key: "settings", label: "Settings" },
];

export default function AdminConsole({ adminName }: { adminName: string }) {
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [section, setSection] = useState<Section>("overview");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tableData, setTableData] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [showReadonlyChip, setShowReadonlyChip] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sectionParam = params.get("section") as Section | null;
    const tableParam = params.get("table");
    if (sectionParam && SECTION_ITEMS.some((s) => s.key === sectionParam)) setSection(sectionParam);
    if (tableParam) setSelectedTable(tableParam);
  }, []);

  useEffect(() => {
    const onToggle = () => setShowReadonlyChip((v) => !v);
    window.addEventListener("admin:toggle-readonly-chip", onToggle);
    return () => window.removeEventListener("admin:toggle-readonly-chip", onToggle);
  }, []);

  useEffect(() => {
    fetch("/api/admin/schema", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        setSchema(j);

        const params = new URLSearchParams(window.location.search);
        const requestedTable = params.get("table") || "";
        if (requestedTable && j?.tables?.[requestedTable]) {
          setSelectedTable(requestedTable);
          return;
        }

        setSelectedTable((prev) => prev || Object.keys(j.tables || {})[0] || "");
      });
  }, []);

  useEffect(() => {
    if (!selectedTable || section !== "tables") return;
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "25",
      sort: sort || "",
      sortDir,
      q: query,
    });
    fetch(`/api/admin/table/${selectedTable}?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setTableData);
  }, [section, selectedTable, page, sort, sortDir, query]);

  const tableNames = useMemo(() => Object.keys(schema?.tables || {}), [schema]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <a className="underline" href="/logout">Sign out</a>
            <span className="rounded bg-slate-100 px-2 py-1">{adminName}</span>
            <span className="rounded bg-purple-100 px-2 py-1">{process.env.NODE_ENV === "production" ? "Production" : "Preview"}</span>
            <span className="rounded bg-slate-100 px-2 py-1">⌘/Ctrl + K</span>
          </div>
          <input value={query} onChange={(e) => { setPage(1); setQuery(e.target.value); }} placeholder="Global search (tables + current table)" className="w-full rounded-lg border px-3 py-2 text-sm md:w-96" />
        </div>
        {schema && !schema.writeEnabled && showReadonlyChip && (
          <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">Read-only mode enabled (ADMIN_WRITE_ENABLED=false)</div>
        )}
      </div>

      <div className="rounded-2xl border bg-white p-2 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap gap-2">
          {SECTION_ITEMS.map((item) => (
            <button key={item.key} onClick={() => setSection(item.key)} className={`rounded-lg px-3 py-2 text-sm ${section === item.key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {section === "overview" && <OverviewCards />}
      {section === "tables" && (
        <TablesPanel
          tableNames={tableNames}
          selectedTable={selectedTable}
          setSelectedTable={(t: string) => { setSelectedTable(t); setPage(1); }}
          tableData={tableData}
          schema={schema}
          page={page}
          setPage={setPage}
          sort={sort}
          setSort={setSort}
          sortDir={sortDir}
          setSortDir={setSortDir}
        />
      )}
      {section === "reports" && <ReportsPanel />}
      {section === "audit" && <AuditPanel />}
      {section === "settings" && <SettingsPanel writeEnabled={schema?.writeEnabled ?? false} />}
    </div>
  );
}

function OverviewCards() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch("/api/admin/reports/overview", { cache: "no-store" }).then((r) => r.json()).then(setData); }, []);

  const cards = [
    ["Entries today", data?.entries?.today ?? "-"],
    ["Entries 7d", data?.entries?.d7 ?? "-"],
    ["Unique users", data?.entries?.unique_today ?? "-"],
    ["Active offers", data?.activeOffers ?? "-"],
    ["Active contests", data?.activeContests ?? "-"],
  ];

  return <div className="grid gap-3 md:grid-cols-3">{cards.map(([k, v]) => <Card key={String(k)} title={String(k)} value={String(v)} />)}</div>;
}

function Card({ title, value }: { title: string; value: string }) {
  return <div className="rounded-2xl border bg-white p-4 shadow-sm ring-1 ring-slate-200"><div className="text-xs text-slate-500">{title}</div><div className="mt-2 text-2xl font-bold">{value}</div></div>;
}

function TablesPanel({ tableNames, selectedTable, setSelectedTable, tableData, schema, page, setPage, sort, setSort, sortDir, setSortDir }: any) {
  const [tab, setTab] = useState<TableTab>("data");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [jsonText, setJsonText] = useState("{}");
  const [busyRow, setBusyRow] = useState<string | null>(null);

  const meta = schema?.tables?.[selectedTable];
  const pk = meta?.primaryKey || "id";
  const allColumns = Object.keys(tableData?.rows?.[0] || {}).length ? Object.keys(tableData?.rows?.[0] || {}) : (meta?.columns?.map((c: any) => c.name) || []);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    allColumns.forEach((c) => (next[c] = visibleColumns[c] ?? true));
    setVisibleColumns(next);
  }, [selectedTable]);

  async function refreshTable() {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "25",
      sort: sort || "",
      sortDir,
    });
    const res = await fetch(`/api/admin/table/${selectedTable}?${params.toString()}`, { cache: "no-store" });
    const j = await res.json();
    if (res.ok) {
      window.dispatchEvent(new CustomEvent("admin:table-refreshed", { detail: { table: selectedTable } }));
      location.reload();
    } else {
      alert(j?.error || "Refresh failed");
    }
  }

  async function createRecord() {
    try {
      const parsed = JSON.parse(jsonText);
      const res = await fetch(`/api/admin/table/${selectedTable}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return alert(j?.error || "Create failed");
      alert("Record created");
      await refreshTable();
    } catch {
      alert("Invalid JSON payload");
    }
  }

  async function editRow(row: any) {
    if (!schema?.writeEnabled) return;
    const raw = prompt("Edit JSON for row values", JSON.stringify(row, null, 2));
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const idValue = String(row?.[pk] ?? "");
      if (!idValue) return alert("Missing primary key for row");
      setBusyRow(idValue);
      const res = await fetch(`/api/admin/table/${selectedTable}/${encodeURIComponent(idValue)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: parsed }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return alert(j?.error || "Update failed");
      alert("Record updated");
      await refreshTable();
    } catch {
      alert("Invalid JSON for update");
    } finally {
      setBusyRow(null);
    }
  }

  async function deleteRow(row: any) {
    if (!schema?.writeEnabled) return;
    const idValue = String(row?.[pk] ?? "");
    if (!idValue) return alert("Missing primary key for row");

    const phrase = prompt(`Type exactly: DELETE ${selectedTable}`);
    if (!phrase) return;
    if (phrase !== `DELETE ${selectedTable}`) {
      alert("Invalid confirmation phrase");
      return;
    }

    const sure = confirm(`Delete row ${idValue}? This action cannot be undone.`);
    if (!sure) return;

    try {
      setBusyRow(idValue);
      const res = await fetch(`/api/admin/table/${selectedTable}/${encodeURIComponent(idValue)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmPhrase: phrase }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return alert(j?.error || "Delete failed");
      alert("Record deleted");
      await refreshTable();
    } finally {
      setBusyRow(null);
    }
  }

  const shownColumns = allColumns.filter((c) => visibleColumns[c] !== false);

  return (
    <div className="grid gap-4 lg:grid-cols-[260px,1fr]">
      <aside className="rounded-2xl border bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <div className="mb-2 text-xs text-slate-500">Tables</div>
        <div className="max-h-[420px] space-y-1 overflow-auto">
          {tableNames.map((table: string) => (
            <button key={table} className={`block w-full rounded px-2 py-1 text-left text-xs ${selectedTable === table ? "bg-blue-100 text-blue-900" : "hover:bg-slate-100"}`} onClick={() => setSelectedTable(table)}>{table}</button>
          ))}
        </div>
      </aside>

      <div className="rounded-2xl border bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Table: {selectedTable || "-"} {meta?.objectType ? <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-[10px]">{meta.objectType}</span> : null}</h2>
          <div className="flex items-center gap-2">
            <a href={`/api/admin/table/${selectedTable}?export=csv`} className="rounded border px-2 py-1 text-xs">Export CSV</a>
            <button className="rounded border px-2 py-1 text-xs" onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}>Sort: {sortDir}</button>
          </div>
        </div>

        <div className="mb-3 flex gap-2 text-xs">
          {(["data", "stats", "schema", "relations"] as TableTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded px-2 py-1 ${tab === t ? "bg-slate-900 text-white" : "bg-slate-100"}`}>{t[0].toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        {tab === "data" && (
          <>
            <div className="mb-2 flex flex-wrap gap-2 text-xs">
              {allColumns.slice(0, 20).map((c) => (
                <label key={c} className="flex items-center gap-1 rounded border px-2 py-1">
                  <input type="checkbox" checked={visibleColumns[c] !== false} onChange={(e) => setVisibleColumns((prev) => ({ ...prev, [c]: e.target.checked }))} />
                  <span>{c}</span>
                </label>
              ))}
            </div>

            <div className="overflow-auto rounded border">
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    {shownColumns.map((c: string) => (
                      <th key={c} className="cursor-pointer border-b bg-slate-50 px-2 py-1 text-left" onClick={() => setSort(c)}>{c}</th>
                    ))}
                    <th className="border-b bg-slate-50 px-2 py-1 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(tableData?.rows || []).map((r: any, i: number) => {
                    const rowId = String(r?.[pk] ?? i);
                    return (
                      <tr key={rowId}>
                        {shownColumns.map((c: string) => <td key={c} className="border-b px-2 py-1">{renderCell(c, r[c])}</td>)}
                        <td className="border-b px-2 py-1">
                          <div className="flex gap-1">
                            <button className="rounded border px-2 py-0.5" onClick={() => alert(JSON.stringify(r, null, 2))}>View</button>
                            <button className="rounded border px-2 py-0.5 disabled:opacity-50" disabled={!schema?.writeEnabled || busyRow === rowId} onClick={() => editRow(r)}>Edit</button>
                            <button className="rounded border px-2 py-0.5 disabled:opacity-40" disabled={!schema?.writeEnabled || busyRow === rowId} onClick={() => deleteRow(r)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <div>Rows: {tableData?.total ?? 0}</div>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} className="rounded border px-2 py-1 disabled:opacity-40" onClick={() => setPage((p: number) => Math.max(1, p - 1))}>Prev</button>
                <span>Page {page}</span>
                <button className="rounded border px-2 py-1" onClick={() => setPage((p: number) => p + 1)}>Next</button>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t pt-3">
              <div className="text-sm font-medium">Add Row (JSON)</div>
              <textarea className="w-full rounded border p-2 font-mono text-xs" rows={5} value={jsonText} onChange={(e) => setJsonText(e.target.value)} />
              <div className="flex items-center gap-3">
                <button
                  className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-40"
                  onClick={createRecord}
                  disabled={!schema?.writeEnabled}
                >
                  Add Row
                </button>
                {!schema?.writeEnabled && (
                  <span className="text-xs text-amber-700">
                    Write is disabled. Set ADMIN_WRITE_ENABLED=true in environment variables and redeploy/restart.
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {tab === "stats" && <div className="text-sm text-slate-700">Total: {tableData?.stats?.total ?? 0} • Last 24h: {tableData?.stats?.last_24h ?? 0} • Last 7d: {tableData?.stats?.last_7d ?? 0}</div>}

        {tab === "schema" && (
          <div className="space-y-3">
            <div className="overflow-auto rounded border">
              <table className="min-w-full text-xs">
                <thead><tr><th className="border-b bg-slate-50 px-2 py-1 text-left">Column</th><th className="border-b bg-slate-50 px-2 py-1 text-left">Type</th><th className="border-b bg-slate-50 px-2 py-1 text-left">PK</th></tr></thead>
                <tbody>{(meta?.columns || []).map((c: any) => <tr key={c.name}><td className="border-b px-2 py-1">{c.name}</td><td className="border-b px-2 py-1">{c.type}</td><td className="border-b px-2 py-1">{c.isPrimaryKey ? "yes" : ""}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="grid gap-3 md:grid-cols-3 text-xs">
              <div className="rounded border p-2">
                <div className="mb-1 font-semibold">Constraints</div>
                {(meta?.constraints || []).length ? (meta.constraints || []).map((c: any, i: number) => <div key={i}>{c.type}: {c.name}</div>) : <div className="text-slate-500">No constraints</div>}
              </div>
              <div className="rounded border p-2">
                <div className="mb-1 font-semibold">Triggers</div>
                {(meta?.triggers || []).length ? (meta.triggers || []).map((t: any, i: number) => <div key={i}>{t.name} ({t.timing} {t.event})</div>) : <div className="text-slate-500">No triggers</div>}
              </div>
              <div className="rounded border p-2">
                <div className="mb-1 font-semibold">Related Functions</div>
                {(meta?.relatedFunctions || []).length ? (meta.relatedFunctions || []).map((f: string, i: number) => <div key={i}>{f}</div>) : <div className="text-slate-500">No related functions</div>}
              </div>
            </div>
          </div>
        )}

        {tab === "relations" && (
          <div className="space-y-2 text-sm">
            {(meta?.foreignKeys || []).length === 0 ? <div className="text-slate-500">No foreign keys found.</div> : (meta.foreignKeys || []).map((fk: any, idx: number) => (
              <div key={idx} className="rounded border p-2">
                {fk.column} → <button className="underline" onClick={() => setSelectedTable(fk.referencesTable)}>{fk.referencesTable}</button>.{fk.referencesColumn}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function renderCell(column: string, value: any) {
  if (value === null || value === undefined) return "—";

  if (["id", "user_id", "contest_id", "offer_id"].includes(column) && typeof value === "string" && value.length > 12) {
    return (
      <span className="inline-flex items-center gap-1" title={value}>
        <span>{value.slice(0, 8)}…{value.slice(-4)}</span>
        <button className="rounded border px-1 text-[10px]" onClick={() => navigator.clipboard.writeText(value)}>Copy</button>
      </span>
    );
  }

  if (typeof value === "object") {
    const pretty = JSON.stringify(value, null, 2);
    return (
      <details>
        <summary className="cursor-pointer text-blue-700">JSON</summary>
        <pre className="max-w-[420px] overflow-auto whitespace-pre-wrap text-[10px]">{pretty}</pre>
      </details>
    );
  }

  if (typeof value === "string" && /(at|_at)$/.test(column)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleString();
  }

  return String(value);
}

function ReportsPanel() {
  const [contests, setContests] = useState<any>(null);
  const [users, setUsers] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/reports/contests", { cache: "no-store" }).then((r) => r.json()).then(setContests);
    fetch("/api/admin/reports/users", { cache: "no-store" }).then((r) => r.json()).then(setUsers);
  }, []);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card title="Contest/Offer Performance" value={`Rows: ${contests?.performance?.length ?? 0}`} />
      <Card title="Users Analytics" value={`Top participants: ${users?.topParticipants?.length ?? 0}`} />
    </div>
  );
}

function AuditPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [action, setAction] = useState("");
  const [table, setTable] = useState("");

  useEffect(() => {
    const params = new URLSearchParams({ page: "1", pageSize: "100" });
    if (action) params.set("action", action);
    if (table) params.set("table", table);
    fetch(`/api/admin/audit?${params.toString()}`, { cache: "no-store" }).then((r) => r.json()).then((j) => setRows(j.rows || []));
  }, [action, table]);

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="mb-3 flex flex-wrap gap-2">
        <input className="rounded border px-2 py-1 text-xs" placeholder="Filter action" value={action} onChange={(e) => setAction(e.target.value)} />
        <input className="rounded border px-2 py-1 text-xs" placeholder="Filter table" value={table} onChange={(e) => setTable(e.target.value)} />
      </div>
      {rows.length === 0 ? <div className="text-sm text-slate-500">No logs yet.</div> : (
        <ul className="space-y-1 text-xs">{rows.slice(0, 100).map((r: any) => <li key={r.id} className="border-b pb-1">{r.created_at}: {r.action} {r.table_name} ({r.record_pk || "-"})</li>)}</ul>
      )}
    </div>
  );
}

function SettingsPanel({ writeEnabled }: { writeEnabled: boolean }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm ring-1 ring-slate-200 text-sm space-y-2">
      <div>Write mode: <b>{writeEnabled ? "enabled" : "disabled"}</b></div>
      <div className="text-xs text-slate-600">
        To enable writes, set <code>ADMIN_WRITE_ENABLED=true</code> in your environment variables, then redeploy/restart the app.
      </div>
      <div className="text-xs text-slate-600">
        To allow additional tables/views in future, set <code>ADMIN_EXTRA_TABLES</code> and/or <code>ADMIN_EXTRA_VIEWS</code> (comma-separated) and redeploy.
      </div>
    </div>
  );
}
