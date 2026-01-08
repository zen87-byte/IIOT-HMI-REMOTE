import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { toast } from "sonner";
import useMotorData, { MotorData } from "@/hooks/useMotorData";
import { useAlarms, Alarm } from "@/hooks/useAlarms";
import { TimeRange } from "@/components/TimeRangeSelector";
import { useAuth } from "@/contexts/AuthContext";
import mqtt from "mqtt"; // Import MQTT

// ... (Tipe data tetap sama) ...
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

const MotorContext = createContext<MotorContextType | undefined>(undefined);

export const MotorProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const isOperator = user?.role === "operator";

  // State
  const [isMotorOn, setIsMotorOn] = useState(() => {
    const saved = localStorage.getItem("motorStatus");
    return saved ? JSON.parse(saved) : false;
  });

  const [direction, setDirectionState] = useState<"FWD" | "REV">(() => {
    return (localStorage.getItem("motorDirection") as "FWD" | "REV") || "FWD";
  });

  const [pid, setPidState] = useState<PidConfig>(() => {
    const saved = localStorage.getItem("motorPid");
    return saved ? JSON.parse(saved) : { kp: 1.5, ki: 0.5, kd: 0.1 };
  });

  const [speedUnit, setSpeedUnitState] = useState<SpeedUnit>(() => {
    return (localStorage.getItem("speedUnit") as SpeedUnit) || "rpm";
  });

  const [powerUnit, setPowerUnitState] = useState<PowerUnit>(() => {
    return (localStorage.getItem("powerUnit") as PowerUnit) || "watt";
  });

  const [timeRange, setTimeRange] = useState<TimeRange>("live");
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  // --- LOGIC BARU: SYNCHRONIZATION VIA MQTT ---
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_MQTT_WS_URL;
    if (!wsUrl) return;

    console.log("[Context] Listening to Status changes...");
    const client = mqtt.connect(wsUrl, {
      clientId: 'listener_' + Math.random().toString(16).substr(2, 8),
      clean: true,
      reconnectPeriod: 2000,
    });

    client.on("connect", () => {
      // Kita dengarkan topik control untuk tahu kalau ada yg tekan tombol
      client.subscribe("motor/control");
    });

    client.on("message", (topic, message) => {
      if (topic === "motor/control") {
        try {
          const payload = JSON.parse(message.toString());
          
          // 1. Sync START/STOP
          if (payload.command === "START") {
            setIsMotorOn(true);
            localStorage.setItem("motorStatus", JSON.stringify(true));
          } else if (payload.command === "STOP") {
            setIsMotorOn(false);
            localStorage.setItem("motorStatus", JSON.stringify(false));
          }
          
          // 2. Sync Direction (Biar tombol FWD/REV di laptop lain ikut berubah)
          if (payload.command === "SET_DIR" && payload.value) {
            setDirectionState(payload.value);
            localStorage.setItem("motorDirection", payload.value);
          }

          // 3. Sync PID
          if (payload.command === "SET_PID") {
             const newPid = { kp: payload.kp, ki: payload.ki, kd: payload.kd };
             setPidState(newPid);
             localStorage.setItem("motorPid", JSON.stringify(newPid));
          }

        } catch (err) {
          console.error("Sync Error:", err);
        }
      }
    });

    return () => {
      client.end();
    };
  }, []);
  // ---------------------------------------------

  const motorData = useMotorData(isMotorOn, timeRange);
  const { activeAlarms, thresholds } = useAlarms(
    motorData.current,
    motorData.rpm,
    motorData.voltage,
    isMotorOn
  );

  // Setters
  const setDirection = (dir: "FWD" | "REV") => {
    // Optimistic Update (Update lokal dulu biar cepet)
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

  const handleMotorToggle = async (newState: boolean) => {
    if (!isOperator) {
      toast.error("Access Denied", { description: "Only operators can control the motor" });
      return;
    }

    const command = newState ? "START" : "STOP";
    const toastId = toast.loading(`Sending ${command} command...`);

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      
      await fetch(`${apiUrl}/api/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: command }),
      });

      // KITA HAPUS setIsMotorOn() DARI SINI
      // Biarkan useEffect MQTT yang mengupdate state setIsMotorOn
      // Supaya konsisten: Data dikirim -> Backend Broadcast -> Semua Client Update
      
      toast.success(`Command Sent: ${command}`, { id: toastId });

    } catch (error: any) {
      console.error("Control Error:", error);
      toast.error("Connection Failed", { id: toastId });
    }
  };

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
      speedUnit, powerUnit, setSpeedUnit, setPowerUnit,
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