import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlarmLevel } from "@/hooks/useAlarms";

interface StatusCardProps {
  title: string;
  value: number;
  unit: string;
  icon: LucideIcon;
  variant?: "default" | "voltage" | "current" | "rpm" | "power";
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  alarmLevel?: AlarmLevel;
  className?: string; // <--- 1. INI YANG DITAMBAHKAN
}

const StatusCard = ({
  title,
  value,
  unit,
  icon: Icon,
  variant = "default",
  trend,
  trendValue,
  alarmLevel = "normal",
  className, // <--- 2. DESTRUCTURE DI SINI
}: StatusCardProps) => {
  
  // Warna Icon berdasarkan Variant
  const getIconColor = () => {
    switch (variant) {
      case "voltage": return "text-[hsl(var(--chart-voltage))]";
      case "current": return "text-[hsl(var(--chart-current))]";
      case "rpm": return "text-[hsl(var(--chart-rpm))]";
      case "power": return "text-[hsl(var(--chart-power))]";
      default: return "text-primary";
    }
  };

  // Warna Background Icon
  const getIconBg = () => {
    switch (variant) {
      case "voltage": return "bg-[hsl(var(--chart-voltage))]/10";
      case "current": return "bg-[hsl(var(--chart-current))]/10";
      case "rpm": return "bg-[hsl(var(--chart-rpm))]/10";
      case "power": return "bg-[hsl(var(--chart-power))]/10";
      default: return "bg-primary/10";
    }
  };

  // Logic Alarm (Merah/Kuning/Normal)
  const isWarning = alarmLevel === "warning";
  const isCritical = alarmLevel === "critical";

  return (
    <div 
      // 3. GABUNGKAN CLASS BAWAAN DENGAN CLASS DARI LUAR (h-full)
      className={cn(
        "glass-card rounded-lg p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300",
        isCritical && "border-destructive/50 bg-destructive/5 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
        isWarning && "border-warning/50 bg-warning/5 shadow-[0_0_15px_rgba(234,179,8,0.2)]",
        className // <--- Class tambahan masuk di sini
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="label-text mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <h3 className={cn(
              "data-value text-2xl tracking-tight",
              isCritical ? "text-destructive font-bold" : isWarning ? "text-warning font-bold" : ""
            )}>
              {value.toLocaleString()} 
            </h3>
            <span className="text-xs font-medium text-muted-foreground">{unit}</span>
          </div>
        </div>
        
        <div className={cn("p-2 rounded-lg transition-colors", getIconBg())}>
          <Icon className={cn("w-5 h-5", getIconColor())} />
        </div>
      </div>

      {/* Trend & Status Footer */}
      {(trend || alarmLevel !== 'normal') && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
          
          {/* Tampilkan Alarm Text jika ada masalah */}
          {alarmLevel !== 'normal' ? (
             <span className={cn(
               "text-xs font-bold animate-pulse px-1.5 py-0.5 rounded",
               isCritical ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
             )}>
               {isCritical ? "CRITICAL" : "WARNING"}
             </span>
          ) : (
             // Jika normal, tampilkan Trend
             trend && (
              <span className={cn(
                "text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1",
                trend === "up" ? "text-emerald-600 bg-emerald-500/10" : 
                trend === "down" ? "text-rose-600 bg-rose-500/10" : 
                "text-muted-foreground bg-secondary"
              )}>
                {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} 
                {trendValue || "Stable"}
              </span>
             )
          )}
        </div>
      )}
    </div>
  );
};

export default StatusCard;