import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/codeblock";
import { FileText, RefreshCw, Send } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { s } from "framer-motion/client";


type ChartSpec = {
  type: "bar" | "line" | "scatter" | "none";
  x: string | null;
  y: string | null;
  legend: string | null;
};

// WITH this:
type AskAnswer = {
  reasoning?: string;
  sql?: string;
  chart?: ChartSpec | null;
};

const PROVIDERS = [
  { label: "OpenAI", value: "openai" },
  { label: "Gemini", value: "gemini" },
  { label: "Groq", value: "groq" },
  { label: "Ollama", value: "ollama" },
];

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE ?? "http://localhost:8000";

function demoData(chart?: ChartSpec | null) {
  const xs = Array.from({ length: 10 }, (_, i) => i + 1);
  return xs.map((x) => ({ x, y: Math.round(Math.sin(x) * 10 + 10) }));
}

function ChartRenderer({ chart, data }: { chart: ChartSpec | null | undefined; data?: any[] }) {
  const dataFinal = useMemo(() => data ?? demoData(chart), [chart, data]);
  if (!chart || chart.type === "none") return null;

  return (
    <div className="grid gap-2">
      <div className="text-xs uppercase tracking-wide text-zinc-500">Chart</div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === "bar" ? (
            <BarChart data={dataFinal}>
              <XAxis dataKey={chart.x || "x"} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={chart.y || "y"} name={chart.legend || "Value"} />
            </BarChart>
          ) : chart.type === "line" ? (
            <LineChart data={dataFinal}>
              <XAxis dataKey={chart.x || "x"} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line dataKey={chart.y || "y"} type="monotone" name={chart.legend || "Value"} />
            </LineChart>
          ) : (
            <ScatterChart>
              <XAxis dataKey={chart.x || "x"} />
              <YAxis dataKey={chart.y || "y"} />
              <Tooltip />
              <Legend />
              <Scatter data={dataFinal} name={chart.legend || "Value"} />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}



export function AskPanel({ db }: { db: string }) {
    const [prompt, setPrompt] = useState("");
    const [provider, setProvider] = useState<string>(PROVIDERS[1].value);
    const [answer, setAnswer] = useState<AskAnswer | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [chartSpec, setChartSpec] = useState<ChartSpec | null>(null);
    const [chartData, setChartData] = useState<any[] | null>(null);

    async function execAndGenerateChart(sqlOverride?: string) {
        const sql = (sqlOverride ?? answer?.sql ?? "").trim();
        if (!sql) {
            setError("No SQL to execute.");
            return;
        }

        setError(null);
        // setChartSpec(null);
        // setChartData(null);

        try {
            const res = await fetch(`${API_BASE}/exec`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ db, sql }),
            });

            const raw = await res.text();
            if (!res.ok) throw new Error(`HTTP ${res.status} ${raw}`);

            let data: any;
            try {
                data = JSON.parse(raw);
            } catch {
                data = raw; // tolerate stringy logs
            }

            console.log("Exec result (raw): ", data);
            const { columns, rows } = normalizeExecResult(data); // rows as objects

            // Prefer LLM's chart if valid; otherwise infer: first column = X, first numeric column = Y
            const provided = answer?.chart ?? null;
            const numericCols = columns.filter((c) => rows.some((r: any) => typeof r?.[c] === "number"));
            const xGuess = columns[0] ?? null;
            const yGuess = numericCols[0] ?? null;

            let spec: ChartSpec | null = null;
            if (
                provided &&
                provided.type !== "none" &&
                provided.x &&
                provided.y &&
                columns.includes(provided.x) &&
                columns.includes(provided.y)
            ) {
            spec = { ...provided };
            } else if (xGuess && yGuess) {
            spec = { type: "bar", x: xGuess, y: yGuess, legend: yGuess };
            }

            if (!spec) {
            setError("Could not infer a chart spec (need an X column and a numeric Y).");
            return;
            }

            setChartSpec(spec);
            setChartData(rows.map((r: any) => ({ [spec.x!]: r[spec.x!], [spec.y!]: r[spec.y!] })));
        } catch (e: any) {
            setError(e?.message ?? "Failed to execute SQL.");
        }
    }

  async function ask() {
    console.log("Asking: ", prompt, provider, db);
    setLoading(true);
    setAnswer(null);
    setError(null);
    setChartSpec(null);
    setChartData(null);

    try {
        const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt, provider, db }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status} ${data}`);
        console.log("Answer (raw): ", data);
        setAnswer(data.answer);
        if (data.answer.chart) { 
            setChartSpec(data.answer.chart);
        }
    } catch (e: any) {
        setError(e.message || "Request failed");
    } finally {
        setLoading(false);
    }
    }


  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5"/>Ask Your Data</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label className="text-sm">Provider</Label>
            <div className="flex items-center gap-2">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
              >
                {PROVIDERS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <span className="text-xs text-zinc-500">(Backend will route to selected LLM provider)</span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="prompt">Question</Label>
            <Textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder="Ask anything…"/>
          </div>

          <div className="flex gap-2">
            <Button onClick={ask} disabled={loading || !prompt.trim()} className="gap-2">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
              Send
            </Button>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          {answer && (
            <div className="grid gap-2">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Answer</div>
                <div className="p-3 rounded-xl bg-zinc-50 whitespace-pre-wrap text-sm">
                {answer.reasoning ?? <span className="text-zinc-400">No reasoning provided</span>}
                </div>

                {answer.sql && (
                <div className="grid gap-1">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Generated SQL</div>
                    <CodeBlock code={String(answer.sql)} />
                </div>
                )}

                {answer.chart && (
                <div className="grid gap-1">
                    <Button onClick={() => execAndGenerateChart(answer.sql ?? "")}>
                    Execute SQL & Generate Chart
                    </Button>
                </div>
                )}

                {chartData && (
                    <ChartRenderer chart={chartSpec} data={chartData} />
                )}
            </div>
            )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function normalizeExecResult(data: any): { columns: string[]; rows: any[] } {
  const isArrayOfStrings = (x: any) => Array.isArray(x) && x.every((v) => typeof v === "string");
  const toObjects = (cols: string[], matrix: any[][]) =>
    (Array.isArray(matrix) ? matrix : []).map((arr: any[]) => {
      const obj: Record<string, any> = {};
      cols.forEach((c, i) => (obj[c] = arr?.[i]));
      return obj;
    });

  if (typeof data === "string") {
    try {
      const matches = data.match(/\[[\s\S]*\]/g);
      if (matches && matches.length >= 2) {
        const a = JSON.parse(matches[matches.length - 2].replace(/'/g, '"'));
        const b = JSON.parse(matches[matches.length - 1].replace(/'/g, '"'));
        return normalizeExecResult([a, b]);
      }
    } catch {}
    return { columns: ["data"], rows: [{ data }] };
  }

  if (data && Array.isArray(data.columns) && Array.isArray(data.rows)) {
    if (data.rows.length && Array.isArray(data.rows[0])) {
      return { columns: data.columns, rows: toObjects(data.columns, data.rows) };
    }
    return { columns: data.columns, rows: data.rows };
  }

  if (Array.isArray(data) && data.length === 2) {
    const [a, b] = data;
    if (isArrayOfStrings(a) && Array.isArray(b)) return { columns: a, rows: toObjects(a, b) };
    if (isArrayOfStrings(b) && Array.isArray(a)) return { columns: b, rows: toObjects(b, a) };
    if (Array.isArray(a) && Array.isArray(a[0])) {
      const width = a[0]?.length ?? 0;
      const cols = Array.from({ length: width }, (_, i) => "col_" + (i + 1));
      return { columns: cols, rows: toObjects(cols, a as any[][]) };
    }
  }

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

  if (Array.isArray(data) && data.length && Array.isArray(data[0])) {
    const width = data[0].length;
    const cols = Array.from({ length: width }, (_, i) => "col_" + (i + 1));
    return { columns: cols, rows: toObjects(cols, data) };
  }

  return { columns: ["data"], rows: [{ data }] };
}