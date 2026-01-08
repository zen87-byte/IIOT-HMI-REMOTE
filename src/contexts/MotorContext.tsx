import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
// ... imports lain tetap sama ...
import { toast } from "sonner";
import useMotorData, { MotorData } from "@/hooks/useMotorData";
import { useAlarms, Alarm } from "@/hooks/useAlarms";
import { TimeRange } from "@/components/TimeRangeSelector";
import { useAuth } from "@/contexts/AuthContext";

export interface HistoryEntry {
  id: string;
  timestamp: string;
  event: "start" | "stop" | "warning" | "maintenance" | "critical";
  description: string;
}

interface PidConfig {
  kp: number;
  ki: number;
  kd: number;
}

// 1. UPDATE DEFINISI TIPE UNIT (Tambahkan rad/s)
export type SpeedUnit = "rpm" | "hz" | "rad/s"; 
export type PowerUnit = "watt" | "kw" | "hp";

interface MotorContextType {
  isMotorOn: boolean;
  direction: "FWD" | "REV";
  pid: PidConfig;
  
  speedUnit: SpeedUnit;
  powerUnit: PowerUnit;
  setSpeedUnit: (unit: SpeedUnit) => void;
  setPowerUnit: (unit: PowerUnit) => void;

  setDirection: (dir: "FWD" | "REV") => void;
  setPid: (pid: PidConfig) => void;
  
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  motorData: MotorData;
  activeAlarms: Alarm[];
  thresholds: any;
  historyEntries: HistoryEntry[];
  handleMotorToggle: (newState: boolean) => Promise<void>;
}

// ... (Sisa kode MotorProvider ke bawah SAMA PERSIS dengan sebelumnya) ...
// ... Pastikan bagian useState unit tetap mengambil dari localStorage ...

const MotorContext = createContext<MotorContextType | undefined>(undefined);

export const MotorProvider = ({ children }: { children: ReactNode }) => {
    // ... setup user, operator dll ...
    const { user } = useAuth();
    const isOperator = user?.role === "operator";

    // ... setup state lain ...
    const [isMotorOn, setIsMotorOn] = useState(() => {
        const saved = localStorage.getItem("motorStatus");
        return saved ? JSON.parse(saved) : false;
    });
    // ... direction state ...
    const [direction, setDirectionState] = useState<"FWD" | "REV">(() => {
        return (localStorage.getItem("motorDirection") as "FWD" | "REV") || "FWD";
    });
    // ... pid state ...
    const [pid, setPidState] = useState<PidConfig>(() => {
        const saved = localStorage.getItem("motorPid");
        return saved ? JSON.parse(saved) : { kp: 1.5, ki: 0.5, kd: 0.1 };
    });

    // UPDATE STATE INITIALIZATION (Biar aman)
    const [speedUnit, setSpeedUnitState] = useState<SpeedUnit>(() => {
        return (localStorage.getItem("speedUnit") as SpeedUnit) || "rpm";
    });

    const [powerUnit, setPowerUnitState] = useState<PowerUnit>(() => {
        return (localStorage.getItem("powerUnit") as PowerUnit) || "watt";
    });

    // ... sisa setup (timeRange, motorData, alarms) ...
    const [timeRange, setTimeRange] = useState<TimeRange>("live");
    const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
    const motorData = useMotorData(isMotorOn, timeRange);
    const { activeAlarms, thresholds } = useAlarms(motorData.current, motorData.rpm, motorData.voltage, isMotorOn);

    // ... setters ...
    const setDirection = (dir: "FWD" | "REV") => {
        setDirectionState(dir);
        localStorage.setItem("motorDirection", dir);
    };
    const setPid = (newPid: PidConfig) => {
        setPidState(newPid);
        localStorage.setItem("motorPid", JSON.stringify(newPid));
    };
    const setSpeedUnit = (unit: SpeedUnit) => {
        setSpeedUnitState(unit);
        localStorage.setItem("speedUnit", unit);
    };
    const setPowerUnit = (unit: PowerUnit) => {
        setPowerUnitState(unit);
        localStorage.setItem("powerUnit", unit);
    };

    // ... handleMotorToggle ...
    const handleMotorToggle = async (newState: boolean) => {
        if (!isOperator) {
            toast.error("Access Denied", { description: "Only operators can control the motor" });
            return;
        }
        const command = newState ? "START" : "STOP";
        const toastId = toast.loading(`Sending ${command} command...`);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
            const response = await fetch(`${apiUrl}/api/control`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: command }),
            });
            if (!response.ok) throw new Error(`Server Error: ${response.status}`);
            setIsMotorOn(newState);
            localStorage.setItem("motorStatus", JSON.stringify(newState));
            toast.success(`Motor ${command}ED`, { id: toastId });
        } catch (error: any) {
            console.error("Control Error:", error);
            toast.error("Connection Failed", { id: toastId });
        }
    };

    // ... useEffect alarms ...
    useEffect(() => {
        if (activeAlarms.length > 0) {
          const newEntries = activeAlarms.map((alarm) => ({
            id: alarm.id,
            timestamp: new Date().toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
            event: alarm.level === "critical" ? "critical" : "warning",
            description: alarm.message,
          })) as HistoryEntry[];
          setHistoryEntries((prev) => {
            const lastEntry = prev[0];
            const uniqueNew = newEntries.filter(n => !lastEntry || (n.description !== lastEntry.description));
            if (uniqueNew.length === 0) return prev;
            return [...uniqueNew, ...prev].slice(0, 100);
          });
        }
      }, [activeAlarms]);

    return (
        <MotorContext.Provider value={{
            isMotorOn, direction, pid,
            speedUnit, powerUnit, setSpeedUnit, setPowerUnit, // <-- EXPORT
            setDirection, setPid,
            timeRange, setTimeRange, motorData, activeAlarms, thresholds, historyEntries, handleMotorToggle
        }}>
            {children}
        </MotorContext.Provider>
    );
};

export const useMotorContext = () => {
    const context = useContext(MotorContext);
    if (!context) throw new Error("useMotorContext must be used within MotorProvider");
    return context;
};