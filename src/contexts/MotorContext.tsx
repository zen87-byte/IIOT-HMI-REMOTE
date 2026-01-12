import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import useMotorData, { MotorData } from "@/hooks/useMotorData";
import { useAlarms, Alarm } from "@/hooks/useAlarms";
import { TimeRange } from "@/components/TimeRangeSelector";
import mqtt from "mqtt";

export interface HistoryEntry {
  id: string;
  timestamp: string;
  event: "start" | "stop" | "warning" | "maintenance" | "critical";
  description: string;
}

export type SpeedUnit = "rpm" | "hz" | "rad/s";
export type PowerUnit = "watt" | "kw" | "hp";

interface MotorContextType {
  isMotorRunning: boolean;
  direction: "FWD" | "REV";
  speedUnit: SpeedUnit;
  powerUnit: PowerUnit;
  setSpeedUnit: (unit: SpeedUnit) => void;
  setPowerUnit: (unit: PowerUnit) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  motorData: MotorData;
  activeAlarms: Alarm[];
  thresholds: any;
  historyEntries: HistoryEntry[];
}

const MotorContext = createContext<MotorContextType | undefined>(undefined);

export const MotorProvider = ({ children }: { children: ReactNode }) => {
  const apiUrl = import.meta.env.VITE_API_URL;

  // --- STATE ---
  const [isMotorRunning, setIsMotorRunning] = useState(false);
  const [direction, setDirectionState] = useState<"FWD" | "REV">("FWD");
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>("rpm"); 
  const [powerUnit, setPowerUnit] = useState<PowerUnit>("watt");
  const [timeRange, setTimeRange] = useState<TimeRange>("live");
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  // --- 1. DATA STREAM UTAMA ---
  // Kita tidak perlu pass 'true' lagi, karena hook sudah always on
  const motorData = useMotorData(timeRange); 

  // --- 2. AUTO-DETECT STATUS ---
  useEffect(() => {
    // Logic: Kalau ada arus atau speed, berarti mesin nyala
    const isSystemActive = motorData.current > 0.1 || motorData.rpm > 1.0;
    
    if (isSystemActive !== isMotorRunning) {
      setIsMotorRunning(isSystemActive);
    }
  }, [motorData.current, motorData.rpm, isMotorRunning]);

  // --- 3. MQTT LISTENER (Untuk Direction) ---
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_MQTT_WS_URL;
    if (!wsUrl) return;

    const client = mqtt.connect(wsUrl, {
      clientId: "monitor_ctx_" + Math.random().toString(16).substr(2, 8),
    });

    client.on("connect", () => {
      client.subscribe(["motor/stats"]);
    });

    client.on("message", (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        if (topic === "motor/stats" && payload.direction) {
          setDirectionState(payload.direction === 1 ? "FWD" : "REV");
        }
      } catch (err) { console.error(err); }
    });

    return () => { client.end(); };
  }, []);
  
  // --- 4. ALARMS ---
  const { activeAlarms, thresholds } = useAlarms(
    motorData.current, motorData.rpm, motorData.voltage, isMotorRunning
  );

  useEffect(() => {
    if (activeAlarms.length > 0) {
      const newEntries = activeAlarms.map((alarm) => ({
        id: alarm.id,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        event: alarm.level === "critical" ? "critical" : "warning",
        description: alarm.message,
      })) as HistoryEntry[];

      setHistoryEntries((prev) => {
        const lastEntry = prev[0];
        const uniqueNew = newEntries.filter(n => !lastEntry || n.description !== lastEntry.description);
        return uniqueNew.length === 0 ? prev : [...uniqueNew, ...prev].slice(0, 100);
      });
    }
  }, [activeAlarms]);

  return (
    <MotorContext.Provider
      value={{
        isMotorRunning,
        direction,
        speedUnit, setSpeedUnit, 
        powerUnit, setPowerUnit,
        timeRange, setTimeRange,
        motorData, activeAlarms, thresholds, historyEntries,
      }}
    >
      {children}
    </MotorContext.Provider>
  );
};

export const useMotorContext = () => {
  const context = useContext(MotorContext);
  if (!context) throw new Error("useMotorContext must be used within MotorProvider");
  return context;
};