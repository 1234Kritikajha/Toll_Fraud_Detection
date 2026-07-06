import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/Card";

interface RecentANPREvent {
  vehicle: string;
  time: string;
  status: "High Risk" | "Cleared" | "Pending";
}

const liveEvents: RecentANPREvent[] = [
  { vehicle: "UP32AB1234", time: "08:12 AM", status: "High Risk" },
  { vehicle: "MH14CD5678", time: "08:24 AM", status: "Cleared" },
  { vehicle: "DL9CAF4321", time: "08:45 AM", status: "Pending" },
];

export function EventStream() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Recent ANPR Events</CardTitle>
          <CardDescription>Real-time recognition queue</CardDescription>
        </div>
        <Button variant="outline" size="sm">Open Event Stream</Button>
      </CardHeader>
      <div className="space-y-3">
        {liveEvents.map((event) => (
          <div key={event.vehicle} className="flex items-center justify-between gap-3 rounded-md border border-border/70 p-3 dark:border-border/20">
            <div>
              <p className="font-bold">{event.vehicle}</p>
              <p className="text-xs text-muted">{event.time}</p>
            </div>
            <Badge tone={event.status === "High Risk" ? "red" : event.status === "Cleared" ? "green" : "amber"}>{event.status}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
