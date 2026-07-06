import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useAlertWebSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const url = `${protocol}://${host}/api/ws/alerts`;
    const socket = new WebSocket(url);

    socket.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        if (payload?.type?.startsWith("alert.")) {
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
          queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
          queryClient.invalidateQueries({ queryKey: ["escalation-matrix"] });
          queryClient.invalidateQueries({ queryKey: ["export-history"] });
        }
      } catch {
        // ignore
      }
    };

    const ping = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) socket.send("ping");
    }, 30000);

    return () => {
      clearInterval(ping);
      socket.close();
    };
  }, [queryClient]);
}
