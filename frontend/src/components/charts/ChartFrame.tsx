import { Badge } from "../ui/Badge";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/Card";

type ChartFrameProps = {
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
};

export function ChartFrame({ title, description, badge, children }: ChartFrameProps) {
  return (
    <Card className="min-h-[340px]">
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {badge && <Badge tone="blue">{badge}</Badge>}
      </CardHeader>
      <div className="h-[252px]">{children}</div>
    </Card>
  );
}
