import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  ReferenceLine,
} from "recharts";
import { AlarmLevel } from "@/hooks/useAlarms";

interface DataPoint {
  time: string;
  value: number;
}

interface RealtimeChartProps {
  title: string;
  data: DataPoint[];
  unit: string;
  color: string;
  minValue?: number;
  maxValue?: number;
  warningThreshold?: { low?: number; high?: number };
  criticalThreshold?: { low?: number; high?: number };
  alarmLevel?: AlarmLevel;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  unit,
}: TooltipProps<number, string> & { unit: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="font-mono text-lg font-semibold text-foreground">
          {payload[0].value?.toFixed(2)} <span className="text-sm text-muted-foreground">{unit}</span>
        </p>
      </div>
    );
  }
  return null;
};

const RealtimeChart = ({
  title,
  data,
  unit,
  color,
  minValue,
  maxValue,
  warningThreshold,
  criticalThreshold,
  alarmLevel = "normal",
}: RealtimeChartProps) => {
  const isWarning = alarmLevel === "warning";
  const isCritical = alarmLevel === "critical";

  // Helper untuk membulatkan angka sumbu Y agar tidak kepanjangan
  const formatYAxis = (val: number) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`; // Cth: 1.5k
    return val.toFixed(0); // Cth: 220 (tanpa desimal)
  };

  return (
    <div className="chart-container h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: isCritical ? "hsl(var(--destructive))" : isWarning ? "hsl(var(--warning))" : color }}
          />
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
      </div>

      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: -10, bottom: 5 }} // Left margin dikurangi/negatif biar mepet kiri
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.5}
            />
            
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
              interval="preserveStartEnd"
            />
            
            {/* PERBAIKAN SUMBU Y */}
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              // Gunakan 'auto' jika props min/max tidak ada, atau angka fix jika ada.
              // Tips: Jangan gunakan minValue yang ketat (seperti 200) jika data bisa 0 (saat mati)
              domain={[
                minValue ?? 'auto', 
                maxValue ?? 'auto'
              ]}
              width={50} // Diperlebar dari 40 ke 50 agar angka 4 digit (RPM) muat
              tickFormatter={formatYAxis} // Format angka biar rapi
            />
            
            <Tooltip content={<CustomTooltip unit={unit} />} />

            {/* Threshold Lines (Warning & Critical) */}
            {warningThreshold?.low && <ReferenceLine y={warningThreshold.low} stroke="hsl(var(--warning))" strokeDasharray="5 5" strokeWidth={1} />}
            {warningThreshold?.high && <ReferenceLine y={warningThreshold.high} stroke="hsl(var(--warning))" strokeDasharray="5 5" strokeWidth={1} />}
            {criticalThreshold?.low && <ReferenceLine y={criticalThreshold.low} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeWidth={2} />}
            {criticalThreshold?.high && <ReferenceLine y={criticalThreshold.high} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeWidth={2} />}

            <Line
              type="monotone"
              dataKey="value"
              stroke={isCritical ? "hsl(var(--destructive))" : isWarning ? "hsl(var(--warning))" : color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              activeDot={{
                r: 6,
                fill: isCritical ? "hsl(var(--destructive))" : isWarning ? "hsl(var(--warning))" : color,
                stroke: "hsl(var(--background))",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RealtimeChart;