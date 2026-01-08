import { useState, useEffect } from "react";
import { createPortal } from "react-dom"; // 1. IMPORT PORTAL
import { Power, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MotorToggleProps {
  isOn: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

const MotorToggle = ({ isOn, onToggle, disabled = false }: MotorToggleProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleInitiateToggle = () => {
    if (disabled) return;
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setIsAnimating(true);
    onToggle(!isOn);
    setShowConfirm(false);
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  return (
    <div className="flex flex-col items-center gap-4 relative z-10">
      
      {/* Tombol Utama */}
      <button
        onClick={handleInitiateToggle}
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
      >
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

      {/* 2. GUNAKAN PORTAL 
         Ini akan melempar Modal keluar dari struktur HTML komponen ini,
         langsung ke tag <body>. Dijamin paling atas dan menutupi header.
      */}
      {showConfirm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-card border border-border w-full max-w-sm rounded-xl shadow-2xl p-6 animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Header Modal */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 text-warning">
                <div className="p-2 bg-warning/10 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Confirmation
                </h3>
              </div>
              <button 
                onClick={handleCancel}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <p className="text-muted-foreground mb-6">
              Are you sure you want to 
              <span className={cn(
                "font-bold mx-1",
                isOn ? "text-destructive" : "text-success"
              )}>
                {isOn ? "STOP" : "START"}
              </span> 
              the motor? This action will be logged.
            </p>

            {/* Footer Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={cn(
                  "px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm",
                  isOn 
                    ? "bg-destructive hover:bg-destructive/90"
                    : "bg-success hover:bg-success/90"
                )}
              >
                Confirm {isOn ? "Stop" : "Start"}
              </button>
            </div>
          </div>
        </div>,
        document.body // Target Portal
      )}

    </div>
  );
};

export default MotorToggle;