import { useMotorContext } from "@/contexts/MotorContext";

export const useUnitConversion = () => {
  const { speedUnit, setSpeedUnit, powerUnit, setPowerUnit } = useMotorContext();

  const convertSpeed = (rpm: number) => {
    const val = Number(rpm) || 0;

    if (speedUnit === "hz") {
      return val / 30;
    }
    if (speedUnit === "rad/s") {
      return val * 0.10472;
    }
    return val;
  };

  const getSpeedUnitLabel = () => {
    if (speedUnit === "hz") return "Hz";
    if (speedUnit === "rad/s") return "rad/s";
    return "RPM";
  };
  
  const calculatePower = (voltage: number, current: number) => {
    const pf = 0.85; 
    const root3 = 1.732; 
    return voltage * current * root3 * pf; 
  };

  const convertPower = (watts: number) => {
    const val = Number(watts) || 0;
    
    if (powerUnit === "kw") return val / 1000;
    if (powerUnit === "hp") return val / 745.7; 
    
    return val;
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