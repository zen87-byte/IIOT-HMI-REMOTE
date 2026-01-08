import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { AlarmLevel } from "@/hooks/useAlarms";

interface StatusCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  variant?: "voltage" | "current" | "rpm" | "power" | "default";
  alarmLevel?: AlarmLevel;
}

const variantStyles = {
  voltage: "border-l-chart-voltage",
  current: "border-l-chart-current",
  rpm: "border-l-chart-rpm",
  power: "border-l-chart-power",
  default: "border-l-primary",
};

const StatusCard = ({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  trendValue,
  variant = "default",
  alarmLevel = "normal",
}: StatusCardProps) => {
  const isWarning = alarmLevel === "warning";
  const isCritical = alarmLevel === "critical";

  return (
    <div
      className={cn(
        "glass-card rounded-lg p-5 border-l-4 animate-fade-in",
        "transition-all duration-200",
        !isWarning && !isCritical && variantStyles[variant],
        isWarning && "border-l-warning bg-warning-light animate-pulse-warning",
        isCritical && "border-l-destructive bg-destructive-light animate-pulse-critical"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="label-text">
            {title}
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "data-value text-md",
                isCritical && "text-destructive font-bold",
                isWarning && "text-warning-foreground font-semibold"
              )}
            >
              {value}
            </span>
            <span className="text-muted-foreground text-sm">{unit}</span>
          </div>
        </div>
        <div
          className={cn(
            "p-2 rounded-lg",
            isCritical && "bg-destructive/20",
            isWarning && "bg-warning/20",
            !isCritical && !isWarning && "bg-secondary/50"
          )}
        >
          <Icon
            className={cn(
              "w-5 h-5",
              isCritical && "text-destructive",
              isWarning && "text-warning",
              !isCritical && !isWarning && "text-muted-foreground"
            )}
          />
        </div>
      </div>

      {trend && trendValue && (
        <div className="mt-3 flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              trend === "up" && "bg-success/20 text-success",
              trend === "down" && "bg-destructive/20 text-destructive",
              trend === "stable" && "bg-muted text-muted-foreground"
            )}
          >
            {trend === "up" && "↑"}
            {trend === "down" && "↓"}
            {trend === "stable" && "→"} {trendValue}
          </span>
          <span className="text-xs text-muted-foreground">vs last hour</span>
        </div>
      )}
    </div>
  );
};

export default StatusCard;