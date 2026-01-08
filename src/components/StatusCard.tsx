import { cn } from "@/lib/utils";
import { LucideIcon, ArrowDown, ArrowUp } from "lucide-react";
import { AlarmLevel } from "@/hooks/useAlarms";

interface StatusCardProps {
  title: string;
  value: number;
  min?: number;
  max?: number;
  unit: string;
  icon: LucideIcon;
  variant?: "default" | "voltage" | "current" | "rpm" | "power";
  alarmLevel?: AlarmLevel;
  className?: string;
  range?: { min: number; max: number }; // Tambahan: Range untuk Progress Bar
}

const StatusCard = ({
  title,
  value,
  min,
  max,
  unit,
  icon: Icon,
  variant = "default",
  alarmLevel = "normal",
  className,
  range,
}: StatusCardProps) => {
  // Tentukan warna berdasarkan Alarm Level
  const getStatusColor = () => {
    if (alarmLevel === "critical") return "text-destructive border-destructive bg-destructive/10";
    if (alarmLevel === "warning") return "text-warning border-warning bg-warning/10";
    
    // Warna Default per Variant
    switch (variant) {
      case "voltage": return "text-blue-500 border-blue-500/20 bg-blue-500/5";
      case "current": return "text-violet-500 border-violet-500/20 bg-violet-500/5";
      case "rpm": return "text-emerald-500 border-emerald-500/20 bg-emerald-500/5";
      case "power": return "text-amber-500 border-amber-500/20 bg-amber-500/5";
      default: return "text-primary border-primary/20 bg-primary/5";
    }
  };

  const statusColor = getStatusColor();
  const isCritical = alarmLevel === "critical";

  // Hitung persentase untuk progress bar (jika range ada)
  let progressPercent = 0;
  if (range) {
    progressPercent = Math.min(Math.max(((value - range.min) / (range.max - range.min)) * 100, 0), 100);
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-3 transition-all duration-300",
        alarmLevel === "normal" ? "bg-card/50 hover:bg-card/80 border-border/50" : statusColor,
        isCritical && "animate-pulse",
        className
      )}
    >
      {/* Header: Icon & Title */}
      <div className="flex items-center gap-2 mb-1">
        <div className={cn("p-1.5 rounded-lg", statusColor.split(" ")[2])}>
          <Icon className={cn("w-4 h-4", statusColor.split(" ")[0])} />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
      </div>

      {/* Main Value */}
      <div className="flex items-baseline gap-1 mt-1">
        <span className={cn("text-2xl font-bold font-mono tracking-tight", statusColor.split(" ")[0])}>
          {typeof value === 'number' ? value.toFixed(variant === 'rpm' ? 0 : 2) : "--"}
        </span>
        <span className="text-xs font-medium text-muted-foreground">{unit}</span>
      </div>

      {/* Progress Bar Indikator */}
      {range && (
        <div className="w-full h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-500 rounded-full", 
              alarmLevel === 'critical' ? 'bg-destructive' : 
              alarmLevel === 'warning' ? 'bg-warning' : 
              statusColor.split(" ")[0].replace("text-", "bg-")
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Footer: Min / Max Stats */}
      {(min !== undefined && max !== undefined) && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/10 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
             <ArrowDown className="w-3 h-3 text-muted-foreground/70" />
             <span className="font-mono">{min.toFixed(1)}</span>
             <span className="opacity-50">min</span>
          </div>
          <div className="flex items-center gap-1">
             <ArrowUp className="w-3 h-3 text-muted-foreground/70" />
             <span className="font-mono">{max.toFixed(1)}</span>
             <span className="opacity-50">max</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusCard;