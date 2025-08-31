import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Database, Play, RefreshCw, Send, Download } from "lucide-react";
import { API_BASE } from "@/assets/const";

function exportRowsToCSV(columns: string[], rows: any[], filename = "query-results.csv") {
  const esc = (val: any) => {
    if (val == null) return "";
    const s = String(val);
    // Quote if needed; escape inner quotes
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  const header = columns.map(esc).join(",");
  const body = rows.map((r: any) => columns.map((c) => esc(r?.[c])).join(",")).join("\n");
  const csv = header + "\n" + body;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderCell(val: any) {
  if (val == null) return "";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function normalizeSqlResult(data: any): { columns: string[]; rows: any[] } {
  // Helper guards
  const isArrayOfStrings = (x: any) => Array.isArray(x) && x.every((v) => typeof v === "string");
  const toObjects = (cols: string[], matrix: any[][]) =>
    (Array.isArray(matrix) ? matrix : []).map((arr: any[]) => {
      const obj: Record<string, any> = {};
      cols.forEach((c, i) => (obj[c] = arr?.[i]));
      return obj;
    });

  // (A) String payloads like:
  // "Returned columns and rows:  [[...],[...]] ['Name','AlbumCount']"
  if (typeof data === "string") {
    try {
      // grab the last two [...] arrays
      const matches = data.match(/\[[\s\S]*\]/g);
      if (matches && matches.length >= 2) {
        const a = JSON.parse(matches[matches.length - 2].replace(/'/g, '"'));
        const b = JSON.parse(matches[matches.length - 1].replace(/'/g, '"'));
        // normalize tuple
        return normalizeSqlResult([a, b]);
      }
    } catch {}
    return { columns: ["data"], rows: [{ data }] };
  }

  // (B) Array of row objects
  if (Array.isArray(data) && data.length && typeof data[0] === "object" && !Array.isArray(data[0])) {
    const cols = Array.from(new Set(data.flatMap((row) => Object.keys(row))));
    return { columns: cols, rows: data };
  }

  // (C) Tuple-like response: [rows, columns] OR [columns, rows]
  if (Array.isArray(data) && data.length === 2) {
    const [a, b] = data;
    const aIsCols = isArrayOfStrings(a);
    const bIsCols = isArrayOfStrings(b);

    if (aIsCols && Array.isArray(b)) {
      const cols: string[] = a;
      const matrix: any[][] = b;
      return { columns: cols, rows: toObjects(cols, matrix) };
    }
    if (bIsCols && Array.isArray(a)) {
      const cols: string[] = b;
      const matrix: any[][] = a;
      return { columns: cols, rows: toObjects(cols, matrix) };
    }
    // both look like matrices → synthesize generic column names
    if (Array.isArray(a) && Array.isArray(a[0])) {
      const width = Array.isArray(a[0]) ? a[0].length : 0;
      const cols = Array.from({ length: width }, (_, i) => "col_" + (i + 1));
      return { columns: cols, rows: toObjects(cols, a as any[][]) };
    }
  }

  // (D) Canonical shape: { columns: [], rows: [][] }
  if (data && Array.isArray((data as any).rows) && Array.isArray((data as any).columns)) {
    const cols: string[] = (data as any).columns;
    const matrix: any[][] = (data as any).rows;
    return { columns: cols, rows: toObjects(cols, matrix) };
  }

  // (E) { rows: [...] } only
  if (data && Array.isArray((data as any).rows)) {
    const rows = (data as any).rows;
    if (rows.length && Array.isArray(rows[0])) {
      const width = rows[0].length;
      const cols = Array.from({ length: width }, (_, i) => "col_" + (i + 1));
      return { columns: cols, rows: toObjects(cols, rows) };
    }
    const cols = Array.from(new Set(rows.flatMap((r: any) => Object.keys(r))));
    return { columns: cols, rows };
  }

  // Fallback: show raw
  return { columns: ["data"], rows: [{ data }] };
}

export function SQLPanel({ db }: { db: string }) {
  const [schema, setSchema] = useState<string>("Loading schema…");
  const [sql, setSql] = useState<string>("SELECT 1 as one;");
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[] | null>(null);
  const [columns, setColumns] = useState<string[] | null>(null);

  async function fetchSchema() {
    setLoadingSchema(true);
    setError(null);
    try {
      // Expect backend GET /schema?db=...
      const res = await fetch(`${API_BASE}/schema?db=${encodeURIComponent(db)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      setSchema(text || "(empty schema)");
    } catch (e: any) {
      setSchema("(failed to load schema)");
      setError(e.message || "Failed to load schema");
    } finally {
      setLoadingSchema(false);
    }
  }

  useEffect(() => {
    fetchSchema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  async function exec() {
    setRunning(true);
    setError(null);
    setRows(null);
    setColumns(null);
    try {
      // Expect backend POST /exec { sql, db }
      const res = await fetch(`${API_BASE}/exec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql, db }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        data = raw; // allow normalizeSqlResult to handle string payloads
      }
      const normalized = normalizeSqlResult(data);
      setColumns(normalized.columns);
      setRows(normalized.rows);
    } catch (e: any) {
      setError(e.message || "Query failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5"/>Current Schema</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {loadingSchema ? (
              <div className="text-sm text-zinc-500">Loading…</div>
            ) : (
              <pre className="bg-zinc-50 rounded-xl p-3 text-xs whitespace-pre-wrap border border-zinc-100">{schema}</pre>
            )}
            <Button variant="secondary" onClick={fetchSchema} disabled={loadingSchema} className="gap-2 w-max">
              {loadingSchema ? <RefreshCw className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
              Refresh Schema
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Run Safe SQL</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sql">SQL</Label>
              <Textarea id="sql" value={sql} onChange={(e) => setSql(e.target.value)} rows={10} className="font-mono text-sm"/>
              <p className="text-xs text-zinc-500">Only SELECT/EXPLAIN statements will be executed. DDL/DML are blocked by the backend.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={exec} disabled={running} className="gap-2">
                {running ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Play className="h-4 w-4"/>}
                Run
              </Button>
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <SQLResultTable columns={columns} rows={rows} />
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

function SQLResultTable({ columns, rows }: { columns: string[] | null; rows: any[] | null }) {
  if (!rows || !columns) return null;

  const handleExport = () => {
    exportRowsToCSV(columns, rows, "query-results.csv");
  };

  return (
    <div className="overflow-auto border border-zinc-100 rounded-xl">
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="text-xs text-zinc-500">
          {rows.length} row{rows.length === 1 ? "" : "s"}
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50">
          <tr>
            {columns.map((c) => (
              <th key={c} className="text-left px-3 py-2 font-medium text-zinc-600 border-b">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white even:bg-zinc-50/50">
              {columns.map((c) => (
                <td key={c} className="px-3 py-2 border-b align-top">
                  {renderCell((r as any)?.[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

