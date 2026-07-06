import { CreateAlertRuleModal } from "./quick-actions/CreateAlertRuleModal";
import { EscalationMatrixModal } from "./quick-actions/EscalationMatrixModal";
import { ExportAlertReportModal } from "./quick-actions/ExportAlertReportModal";
import { NotificationSettingsModal } from "./quick-actions/NotificationSettingsModal";
import { RowActionModals } from "./quick-actions/RowActionModals";

export function QuickActionsHost() {
  return (
    <>
      <CreateAlertRuleModal />
      <EscalationMatrixModal />
      <NotificationSettingsModal />
      <ExportAlertReportModal />
      <RowActionModals />
    </>
  );
}
