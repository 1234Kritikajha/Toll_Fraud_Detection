import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { fetchSearchResults, fetchSearchHistory } from "../services/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

export function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["search-results", query],
    queryFn: () => fetchSearchResults(query),
    enabled: !!query,
  });

  const navigate = useNavigate();

  const historyQuery = useQuery({
    queryKey: ["search-history"],
    queryFn: fetchSearchHistory,
    staleTime: 1000 * 60 * 5,
  });

  const results = data?.results ?? [];

  const noResults = !isLoading && !results.length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-lg font-bold">Search results for “{query}”</h1>
            <p className="text-sm text-slate-500">Search across vehicles, FASTag, transactions, alerts and system records.</p>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Recent searches</p>
              <p className="mt-1 text-sm text-slate-500">Quick access to your latest queries.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(historyQuery.data ?? []).map((item) => (
              <Button
                key={item.query}
                variant="outline"
                size="sm"
                onClick={() => navigate(`/search?q=${encodeURIComponent(item.query)}`)}
              >
                {item.query}
              </Button>
            ))}
          </div>
        </Card>
      </div>

      {isLoading ? (
        <Card className="p-5">
          <div className="space-y-3">
            <div className="h-4 w-1/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </Card>
      ) : error || noResults ? (
        <Card className="p-8 text-center">
          <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">No matching results found.</p>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Try another vehicle number, FASTag, or transaction ID.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              "Search by FASTag",
              "Search by Transaction ID",
              "Search by Toll Plaza",
            ].map((hint) => (
              <div key={hint} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                {hint}
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{data?.total ?? 0} results for</p>
                <h2 className="text-2xl font-bold">{query}</h2>
              </div>
              <Badge tone="teal">{data?.type ?? "global"}</Badge>
            </div>
          </Card>

          <div className="grid gap-4">
            {results.map((item, index) => (
              <Card key={`${item.type}-${index}`} className="p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-900 dark:text-slate-300">{item.type}</span>
                      <h3 className="truncate text-lg font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                    </div>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{item.subtitle}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {Object.entries(item.details || {}).slice(0, 4).map(([key, value]) => (
                      <span key={key} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
