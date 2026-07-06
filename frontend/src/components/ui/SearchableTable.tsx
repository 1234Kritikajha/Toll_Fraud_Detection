import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "./utils";

type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

type SearchableTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  selectedKey?: string;
  rowKey: (row: T) => string;
  actions?: (row: T) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
};

export function SearchableTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchKeys = [],
  searchPlaceholder = "Search...",
  onRowClick,
  selectedKey,
  rowKey,
  actions,
  loading,
  emptyMessage = "No records found.",
}: SearchableTableProps<T>) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(q)),
    );
  }, [data, query, searchKeys]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-slate-700/50 bg-slate-900/50 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
          aria-label={searchPlaceholder}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700/30">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-900/60 text-left text-slate-400">
              {columns.map((col) => (
                <th key={col.key} className={cn("px-3 py-2.5 font-semibold", col.className)}>{col.header}</th>
              ))}
              {actions && <th className="px-3 py-2.5 font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-3 py-8 text-center text-slate-500">
                  <div className="inline-flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                    Loading...
                  </div>
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-3 py-8 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {!loading && filtered.map((row) => {
              const key = rowKey(row);
              const selected = selectedKey === key;
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-slate-800/50 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-slate-800/30",
                    selected && "bg-teal-500/10",
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-3 py-2.5 text-slate-300", col.className)}>
                      {col.render ? col.render(row) : String(row[col.key] ?? "-")}
                    </td>
                  ))}
                  {actions && <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>{actions(row)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-500">{filtered.length} of {data.length} records</p>
    </div>
  );
}
