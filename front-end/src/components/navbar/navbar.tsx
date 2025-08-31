import { Label } from "@/components/ui/label";

const DB_OPTIONS = [
  { label: "Chinook (SQLite)", value: "chinook" },
  { label: "Marketing Demo", value: "marketing" },
  { label: "Ecommerce Demo", value: "ecommerce" },
  { label: "HR Demo", value: "hr" },
];

export function Navbar({ db, onChangeDb }: { db: string; onChangeDb: (v: string) => void }) {
  return (
    <div className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b">
      <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-2xl bg-zinc-900 text-white grid place-items-center font-bold">CE</div>
          <div className="text-lg font-semibold tracking-tight truncate">Conversation Data Explorer</div>
        </div>

        {/* DB selector */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-zinc-500">Database</Label>
          <select
            value={db}
            onChange={(e) => onChangeDb(e.target.value)}
            className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
          >
            {DB_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <div className="py-10 text-center text-xs text-zinc-500">© {new Date().getFullYear()} Your Name • Built with ❤️</div>
  );
}