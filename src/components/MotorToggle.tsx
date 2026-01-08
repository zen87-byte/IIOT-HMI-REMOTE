import { useState, useEffect } from "react";
import { Power } from "lucide-react";
import { cn } from "@/lib/utils";

interface MotorToggleProps {
  isOn: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

const MotorToggle = ({ isOn, onToggle, disabled = false }: MotorToggleProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    if (disabled) return;
    setIsAnimating(true);
    onToggle(!isOn);
  };

  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          "relative w-32 h-32 rounded-full transition-all duration-500 ease-out",
          "flex items-center justify-center",
          "border-4 focus:outline-none focus:ring-4 focus:ring-primary/30",
          isOn
            ? "bg-success/20 border-success shadow-[0_0_40px_hsl(142_76%_45%/0.4)]"
            : "bg-destructive/20 border-destructive/60 shadow-[0_0_20px_hsl(0_72%_51%/0.2)]",
          disabled && "opacity-50 cursor-not-allowed",
          isAnimating && "scale-95"
        )}
        aria-label={isOn ? "Turn motor off" : "Turn motor on"}
        aria-pressed={isOn}
      >
        {/* Pulse ring effect when on */}
        {isOn && (
          <span className="absolute inset-0 rounded-full bg-success/20 animate-pulse-ring" />
        )}
        
        <Power
          className={cn(
            "w-12 h-12 transition-all duration-300",
            isOn ? "text-success" : "text-destructive/80"
          )}
        />
      </button>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "status-indicator",
            isOn ? "status-indicator-on" : "status-indicator-off"
          )}
        />
        <span className={cn(
          "font-semibold text-lg tracking-wide",
          isOn ? "text-success" : "text-destructive"
        )}>
          {isOn ? "RUNNING" : "STOPPED"}
        </span>
      </div>
    </div>
  );
};

export default MotorToggle;
