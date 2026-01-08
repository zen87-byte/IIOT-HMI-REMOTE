import { useState, useMemo } from "react";

export type SpeedUnit = "rpm" | "hz" | "rads";
export type PowerUnit = "W" | "kW" | "HP";

interface UnitConversion {
  speedUnit: SpeedUnit;
  setSpeedUnit: (unit: SpeedUnit) => void;
  convertSpeed: (rpm: number) => number;
  getSpeedUnitLabel: () => string;
  powerUnit: PowerUnit;
  setPowerUnit: (unit: PowerUnit) => void;
  convertPower: (watts: number) => number;
  getPowerUnitLabel: () => string;
  calculatePower: (voltage: number, current: number, powerFactor?: number) => number;
}

export function useUnitConversion(): UnitConversion {
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>("rpm");
  const [powerUnit, setPowerUnit] = useState<PowerUnit>("W");

  const convertSpeed = useMemo(() => {
    return (rpm: number): number => {
      switch (speedUnit) {
        case "hz":
          // RPM to Hz: divide by 60
          return Number((rpm / 60).toFixed(2));
        case "rads":
          // RPM to rad/s: multiply by 2π/60
          return Number(((rpm * 2 * Math.PI) / 60).toFixed(2));
        case "rpm":
        default:
          return rpm;
      }
    };
  }, [speedUnit]);

  const getSpeedUnitLabel = (): string => {
    switch (speedUnit) {
      case "hz":
        return "Hz";
      case "rads":
        return "rad/s";
      case "rpm":
      default:
        return "RPM";
    }
  };

  const convertPower = useMemo(() => {
    return (watts: number): number => {
      switch (powerUnit) {
        case "kW":
          return Number((watts / 1000).toFixed(3));
        case "HP":
          // 1 HP = 745.7 watts
          return Number((watts / 745.7).toFixed(3));
        case "W":
        default:
          return Number(watts.toFixed(1));
      }
    };
  }, [powerUnit]);

  const getPowerUnitLabel = (): string => {
    return powerUnit;
  };

  // Calculate apparent power (VA) or real power with power factor
  const calculatePower = (voltage: number, current: number, powerFactor = 0.85): number => {
    // P = V × I × PF (for single-phase AC)
    return Number((voltage * current * powerFactor).toFixed(1));
  };

  return {
    speedUnit,
    setSpeedUnit,
    convertSpeed,
    getSpeedUnitLabel,
    powerUnit,
    setPowerUnit,
    convertPower,
    getPowerUnitLabel,
    calculatePower,
  };
}