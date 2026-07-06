import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type QuickActionId =
  | "create-rule"
  | "escalation-matrix"
  | "notification-settings"
  | "export-report"
  | "acknowledge"
  | "assign"
  | "false-positive"
  | "block-vehicle"
  | "video-replay"
  | "live-camera"
  | "ai-report"
  | "maintenance-ticket"
  | "investigation-timeline"
  | "create-investigation";

type AlertsQuickActionsContextValue = {
  activeModal: QuickActionId | null;
  selectedAlertId: string | null;
  openAction: (action: QuickActionId, alertId?: string) => void;
  closeAction: () => void;
};

const AlertsQuickActionsContext = createContext<AlertsQuickActionsContextValue | null>(null);

export function AlertsQuickActionsProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<QuickActionId | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  const openAction = useCallback((action: QuickActionId, alertId?: string) => {
    setActiveModal(action);
    setSelectedAlertId(alertId ?? null);
  }, []);

  const closeAction = useCallback(() => {
    setActiveModal(null);
    setSelectedAlertId(null);
  }, []);

  const value = useMemo(
    () => ({ activeModal, selectedAlertId, openAction, closeAction }),
    [activeModal, selectedAlertId, openAction, closeAction],
  );

  return (
    <AlertsQuickActionsContext.Provider value={value}>{children}</AlertsQuickActionsContext.Provider>
  );
}

export function useAlertsQuickActions() {
  const ctx = useContext(AlertsQuickActionsContext);
  if (!ctx) throw new Error("useAlertsQuickActions must be used within AlertsQuickActionsProvider");
  return ctx;
}
