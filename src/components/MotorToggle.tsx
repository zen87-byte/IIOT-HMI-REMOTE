import { useState, useEffect } from "react";
import { Power, RotateCw, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export type MotorState = "STOP" | "FORWARD" | "REVERSE";

interface MotorToggleProps {
  state: MotorState;
  onStateChange: (state: MotorState) => void;
  disabled?: boolean;
}

const MotorToggle = ({ state, onStateChange, disabled = false }: MotorToggleProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    if (disabled) return;
    setIsAnimating(true);

    // Cycle: STOP -> FORWARD -> REVERSE -> STOP
    let nextState: MotorState = "STOP";
    if (state === "STOP") nextState = "FORWARD";
    else if (state === "FORWARD") nextState = "REVERSE";
    else nextState = "STOP";

    onStateChange(nextState);
  };

  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  const getRotation = () => {
    switch (state) {
      case "FORWARD": return "-rotate-90"; // 9 o'clock
      case "REVERSE": return "rotate-90";  // 3 o'clock
      default: return "rotate-0";          // 12 o'clock
    }
  };

  const getColor = () => {
    switch (state) {
      case "FORWARD": return "bg-success/20 border-success shadow-[0_0_40px_hsl(142_76%_45%/0.4)]";
      case "REVERSE": return "bg-yellow-500/20 border-yellow-500 shadow-[0_0_40px_hsl(48_96%_53%/0.4)]";
      default: return "bg-destructive/20 border-destructive/60 shadow-[0_0_20px_hsl(0_72%_51%/0.2)]";
    }
  };

  const getIconColor = () => {
    switch (state) {
      case "FORWARD": return "text-success";
      case "REVERSE": return "text-yellow-500";
      default: return "text-destructive/80";
    }
  };

  const getLabel = () => {
    switch (state) {
      case "FORWARD": return "RUNNING FORWARD";
      case "REVERSE": return "RUNNING REVERSE";
      default: return "STOPPED";
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          "relative w-32 h-32 rounded-full transition-all duration-500 ease-out",
          "flex items-center justify-center",
          "border-4 focus:outline-none focus:ring-4 focus:ring-primary/30",
          getColor(),
          disabled && "opacity-50 cursor-not-allowed",
          isAnimating && "scale-95",
          getRotation()
        )}
        aria-label={`Motor state: ${state}`}
        aria-pressed={state !== "STOP"}
      >
        {/* Pulse ring effect when running */}
        {state !== "STOP" && (
          <span className={cn(
            "absolute inset-0 rounded-full animate-pulse-ring",
            state === "FORWARD" ? "bg-success/20" : "bg-yellow-500/20"
          )} />
        )}

        <div className="relative">
          <div className={cn(
            "w-1 h-8 absolute -top-10 left-1/2 -translate-x-1/2 rounded-full",
            state !== "STOP" ? (state === "FORWARD" ? "bg-success" : "bg-yellow-500") : "bg-destructive/80"
          )} />
          <Power
            className={cn(
              "w-12 h-12 transition-all duration-300",
              getIconColor()
            )}
          />
        </div>
      </button>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "status-indicator",
            state === "FORWARD" ? "bg-success shadow-[0_0_10px_hsl(142_76%_45%/0.5)]" :
              state === "REVERSE" ? "bg-yellow-500 shadow-[0_0_10px_hsl(48_96%_53%/0.5)]" :
                "status-indicator-off"
          )}
        />
        <span className={cn(
          "font-semibold text-lg tracking-wide",
          getIconColor()
        )}>
          {getLabel()}
        </span>
      </div>
    </div>
  );
};
export default MotorToggle;
