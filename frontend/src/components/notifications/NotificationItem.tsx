import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import type { AppNotification as NotificationItem } from "../../types";
import { markNotificationRead, deleteNotification } from "../../services/api";

type Props = {
  item: NotificationItem;
};

export function NotificationItem({ item }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const markReadMut = useMutation({ mutationFn: () => markNotificationRead(item.id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });

  const deleteMut = useMutation({ mutationFn: () => deleteNotification(item.id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });

  const open = () => {
    if (item.status === "unread") markReadMut.mutate();
    if (item.action_url) {
      // navigate within app or open external
      if (item.action_url.startsWith("/")) navigate(item.action_url);
      else window.open(item.action_url, "_blank");
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-900">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-xl dark:bg-slate-800">{item.icon || "🔔"}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h4 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.title}</h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</span>
            {item.status === "unread" && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-red-500" />}
          </div>
        </div>
        <p className="mt-1 truncate text-sm text-slate-500">{item.message}</p>
        <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="ghost" size="sm" onClick={open} className="w-full sm:w-auto">Open</Button>
          <Button variant="outline" size="sm" onClick={() => markReadMut.mutate()} className="w-full sm:w-auto">Mark read</Button>
          <Button variant="danger" size="sm" onClick={() => deleteMut.mutate()} className="w-full sm:w-auto">Delete</Button>
        </div>
      </div>
    </div>
  );
}
