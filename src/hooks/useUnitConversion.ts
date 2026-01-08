import { useMotorContext } from "@/contexts/MotorContext";

export const useUnitConversion = () => {
  const { speedUnit, setSpeedUnit, powerUnit, setPowerUnit } = useMotorContext();

  // 1. Konversi Speed (RPM <-> Hz <-> rad/s)
  const convertSpeed = (rpm: number) => {
    // Pastikan rpm angka valid
    const val = Number(rpm) || 0;

    if (speedUnit === "hz") {
      // Rumus: (RPM * Poles) / 120. Asumsi 4 Pole: RPM / 30
      return val / 30;
    }
    if (speedUnit === "rad/s") {
      // Rumus: RPM * (2 * PI / 60) -> approx 0.10472
      return val * 0.10472;
    }
    // Default RPM
    return val;
  };

  const getSpeedUnitLabel = () => {
    if (speedUnit === "hz") return "Hz";
    if (speedUnit === "rad/s") return "rad/s";
    return "RPM";
  };

  // 2. Hitung Power Base (Watt)
  const calculatePower = (voltage: number, current: number) => {
    const pf = 0.85; 
    const root3 = 1.732; 
    return voltage * current * root3 * pf; // Result in Watts
  };

  // 3. Konversi Power (Watt <-> kW <-> HP)
  const convertPower = (watts: number) => {
    const val = Number(watts) || 0;
    
    if (powerUnit === "kw") return val / 1000;
    if (powerUnit === "hp") return val / 745.7; // 1 HP = 745.7 Watt
    
    return val; // Default Watt
  };

  const getPowerUnitLabel = () => {
    if (powerUnit === "kw") return "kW";
    if (powerUnit === "hp") return "HP";
    return "W";
  };

  return {
    speedUnit,
    setSpeedUnit,
    powerUnit,
    setPowerUnit,
    convertSpeed,
    getSpeedUnitLabel,
    calculatePower,
    convertPower,
    getPowerUnitLabel,
  };
};