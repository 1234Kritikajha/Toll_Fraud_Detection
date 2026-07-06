import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fetchNotifications, fetchUnreadNotificationsCount, markAllNotificationsRead, clearAllNotifications } from "../../services/api";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { NotificationItem } from "./NotificationItem";
import type { AppNotification as NotificationType } from "../../types";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NotificationDrawer({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const { data: notifications = [], refetch, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: () => fetchNotifications(50, 0), staleTime: 1000 * 30 });

  const { data: unreadResp } = useQuery({ queryKey: ["notifications", "unread_count"], queryFn: fetchUnreadNotificationsCount, staleTime: 1000 * 15 });

  const markAllMut = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: () => setMarkingAll(true),
    onSettled: () => {
      setMarkingAll(false);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread_count"] });
    },
  });

  const clearAllMut = useMutation({
    mutationFn: () => clearAllNotifications(),
    onMutate: () => setClearingAll(true),
    onSettled: () => {
      setClearingAll(false);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread_count"] });
    },
  });

  useEffect(() => {
    if (!open) return;
    refetch();
  }, [open]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const url = `${protocol}://${host}/api/ws/notifications`;
    const socket = new WebSocket(url);
    socket.onopen = () => console.info("notifications ws open");
    socket.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        if (payload?.type === "notification.new") {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["notifications", "unread_count"] });
        }
      } catch (e) {
        // ignore
      }
    };
    socket.onclose = () => console.info("notifications ws closed");
    setWs(socket);
    return () => socket.close();
  }, []);

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: open ? 0 : 400, opacity: open ? 1 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`fixed inset-0 z-50 flex items-start justify-end sm:items-start sm:justify-end ${open ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden
      />
      {/* mobile: full-screen sheet; desktop: slide-over panel on right */}
      <div className={`w-full h-full sm:w-[420px] sm:max-w-full sm:top-16 sm:right-4`}> 
        <Card className="flex h-full sm:max-h-[80vh] flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex-1">
            <h3 className="text-sm font-bold">Notifications</h3>
            <p className="text-xs text-slate-500">Real-time alerts and system messages</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:w-auto sm:items-center sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllMut.mutate()}
              disabled={markingAll}
              aria-label="Mark all notifications as read"
              className="w-full sm:w-auto"
            >
              {markingAll ? "Marking..." : "Mark all read"}
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => clearAllMut.mutate()}
              disabled={clearingAll}
              aria-label="Clear all notifications"
              className="w-full sm:w-auto"
            >
              {clearingAll ? "Clearing..." : "Clear all"}
            </Button>

            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close notifications drawer">
              Close
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto p-3">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-12 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-12 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ) : (
            (notifications || []).map((n: NotificationType) => (
              <NotificationItem key={n.id} item={n} />
            ))
          )}

          {(!notifications || notifications.length === 0) && (
            <div className="p-6 text-center text-sm text-slate-500">No notifications yet.</div>
          )}
        </div>

        <div className="border-t px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">Total: {notifications?.length ?? 0}</div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                className="w-full sm:w-auto"
                aria-label="Refresh notifications"
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </Card>
      </div>
    </motion.div>
  );
}
