import { useState, useEffect, useCallback, useRef } from "react";

export type AlarmLevel = "normal" | "warning" | "critical";

export interface Alarm {
  id: string;
  timestamp: Date;
  level: AlarmLevel;
  parameter: string;
  message: string;
  value: number;
  threshold: number;
}

interface AlarmThresholds {
  current: { warning: number; critical: number };
  rpm: { warningLow: number; warningHigh: number; criticalLow: number; criticalHigh: number };
  voltage: { warningLow: number; warningHigh: number; criticalLow: number; criticalHigh: number };
}

const DEFAULT_THRESHOLDS: AlarmThresholds = {
  current: { warning: 1.9, critical: 2 },
  rpm: { warningLow: 1, warningHigh: 19, criticalLow: 0, criticalHigh: 20 },
  voltage: { warningLow: 210, warningHigh: 225, criticalLow: 0, criticalHigh: 230 },
};

// Delay before alarms activate after motor start (steady state)
const STARTUP_DELAY_MS = 5000;
// Minimum delay between consecutive notifications
const NOTIFICATION_COOLDOWN_MS = 3000;

export function useAlarms(
  current: number,
  rpm: number,
  voltage: number,
  isMotorOn: boolean
) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [thresholds] = useState<AlarmThresholds>(DEFAULT_THRESHOLDS);
  const [isInSteadyState, setIsInSteadyState] = useState(false);
  const motorStartTimeRef = useRef<number | null>(null);
  const lastNotificationTimeRef = useRef<number>(0);

  // Track motor on/off state and steady state
  useEffect(() => {
    if (isMotorOn) {
      if (motorStartTimeRef.current === null) {
        motorStartTimeRef.current = Date.now();
        setIsInSteadyState(false);
        
        // Set steady state after startup delay
        const timer = setTimeout(() => {
          setIsInSteadyState(true);
        }, STARTUP_DELAY_MS);
        
        return () => clearTimeout(timer);
      }
    } else {
      motorStartTimeRef.current = null;
      setIsInSteadyState(false);
    }
  }, [isMotorOn]);

  const getAlarmLevel = useCallback((): { level: AlarmLevel; activeAlarms: Alarm[] } => {
    // Don't generate alarms if motor is off or not in steady state
    if (!isMotorOn || !isInSteadyState) {
      return { level: "normal", activeAlarms: [] };
    }

    const newAlarms: Alarm[] = [];
    let highestLevel: AlarmLevel = "normal";

    // Check current
    if (current >= thresholds.current.critical) {
      highestLevel = "critical";
      newAlarms.push({
        id: `current-critical-${Date.now()}`,
        timestamp: new Date(),
        level: "critical",
        parameter: "Current",
        message: `Critical: Current at ${current.toFixed(2)}A exceeds ${thresholds.current.critical}A limit`,
        value: current,
        threshold: thresholds.current.critical,
      });
    } else if (current >= thresholds.current.warning) {
      if (highestLevel === "normal") highestLevel = "warning";
      newAlarms.push({
        id: `current-warning-${Date.now()}`,
        timestamp: new Date(),
        level: "warning",
        parameter: "Current",
        message: `Warning: Current at ${current.toFixed(2)}A approaching ${thresholds.current.critical}A limit`,
        value: current,
        threshold: thresholds.current.warning,
      });
    }

    // Check RPM
    if (rpm <= thresholds.rpm.criticalLow || rpm >= thresholds.rpm.criticalHigh) {
      highestLevel = "critical";
      newAlarms.push({
        id: `rpm-critical-${Date.now()}`,
        timestamp: new Date(),
        level: "critical",
        parameter: "RPM",
        message: `Critical: RPM at ${rpm} outside safe range (${thresholds.rpm.criticalLow}-${thresholds.rpm.criticalHigh})`,
        value: rpm,
        threshold: rpm < 1750 ? thresholds.rpm.criticalLow : thresholds.rpm.criticalHigh,
      });
    } else if (rpm <= thresholds.rpm.warningLow || rpm >= thresholds.rpm.warningHigh) {
      if (highestLevel === "normal") highestLevel = "warning";
      newAlarms.push({
        id: `rpm-warning-${Date.now()}`,
        timestamp: new Date(),
        level: "warning",
        parameter: "RPM",
        message: `Warning: RPM at ${rpm} approaching limits`,
        value: rpm,
        threshold: rpm < 1750 ? thresholds.rpm.warningLow : thresholds.rpm.warningHigh,
      });
    }

    // Check voltage
    if (voltage <= thresholds.voltage.criticalLow || voltage >= thresholds.voltage.criticalHigh) {
      highestLevel = "critical";
      newAlarms.push({
        id: `voltage-critical-${Date.now()}`,
        timestamp: new Date(),
        level: "critical",
        parameter: "Voltage",
        message: `Critical: Voltage at ${voltage.toFixed(1)}V outside safe range`,
        value: voltage,
        threshold: voltage < 220 ? thresholds.voltage.criticalLow : thresholds.voltage.criticalHigh,
      });
    } else if (voltage <= thresholds.voltage.warningLow || voltage >= thresholds.voltage.warningHigh) {
      if (highestLevel === "normal") highestLevel = "warning";
      newAlarms.push({
        id: `voltage-warning-${Date.now()}`,
        timestamp: new Date(),
        level: "warning",
        parameter: "Voltage",
        message: `Warning: Voltage at ${voltage.toFixed(1)}V approaching limits`,
        value: voltage,
        threshold: voltage < 220 ? thresholds.voltage.warningLow : thresholds.voltage.warningHigh,
      });
    }

    return { level: highestLevel, activeAlarms: newAlarms };
  }, [current, rpm, voltage, isMotorOn, isInSteadyState, thresholds]);

  const addToHistory = useCallback((newAlarms: Alarm[]) => {
    const now = Date.now();
    
    // Check notification cooldown (3 seconds between notifications)
    if (now - lastNotificationTimeRef.current < NOTIFICATION_COOLDOWN_MS) {
      return;
    }
    
    if (newAlarms.length > 0) {
      lastNotificationTimeRef.current = now;
      
      setAlarms((prev) => {
        // Deduplicate by checking if same parameter alarm exists within last 5 seconds
        const fiveSecondsAgo = Date.now() - 5000;
        const filtered = newAlarms.filter((alarm) => {
          return !prev.some(
            (existing) =>
              existing.parameter === alarm.parameter &&
              existing.level === alarm.level &&
              existing.timestamp.getTime() > fiveSecondsAgo
          );
        });
        return [...filtered, ...prev].slice(0, 100); // Keep last 100 alarms
      });
    }
  }, []);

  const { level: currentLevel, activeAlarms } = getAlarmLevel();

  useEffect(() => {
    addToHistory(activeAlarms);
  }, [current, rpm, voltage, addToHistory, activeAlarms]);

  return {
    currentLevel,
    activeAlarms,
    alarmHistory: alarms,
    thresholds,
    isInSteadyState,
  };
}