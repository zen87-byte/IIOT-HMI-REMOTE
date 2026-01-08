import { Clock, Power, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

import { XCircle } from "lucide-react";

interface HistoryEntry {
  id: string;
  timestamp: string;
  event: "start" | "stop" | "warning" | "maintenance" | "critical";
  description: string;
  duration?: string;
}

interface UsageHistoryProps {
  entries: HistoryEntry[];
}

const eventConfig = {
  start: {
    icon: Power,
    color: "text-success",
    bgColor: "bg-success/10",
    label: "Started",
  },
  stop: {
    icon: Power,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    label: "Stopped",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-warning",
    bgColor: "bg-warning/10",
    label: "Warning",
  },
  maintenance: {
    icon: CheckCircle,
    color: "text-primary",
    bgColor: "bg-primary/10",
    label: "Maintenance",
  },
  critical: {
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/20",
    label: "Critical",
  },
};

const UsageHistory = ({ entries }: UsageHistoryProps) => {
  return (
    <div className="glass-card rounded-lg p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Usage History
        </h3>
        <span className="text-xs text-muted-foreground">
          {entries.length} events
        </span>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-3">
          {entries.map((entry, index) => {
            const config = eventConfig[entry.event];
            const Icon = config.icon;

            return (
              <div
                key={entry.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg bg-secondary/30",
                  "hover:bg-secondary/50 transition-colors duration-200",
                  "animate-slide-in"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={cn("p-2 rounded-lg", config.bgColor)}>
                  <Icon className={cn("w-4 h-4", config.color)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("font-medium text-sm", config.color)}>
                      {config.label}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {entry.timestamp}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {entry.description}
                  </p>
                  {entry.duration && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      Duration: {entry.duration}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default UsageHistory;
