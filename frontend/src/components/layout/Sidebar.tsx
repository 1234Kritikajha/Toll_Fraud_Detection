import { NavLink, useLocation } from "react-router-dom";
import {
  Settings, X, PlusCircle, ShieldAlert, Sliders, FileText,
  Search, Shield, FolderPlus, Upload, Download, MapPin, Eye,
  Play, RefreshCw
} from "lucide-react";
import { getNavItems } from "../../routes/routes";
import { Button } from "../ui/Button";
import { cn } from "../ui/utils";
import { useAuth } from "../../auth/AuthContext";
import { useAlertsQuickActions, type QuickActionId } from "../../context/AlertsQuickActionsContext";


type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ collapsed, mobileOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const alertsActions = useAlertsQuickActionsSafe();
  
  // Get navigation items based on user role
  // Check localStorage for admin status to ensure immediate UI update
  const isAdmin = user?.is_super_admin || (() => {
    try {
      const userInfo = localStorage.getItem("user_info");
      if (userInfo) {
        const userData = JSON.parse(userInfo);
        return userData.is_super_admin || userData.username === "Kritika"; // Admin username from environment
      }
    } catch {
      // ignore
    }
    return false;
  })();
  
  const navItems = getNavItems(isAdmin);

  // Get Quick Actions based on route
  const getQuickActions = () => {
    const path = location.pathname;
    if (path === "/alerts") {
      return [
        { label: "Create Alert Rule", icon: PlusCircle, action: "create-rule" as QuickActionId },
        { label: "Alert Escalation Matrix", icon: ShieldAlert, action: "escalation-matrix" as QuickActionId },
        { label: "Notification Settings", icon: Sliders, action: "notification-settings" as QuickActionId },
        { label: "Export Alert Report", icon: FileText, action: "export-report" as QuickActionId },
      ];
    }
    if (path === "/system-health") {
      return [
        { label: "Health Report (PDF)", icon: FileText },
        { label: "System Diagnostics", icon: Shield },
        { label: "View All Logs", icon: FileText },
        { label: "Maintenance Mode", icon: Settings },
      ];
    }
    if (path === "/investigation") {
      return [
        { label: "Create New Case", icon: FolderPlus },
        { label: "Search Vehicle", icon: Search },
        { label: "Upload Evidence", icon: Upload },
        { label: "Export Report", icon: Download },
      ];
    }
    if (path === "/vehicle-intelligence") {
      return [
        { label: "Search Vehicle", icon: Search },
        { label: "Add to Watchlist", icon: ShieldAlert },
        { label: "Generate Report", icon: FileText },
        { label: "View Full History", icon: Eye },
      ];
    }
    if (path === "/maps-analytics") {
      return [
        { label: "Search Vehicle", icon: Search },
        { label: "Track Route", icon: MapPin },
        { label: "Compare Plazas", icon: Sliders },
        { label: "Heatmap View", icon: Eye },
        { label: "Export Analytics", icon: Download },
      ];
    }
    if (path === "/live-monitoring") {
      return [
        { label: "Open Barrier (Lane 4)", icon: Play },
        { label: "Search Vehicle", icon: Search },
        { label: "Export Logs", icon: Download },
        { label: "Generate Report", icon: FileText },
      ];
    }
    return null;
  };

  const quickActions = getQuickActions();

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-[#0d1b2e] text-white transition-all duration-300 lg:translate-x-0",
          collapsed ? "w-[56px]" : "w-[152px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* LOGO */}
        <div className={cn("flex items-center gap-2 border-b border-white/10 px-3 py-3", collapsed && "justify-center px-2")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="text-[11px] font-bold text-white leading-none">AI Toll Fraud</p>
              <p className="text-[9px] text-blue-300/80 mt-0.5 leading-none">Detection System</p>
            </div>
          )}
          <Button className="ml-auto lg:hidden text-white/60 hover:text-white" variant="ghost" size="icon" onClick={onClose} aria-label="Close navigation">
            <X size={16} />
          </Button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              title={collapsed ? item.title : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-[11px] font-medium text-slate-400 transition-colors hover:bg-white/8 hover:text-white",
                  isActive && "bg-teal-500/20 text-teal-400 hover:bg-teal-500/25 hover:text-teal-400",
                  collapsed && "justify-center px-0"
                )
              }
            >
              <item.icon size={15} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.title}</span>}
            </NavLink>
          ))}

          {/* QUICK ACTIONS SECTION (If available and not collapsed) */}
          {!collapsed && quickActions && (
            <div className="mt-4 pt-3 border-t border-white/5 px-2">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Quick Actions</p>
              <div className="space-y-1">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if ("action" in action && action.action && alertsActions) {
                        alertsActions.openAction(action.action);
                      }
                      onClose();
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[10px] text-slate-400 hover:bg-white/5 hover:text-white transition-colors text-left"
                  >
                    <action.icon size={12} className="shrink-0 text-slate-500" />
                    <span className="truncate">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* ADMIN PROFILE */}
        {!collapsed && (
          <div className="border-t border-white/10 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-[11px] font-bold text-white">
                A
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-white">{user?.username ?? "User"}</p>
                <p className="truncate text-[10px] text-green-400">● {user?.is_super_admin ? "Super Administrator" : "Signed in"}</p>
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="border-t border-white/10 flex justify-center py-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-[11px] font-bold text-white">
              A
            </div>
          </div>
        )}
      </aside>

      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
}

function useAlertsQuickActionsSafe() {
  try {
    return useAlertsQuickActions();
  } catch {
    return null;
  }
}