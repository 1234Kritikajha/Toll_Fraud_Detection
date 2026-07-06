import {
  Activity,
  AlertTriangle,
  BarChart3,
  Car,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Map,
  Radar,
  Settings,
  Shield,
  User as UserIcon,
} from "lucide-react";
import type { NavItem } from "../types";
import { Alerts } from "../pages/Alerts";
import { AdminPanel } from "../pages/AdminPanel";
import { Dashboard } from "../pages/Dashboard";
import { FraudDetection } from "../pages/FraudDetection";
import { Investigation } from "../pages/Investigation";
import LiveMonitoring from "../pages/LiveMonitoring";
import { MapsAnalytics } from "../pages/MapsAnalytics";
import { Reports } from "../pages/Reports";
import { SearchResults } from "../pages/SearchResults";
import { Settings as SettingsPage } from "../pages/Settings";
import { SystemHealth } from "../pages/SystemHealth";
import { VehicleIntelligence } from "../pages/VehicleIntelligence";
import { Login } from "../pages/Login";
import { UserInfo } from "../pages/UserInfo";
import { ProtectedRoute } from "../auth/ProtectedRoute";

export const getNavItems = (isAdmin: boolean): NavItem[] => {
  const commonItems = [
    { title: "Executive Dashboard", path: "/", icon: LayoutDashboard },
    { title: "Live Monitoring", path: "/live-monitoring", icon: Activity },
    { title: "Fraud Detection", path: "/fraud-detection", icon: Radar },
    { title: "Vehicle Intelligence", path: "/vehicle-intelligence", icon: Car },
    { title: "Maps & Analytics", path: "/maps-analytics", icon: Map },
    { title: "Investigation", path: "/investigation", icon: BarChart3 },
    { title: "Alerts", path: "/alerts", icon: AlertTriangle },
    { title: "System Health", path: "/system-health", icon: HeartPulse },
    { title: "Reports", path: "/reports", icon: FileText },
  ];

  const adminItems = [
    { title: "Admin Panel", path: "/admin", icon: Shield },
  ];

  const userItems = [
    { title: "User Info", path: "/user-info", icon: UserIcon },
  ];

  const settingsItem = { title: "Settings", path: "/settings", icon: Settings };

  if (isAdmin) {
    return [...commonItems, ...adminItems, settingsItem];
  } else {
    return [...commonItems, ...userItems, settingsItem];
  }
};

// Keep for backward compatibility
export const navItems = getNavItems(false);

export const appRoutes = [
  { path: "/login", element: <Login /> },
  { path: "/", element: <ProtectedRoute><Dashboard /></ProtectedRoute> },
  { path: "/live-monitoring", element: <ProtectedRoute><LiveMonitoring /></ProtectedRoute> },
  { path: "/fraud-detection", element: <ProtectedRoute><FraudDetection /></ProtectedRoute> },
  { path: "/vehicle-intelligence", element: <ProtectedRoute><VehicleIntelligence /></ProtectedRoute> },
  { path: "/maps-analytics", element: <ProtectedRoute><MapsAnalytics /></ProtectedRoute> },
  { path: "/investigation", element: <ProtectedRoute><Investigation /></ProtectedRoute> },
  { path: "/alerts", element: <ProtectedRoute><Alerts /></ProtectedRoute> },
  { path: "/system-health", element: <ProtectedRoute><SystemHealth /></ProtectedRoute> },
  { path: "/reports", element: <ProtectedRoute><Reports /></ProtectedRoute> },
  { path: "/search", element: <ProtectedRoute><SearchResults /></ProtectedRoute> },
  { path: "/admin", element: <ProtectedRoute><AdminPanel /></ProtectedRoute> },
  { path: "/user-info", element: <ProtectedRoute><UserInfo /></ProtectedRoute> },
  { path: "/settings", element: <ProtectedRoute><SettingsPage /></ProtectedRoute> },
];

