import { SpeedUnit, PowerUnit } from "@/hooks/useUnitConversion";
import { cn } from "@/lib/utils";

interface SpeedUnitSelectorProps {
  value: SpeedUnit;
  onChange: (unit: SpeedUnit) => void;
  type: "speed";
}

interface PowerUnitSelectorProps {
  value: PowerUnit;
  onChange: (unit: PowerUnit) => void;
  type: "power";
}

type UnitSelectorProps = SpeedUnitSelectorProps | PowerUnitSelectorProps;

const speedUnits: { value: SpeedUnit; label: string }[] = [
  { value: "rpm", label: "RPM" },
  { value: "hz", label: "Hz" },
  { value: "rads", label: "rad/s" },
];

const powerUnits: { value: PowerUnit; label: string }[] = [
  { value: "w", label: "W" },
  { value: "kw", label: "kW" },
  { value: "hp", label: "HP" },
];

const UnitSelector = (props: UnitSelectorProps) => {
  const units = props.type === "speed" ? speedUnits : powerUnits;
  const value = props.value;
  const onChange = props.onChange as (unit: string) => void;

  return (
    <div className="flex items-center gap-1 bg-secondary rounded-md p-1">
      {units.map((unit) => (
        <button
          key={unit.value}
          onClick={() => onChange(unit.value)}
          className={cn(
            "px-2 py-1 text-xs font-medium rounded transition-colors",
            value === unit.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={value === unit.value}
        >
          {unit.label}
        </button>
      ))}
    </div>
  );
};

export default UnitSelector;