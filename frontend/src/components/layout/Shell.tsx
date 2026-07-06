import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Button } from "../ui/Button";
import { cn } from "../ui/utils";

export function Shell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-foreground dark:bg-[#07111f]">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div
        className={cn(
          "min-h-screen transition-[padding] duration-300",
          collapsed ? "lg:pl-[56px]" : "lg:pl-[152px]"
        )}
      >
        <Topbar collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)}>
          <Button
            aria-label="Open navigation"
            className="lg:hidden"
            variant="outline"
            size="icon"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={16} />
          </Button>
        </Topbar>
        <main className="w-full px-4 pb-6 pt-4 sm:px-5">{children}</main>
      </div>
    </div>
  );
}
