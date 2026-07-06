import { Bell, ChevronLeft, ChevronRight, Mic, Moon, Search, Settings2, Sun } from "lucide-react";
import type { ReactNode, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { navItems } from "../../routes/routes";
import { useTheme } from "../../hooks/useTheme";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { fetchSearchSuggestions, saveSearchHistory, fetchUnreadNotificationsCount } from "../../services/api";
import type { SearchSuggestion } from "../../types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NotificationDrawer } from "../notifications/NotificationDrawer";

type TopbarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  children?: ReactNode;
};

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return (
    <div className="hidden flex-col items-end lg:flex">
      <span className="text-sm font-bold tabular-nums">{timeStr}</span>
      <span className="text-[10px] text-slate-500">{dateStr}</span>
    </div>
  );
}

function isSpeechRecognitionAvailable() {
  if (typeof window === "undefined") {
    return false;
  }

  const win = window as any;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

const pagePlaceholders: Record<string, string> = {
  "/": "Search by Vehicle / FASTag / Plate No.",
  "/live-monitoring": "Search by Vehicle / FASTag / Plate No.",
  "/fraud-detection": "Search by Vehicle / FASTag / Alert ID",
  "/vehicle-intelligence": "Search by Vehicle / FASTag / Plate No. / VIN",
  "/maps-analytics": "Search by Vehicle / FASTag / Plate No. / Plaza",
  "/investigation": "Search by Case ID / Vehicle / FASTag / Plate No.",
  "/alerts": "Search by Vehicle / FASTag / Plate No. / Alert ID",
  "/system-health": "Search platform health metrics by service, database, and uptime",
  "/reports": "Search by Report / Date / Category",
  "/settings": "Search by setting or preference key...",
};

const subtitles: Record<string, string> = {
  "/": "AI-powered toll fraud analytics and executive summary",
  "/live-monitoring": "Real-time monitoring of toll plazas, lanes, and FASTag transactions",
  "/fraud-detection": "AI-powered fraud detection and case management",
  "/vehicle-intelligence": "AI-powered vehicle profiling, behavior analysis and risk assessment",
  "/maps-analytics": "Geospatial insights and advanced analytics for toll fraud monitoring",
  "/investigation": "Manage cases, review evidence and track investigation progress",
  "/alerts": "Real-time alert monitoring and intelligent notifications",
  "/system-health": "Backend service and server health for the deployed toll platform",
  "/reports": "Generate, view and export comprehensive reports",
  "/settings": "Configure your theme, notifications, and application preferences",
};

export function Topbar({ collapsed, onToggleCollapse, children }: TopbarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme, setTheme } = useTheme();
  const navItem = navItems.find((item) => item.path === pathname);
  const title = navItem?.title ?? "Executive Dashboard";
  const placeholder = pagePlaceholders[pathname] ?? "Search...";

  const [searchText, setSearchText] = useState("");
  const [debouncedText, setDebouncedText] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [voiceActive, setVoiceActive] = useState(false);
  // Drawer closed by default in normal operation
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const { data: unreadResp } = useQuery({ queryKey: ["notifications", "unread_count"], queryFn: fetchUnreadNotificationsCount, staleTime: 1000 * 10 });
  const unread = (unreadResp as { unread?: number } | undefined)?.unread ?? 0;

  useEffect(() => {
    const saved = window.localStorage.getItem("search-history");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
      if (event.key === "/" && document.activeElement !== inputRef.current) {
        event.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedText(searchText.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    if (!debouncedText) {
      setSuggestions([]);
      return;
    }

    let canceled = false;
    fetchSearchSuggestions(debouncedText)
      .then((data) => {
        if (!canceled) {
          setSuggestions(data);
          setOpen(true);
          setActiveIndex(-1);
        }
      })
      .catch(() => {
        if (!canceled) setSuggestions([]);
      });
    return () => {
      canceled = true;
    };
  }, [debouncedText]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const saveRecentSearch = (query: string) => {
    setRecentSearches((current) => {
      const updated = [query, ...current.filter((item) => item !== query)].slice(0, 10);
      window.localStorage.setItem("search-history", JSON.stringify(updated));
      return updated;
    });
  };

  const performSearch = async (query: string) => {
    const normalized = query.trim();
    if (!normalized) return;
    setSearchText(normalized);
    setOpen(false);
    setActiveIndex(-1);
    saveRecentSearch(normalized);
    try {
      await saveSearchHistory(normalized);
    } catch {
      // ignore history save failures
    }
    navigate(`/search?q=${encodeURIComponent(normalized)}`);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        performSearch(suggestions[activeIndex].value);
      } else {
        performSearch(searchText);
      }
    }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setVoiceActive(true);
    recognition.onerror = () => setVoiceActive(false);
    recognition.onend = () => setVoiceActive(false);
    recognition.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript;
      if (text) {
        setSearchText(text);
        performSearch(text);
      }
    };
    recognition.start();
  };

  const hasSuggestions = open && (suggestions.length > 0 || recentSearches.length > 0);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#0d1b2e]">
      <div className="flex h-14 items-center gap-3 px-4">
        {/* Mobile menu */}
        {children}

        {/* Sidebar toggle */}
        <Button className="hidden lg:inline-flex" variant="outline" size="icon" onClick={onToggleCollapse} aria-label="Toggle sidebar">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>

        {/* Page title */}
        <div className="min-w-0 hidden lg:block">
          <h1 className="truncate text-base font-bold leading-tight">{title}</h1>
          <p className="truncate text-[11px] text-slate-500">{subtitles[pathname] ?? ""}</p>
        </div>

        {/* Search — center */}
        <div className="relative mx-auto hidden w-full max-w-2xl md:block" ref={searchRef}>
          <div className="flex h-11 w-full items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 shadow-sm transition duration-200 focus-within:border-primary dark:border-slate-700 dark:bg-slate-900/70">
            <Search size={18} className="text-slate-400" />
            <input
              ref={inputRef}
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
              placeholder={placeholder}
              value={searchText}
              onFocus={() => setOpen(true)}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Global search"
            />
            <Button variant="ghost" size="icon" onClick={() => performSearch(searchText)} aria-label="Search">
              <Search size={16} />
            </Button>
            <Button
              variant={voiceActive ? "primary" : "outline"}
              size="icon"
              onClick={startVoiceSearch}
              aria-label="Voice search"
            >
              <Mic size={16} />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setSearchText("")} aria-label="Clear search">
              <Settings2 size={16} className="transform rotate-45" />
            </Button>
          </div>

          {hasSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-0 right-0 z-50 mt-2 max-h-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-950"
            >
              <div className="space-y-2 p-3">
                {suggestions.length > 0 ? (
                  suggestions.map((item, index) => (
                    <button
                      key={`${item.type}-${item.value}-${index}`}
                      className={
                        `flex w-full items-start gap-3 rounded-2xl px-3 py-2 text-left transition ${
                          index === activeIndex ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-100 dark:hover:bg-slate-900"
                        }`
                      }
                      onMouseDown={() => performSearch(item.value)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.subtitle || item.type}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                    No live suggestions found. Try a vehicle number, FASTag, or transaction ID.
                  </div>
                )}
              </div>

              {recentSearches.length > 0 && (
                <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-800">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Recent searches</p>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((query) => (
                      <button
                        key={query}
                        className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        onMouseDown={() => performSearch(query)}
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {/* Live badge */}
          <span className="hidden items-center gap-1.5 rounded-full border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-600 dark:border-green-600/40 dark:bg-green-900/20 dark:text-green-400 sm:flex">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            Live
          </span>

          {/* Clock */}
          <LiveClock />

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className="relative"
              aria-label="Notifications"
              onClick={() => {
                setDrawerOpen((s) => !s);
                queryClient.invalidateQueries({ queryKey: ["notifications", "unread_count"] });
              }}
            >
              <Bell size={16} />
            </Button>
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unread}</span>
            )}
          </div>
          <NotificationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

          {/* Theme toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => toggleTheme()}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant={theme === "light" ? "primary" : "outline"} size="sm" onClick={() => setTheme("light")}>Light</Button>
              <Button variant={theme === "dark" ? "primary" : "outline"} size="sm" onClick={() => setTheme("dark")}>Dark</Button>
            </div>
          </div>

          {/* Admin */}
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white">A</div>
            <div className="hidden flex-col xl:flex">
              <span className="text-xs font-semibold leading-tight">Admin</span>
              <span className="text-[10px] text-green-500">● Online</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
