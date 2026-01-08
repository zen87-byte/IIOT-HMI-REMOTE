import { cn } from "@/lib/utils";

// Tambahkan 'live' ke tipe data
export type TimeRange = "live" | "1h" | "6h" | "24h" | "7d" | "30d";

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const ranges: { value: TimeRange; label: string }[] = [
  { value: "live", label: "Live" }, // Opsi baru
  { value: "1h", label: "1 Hour" },
  { value: "6h", label: "6 Hours" },
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

const TimeRangeSelector = ({ value, onChange }: TimeRangeSelectorProps) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg overflow-x-auto" role="tablist">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          role="tab"
          aria-selected={value === range.value}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            value === range.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};

export default TimeRangeSelector;