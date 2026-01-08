import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
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
export type ControlMode = "AUTO" | "MANUAL";

interface MotorContextType {
  isMotorOn: boolean;
  direction: "FWD" | "REV";
  pid: PidConfig;
  speedUnit: SpeedUnit;
  powerUnit: PowerUnit;
  controlMode: ControlMode;
  speedSetpoint: number;
  setSpeedUnit: (unit: SpeedUnit) => void;
  setPowerUnit: (unit: PowerUnit) => void;
  setDirection: (dir: "FWD" | "REV") => void;
  setPid: (pid: PidConfig) => void;
  setControlMode: (mode: ControlMode) => void;
  setSpeedSetpoint: (value: number) => void;
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

  // --- 1. STATE INITIALIZATION ---
  const [isMotorOn, setIsMotorOn] = useState(false); // Master Enable
  const [direction, setDirectionState] = useState<"FWD" | "REV">("FWD");
  const [pid, setPidState] = useState<PidConfig>({ kp: 1.5, ki: 0.5, kd: 0.1 });
  const [controlMode, setControlModeState] = useState<ControlMode>("MANUAL");
  const [speedSetpoint, setSpeedSetpointState] = useState(0);

  const [speedUnit, setSpeedUnitState] = useState<SpeedUnit>("rpm");
  const [powerUnit, setPowerUnitState] = useState<PowerUnit>("watt");
  const [timeRange, setTimeRange] = useState<TimeRange>("live");
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  // --- 2. LOGIC: GLOBAL MQTT SYNC (Broadcast Listener) ---
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_MQTT_WS_URL;
    if (!wsUrl) return;

    const client = mqtt.connect(wsUrl, {
      clientId: "dashboard_ctx_" + Math.random().toString(16).substr(2, 8),
      clean: true,
      reconnectPeriod: 2000,
    });

    client.on("connect", () => {
      console.log("✅ Context Sync Connected");
      client.subscribe("motor/control");
    });

    client.on("message", (topic, message) => {
      if (topic === "motor/control") {
        try {
          const payload = JSON.parse(message.toString());
          console.log("📩 Sync Received:", payload);

          // Update state berdasarkan broadcast dari backend
          if (payload.command === "START") {
            setIsMotorOn(true);
            setControlModeState(payload.value); // Sync mode (Auto/Manual)
            if (payload.speed !== undefined)
              setSpeedSetpointState(payload.speed);
          } else if (payload.command === "STOP") {
            setIsMotorOn(false);
          }
          // MotorContext.tsx - Di dalam client.on("message", ...)
          else if (payload.command === "SET_DIR") {
            setDirectionState(payload.value); // payload.value berisi "FWD" atau "REV"
            toast.info(`Direction changed to ${payload.value}`);
          } else if (payload.command === "SET_PID") {
            setPidState({ kp: payload.kp, ki: payload.ki, kd: payload.kd });
          } else if (payload.command === "SET_MODE") {
            setControlModeState(payload.value);
          } else if (payload.command === "SET_SPEED_SP") {
            setSpeedSetpointState(payload.value);
          } else if (payload.command === "SET_SPEED_UNIT")
            setSpeedUnitState(payload.value);
          else if (payload.command === "SET_POWER_UNIT")
            setPowerUnitState(payload.value);
        } catch (err) {
          console.error("MQTT Sync Error:", err);
        }
      }
    });

    return () => {
      client.end();
    };
  }, []);

  // --- 3. HELPER: SEND COMMAND TO BACKEND ---
  const sendControl = async (action: string, extra = {}) => {
    if (!isOperator) {
      toast.error("Operator access required");
      return;
    }
    try {
      await fetch(`${apiUrl}/api/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
    } catch (error) {
      console.error("Control API Error:", error);
      toast.error("Network error: Backend unreachable");
    }
  };

  // --- 4. EXPOSED ACTIONS ---

  // Handle Master Switch (ON/OFF)
  const handleMotorToggle = async (newState: boolean) => {
    const action = newState ? "START" : "STOP";
    // Jika START, sertakan mode dan speed saat ini
    await sendControl(action, {
      value: controlMode,
      speedValue: speedSetpoint,
    });
  };

  // Ganti Mode (Jika Master ON, ini otomatis kirim sinyal START ke topik mode baru)
  const setControlMode = (mode: ControlMode) => {
    setControlModeState(mode); // Optimistic UI
    if (isMotorOn) {
      sendControl("START", { value: mode, speedValue: speedSetpoint });
    } else {
      sendControl("SET_MODE", { value: mode });
    }
  };

  const setSpeedSetpoint = (value: number) => {
    setSpeedSetpointState(value);
    // Jika sedang manual dan ON, langsung update speed ke PLC
    if (isMotorOn && controlMode === "MANUAL") {
      sendControl("START", { value: "MANUAL", speedValue: value });
    } else {
      sendControl("SET_SPEED_SP", { value });
    }
  };

const setDirection = (dir: "FWD" | "REV") => {
  // Kita update UI secara lokal dulu (optimistic)
  setDirectionState(dir);
  
  // Kirim ke backend untuk diteruskan ke MQTT motor/stats
  sendControl("SET_DIR", { value: dir });
};
  const setPid = (newPid: PidConfig) => sendControl("SET_PID", { ...newPid });
  const setSpeedUnit = (unit: SpeedUnit) =>
    sendControl("SET_SPEED_UNIT", { value: unit });
  const setPowerUnit = (unit: PowerUnit) =>
    sendControl("SET_POWER_UNIT", { value: unit });

  // --- 5. DATA & ALARMS ---
  const motorData = useMotorData(isMotorOn, timeRange);
  const { activeAlarms, thresholds } = useAlarms(
    motorData.current,
    motorData.rpm,
    motorData.voltage,
    isMotorOn
  );

  // History entries logic
  useEffect(() => {
    if (activeAlarms.length > 0) {
      const newEntries = activeAlarms.map((alarm) => ({
        id: alarm.id,
        timestamp: new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        event: alarm.level === "critical" ? "critical" : "warning",
        description: alarm.message,
      })) as HistoryEntry[];
      setHistoryEntries((prev) => {
        const lastEntry = prev[0];
        const uniqueNew = newEntries.filter(
          (n) => !lastEntry || n.description !== lastEntry.description
        );
        return uniqueNew.length === 0
          ? prev
          : [...uniqueNew, ...prev].slice(0, 100);
      });
    }
  }, [activeAlarms]);

  return (
    <MotorContext.Provider
      value={{
        isMotorOn,
        direction,
        pid,
        controlMode,
        speedSetpoint,
        speedUnit,
        powerUnit,
        setSpeedUnit,
        setPowerUnit,
        setDirection,
        setPid,
        setControlMode,
        setSpeedSetpoint,
        timeRange,
        setTimeRange,
        motorData,
        activeAlarms,
        thresholds,
        historyEntries,
        handleMotorToggle,
      }}
    >
      {children}
    </MotorContext.Provider>
  );
};

export const useMotorContext = () => {
  const context = useContext(MotorContext);
  if (!context)
    throw new Error("useMotorContext must be used within MotorProvider");
  return context;
};
