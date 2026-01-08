import { AlertTriangle, XCircle } from "lucide-react";
import { AlarmLevel, Alarm } from "@/hooks/useAlarms";
import { cn } from "@/lib/utils";

interface AlarmBannerProps {
  level: AlarmLevel;
  activeAlarms: Alarm[];
}

const AlarmBanner = ({ level, activeAlarms }: AlarmBannerProps) => {
  if (level === "normal" || activeAlarms.length === 0) {
    return null;
  }

  const isCritical = level === "critical";

  return (
    <div
      className={cn(
        "border-l-4 rounded-r-lg p-4 mb-4",
        isCritical
          ? "bg-destructive-light border-destructive animate-pulse-critical"
          : "bg-warning-light border-warning animate-pulse-warning"
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        {isCritical ? (
          <XCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <h3
            className={cn(
              "font-bold text-lg",
              isCritical ? "text-destructive" : "text-warning-foreground"
            )}
          >
            {isCritical ? "CRITICAL ALERT" : "WARNING"}
          </h3>
          <ul className="mt-2 space-y-1">
            {activeAlarms.map((alarm) => (
              <li
                key={alarm.id}
                className={cn(
                  "text-sm",
                  isCritical ? "text-destructive font-semibold" : "text-warning-foreground"
                )}
              >
                {alarm.message}
              </li>
            ))}
          </ul>
          {isCritical && (
            <p className="mt-3 text-sm font-medium text-destructive">
              Immediate action required. Contact supervisor or shut down motor.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlarmBanner;