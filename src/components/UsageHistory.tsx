import { useMemo } from "react";
import { Clock, Power, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Types ---
interface HistoryEntry {
  id: string;
  timestamp: string;
  event: "start" | "stop" | "warning" | "maintenance" | "critical";
  description: string;
  duration?: string;
}

interface GroupedEntry extends HistoryEntry {
  count: number;
  latestTimestamp: string;
}

interface UsageHistoryProps {
  entries: HistoryEntry[];
}

// --- Configuration ---
const eventConfig = {
  start: { icon: Power, color: "text-success", bgColor: "bg-success/10", label: "Started" },
  stop: { icon: Power, color: "text-destructive", bgColor: "bg-destructive/10", label: "Stopped" },
  warning: { icon: AlertTriangle, color: "text-warning", bgColor: "bg-warning/10", label: "Warning" },
  maintenance: { icon: CheckCircle, color: "text-primary", bgColor: "bg-primary/10", label: "Maintenance" },
  critical: { icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/20", label: "Critical" },
};

const UsageHistory = ({ entries }: UsageHistoryProps) => {

  // --- Logic Grouping (Consecutive) ---
  const groupedEntries = useMemo(() => {
    if (entries.length === 0) return [];

    const groups: GroupedEntry[] = [];
    let currentGroup: GroupedEntry = { 
      ...entries[0], 
      count: 1, 
      latestTimestamp: entries[0].timestamp 
    };

    for (let i = 1; i < entries.length; i++) {
      const entry = entries[i];
      const isSameEvent = entry.event === currentGroup.event;
      const isSameDesc = entry.description === currentGroup.description;

      if (isSameEvent && isSameDesc) {
        currentGroup.count += 1;
        currentGroup.timestamp = entry.timestamp; 
      } else {
        groups.push(currentGroup);
        currentGroup = { 
          ...entry, 
          count: 1, 
          latestTimestamp: entry.timestamp 
        };
      }
    }
    
    groups.push(currentGroup);
    return groups;
  }, [entries]);

  // --- Render UI ---
  return (
    <div className="glass-card rounded-lg p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Usage History
        </h3>
        <span className="text-xs text-muted-foreground">
          {entries.length} raw events
        </span>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-3">
          {groupedEntries.map((entry, index) => {
            const config = eventConfig[entry.event];
            const Icon = config.icon;
            const isGroup = entry.count > 1;

            return (
              <div
                key={entry.id + index}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg bg-secondary/30",
                  "hover:bg-secondary/50 transition-colors duration-200", // Cuma sisa transisi warna saat hover
                  "relative group" // Hapus 'animate-slide-in'
                )}
                // Hapus style animationDelay
              >
                <div className={cn("p-2 rounded-lg relative", config.bgColor)}>
                  <Icon className={cn("w-4 h-4", config.color)} />
                  
                  {/* Badge Counter */}
                  {isGroup && (
                    <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold h-5 min-w-[20px] px-1 flex items-center justify-center rounded-full shadow-sm border border-background">
                      {entry.count > 99 ? '99+' : entry.count}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("font-medium text-sm", config.color)}>
                      {config.label}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {isGroup ? `Since ${entry.timestamp}` : entry.timestamp}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {entry.description}
                  </p>

                  {isGroup && (
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      Last update: {entry.latestTimestamp}
                    </p>
                  )}

                  {entry.duration && !isGroup && (
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