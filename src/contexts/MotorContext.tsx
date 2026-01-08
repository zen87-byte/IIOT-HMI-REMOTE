import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import useMotorData, { MotorData } from "@/hooks/useMotorData";
import { useAlarms, Alarm } from "@/hooks/useAlarms";
import { TimeRange } from "@/components/TimeRangeSelector";
import { useAuth } from "@/contexts/AuthContext";
import mqtt from "mqtt";

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
  const apiUrl = import.meta.env.VITE_API_URL;

  // --- STATE INITIALIZATION ---
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

  // --- LOGIC: GLOBAL SYNCHRONIZATION VIA MQTT ---
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_MQTT_WS_URL;
    if (!wsUrl) return;

    const client = mqtt.connect(wsUrl, {
      clientId: 'context_sync_' + Math.random().toString(16).substr(2, 8),
      clean: true,
      reconnectPeriod: 2000,
    });

    client.on("connect", () => {
      console.log("Context MQTT: Connected for global sync");
      client.subscribe("motor/control");
    });

    client.on("message", (topic, message) => {
      if (topic === "motor/control") {
        try {
          const payload = JSON.parse(message.toString());
          
          // Sync Start/Stop
          if (payload.command === "START") {
            setIsMotorOn(true);
            localStorage.setItem("motorStatus", "true");
          } else if (payload.command === "STOP") {
            setIsMotorOn(false);
            localStorage.setItem("motorStatus", "false");
          }
          
          // Sync Direction
          if (payload.command === "SET_DIR" && payload.value) {
            setDirectionState(payload.value);
            localStorage.setItem("motorDirection", payload.value);
          }

          // Sync PID
          if (payload.command === "SET_PID") {
             const newPid = { kp: payload.kp, ki: payload.ki, kd: payload.kd };
             setPidState(newPid);
             localStorage.setItem("motorPid", JSON.stringify(newPid));
          }

          // Sync Display Units (Baru!)
          if (payload.command === "SET_SPEED_UNIT") {
            setSpeedUnitState(payload.value);
            localStorage.setItem("speedUnit", payload.value);
          }

          if (payload.command === "SET_POWER_UNIT") {
            setPowerUnitState(payload.value);
            localStorage.setItem("powerUnit", payload.value);
          }

        } catch (err) {
          console.error("MQTT Sync Error in Context:", err);
        }
      }
    });

    return () => { client.end(); };
  }, []);

  // --- HELPER: SEND COMMAND TO SERVER ---
  const sendControl = async (action: string, extra = {}) => {
    if (!isOperator) {
      toast.error("Access Denied", { description: "Only operators can change settings" });
      return;
    }
    try {
      await fetch(`${apiUrl}/api/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  // --- SETTERS: SEKARANG MEMANGGIL API (BUKAN STATE LOKAL LANGSUNG) ---
  const handleMotorToggle = async (newState: boolean) => {
    const command = newState ? "START" : "STOP";
    toast.info(`Sending ${command} command...`);
    await sendControl(command);
  };

  const setDirection = (dir: "FWD" | "REV") => sendControl("SET_DIR", { value: dir });
  
  const setPid = (newPid: PidConfig) => sendControl("SET_PID", { ...newPid });

  const setSpeedUnit = (unit: SpeedUnit) => sendControl("SET_SPEED_UNIT", { value: unit });

  const setPowerUnit = (unit: PowerUnit) => sendControl("SET_POWER_UNIT", { value: unit });

  // --- DATA FETCHING & ALARMS ---
  const motorData = useMotorData(isMotorOn, timeRange);
  const { activeAlarms, thresholds } = useAlarms(
    motorData.current,
    motorData.rpm,
    motorData.voltage,
    isMotorOn
  );

  // History Log Logic
  useEffect(() => {
    if (activeAlarms.length > 0) {
      const newEntries = activeAlarms.map((alarm) => ({
        id: alarm.id,
        timestamp: new Date().toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" }),
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