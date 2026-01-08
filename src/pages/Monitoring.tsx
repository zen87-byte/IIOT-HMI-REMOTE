import { useState, useEffect } from "react";
import { Activity, Calendar, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import RealtimeChart from "@/components/RealtimeChart";
import { useUnitConversion } from "@/hooks/useUnitConversion";
import { Button } from "@/components/ui/button";

interface HistoricalData {
  timestamp: string;
  voltage: number;
  current: number;
  rpm: number;
}

const TIME_RANGES = [
  { label: "30 Menit", value: "30m" },
  { label: "1 Jam", value: "1h" },
  { label: "6 Jam", value: "6h" },
  { label: "12 Jam", value: "12h" },
  { label: "24 Jam", value: "24h" },
  { label: "7 Hari", value: "7d" },
  { label: "30 Hari", value: "30d" },
] as const;

type TimeRangeValue = typeof TIME_RANGES[number]["value"];

const Monitoring = () => {
  const [range, setRange] = useState<TimeRangeValue>("1h"); // Default 1 Jam
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HistoricalData[]>([]);
  
  const { convertSpeed, getSpeedUnitLabel, convertPower, getPowerUnitLabel, calculatePower } = useUnitConversion();

  const fetchData = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const res = await fetch(`${apiUrl}/api/motor?range=${range}`);
      
      if (!res.ok) throw new Error("Gagal mengambil data history");
      
      const rawData = await res.json();
      
      setData(rawData);
      toast.success(`Data dimuat: ${rawData.length} titik data`);
    } catch (error) {
      console.error(error);
      toast.error("Gagal koneksi ke Database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [range]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER & FILTER */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-card p-4 rounded-lg border border-border">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Historical Monitoring
          </h2>
          <p className="text-sm text-muted-foreground">Analisa data periodik dari Database</p>
        </div>

        {/* TIME RANGE BUTTONS */}
        <div className="flex flex-wrap items-center gap-2 bg-secondary/30 p-1.5 rounded-lg">
          {TIME_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                range === r.value 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {r.label}
            </button>
          ))}
          
          <div className="w-px h-6 bg-border mx-1 hidden sm:block"></div>
          
          <Button variant="ghost" size="icon" onClick={fetchData} disabled={loading} title="Refresh Data">
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* CHARTS GRID */}
      {loading ? (
        <div className="h-[400px] flex items-center justify-center text-muted-foreground animate-pulse">
          Sedang mengambil data dari database...
        </div>
      ) : data.length === 0 ? (
        <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-lg bg-card/50">
          <Calendar className="w-12 h-12 mb-3 opacity-20" />
          <p>Tidak ada data ditemukan untuk periode {TIME_RANGES.find(r => r.value === range)?.label}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart Voltage */}
          <div className="glass-card p-4 rounded-lg h-[350px]">
            <RealtimeChart 
              title="Voltage History"
              unit="V"
              color="hsl(var(--chart-voltage))"
              data={data.map(d => ({ 
                // Format waktu disesuaikan: kalau range harian tampilkan tanggal, kalau jam tampilkan jam:menit
                time: new Date(d.timestamp).toLocaleTimeString('id-ID', {
                  hour:'2-digit', minute:'2-digit', 
                  day: range.includes('d') ? 'numeric' : undefined,
                  month: range.includes('d') ? 'short' : undefined
                }), 
                value: Number(d.voltage) 
              }))}
              minValue={210} maxValue={230}
            />
          </div>

          {/* Chart Current */}
          <div className="glass-card p-4 rounded-lg h-[350px]">
            <RealtimeChart 
              title="Current Load History"
              unit="A"
              color="hsl(var(--chart-current))"
              data={data.map(d => ({ 
                time: new Date(d.timestamp).toLocaleTimeString('id-ID', {
                  hour:'2-digit', minute:'2-digit',
                  day: range.includes('d') ? 'numeric' : undefined,
                  month: range.includes('d') ? 'short' : undefined
                }), 
                value: Number(d.current) 
              }))}
              minValue={10} maxValue={30}
            />
          </div>

          {/* Chart Speed */}
          <div className="glass-card p-4 rounded-lg h-[350px]">
            <RealtimeChart 
              title="Speed History"
              unit={getSpeedUnitLabel()}
              color="hsl(var(--chart-rpm))"
              data={data.map(d => ({ 
                time: new Date(d.timestamp).toLocaleTimeString('id-ID', {
                  hour:'2-digit', minute:'2-digit',
                  day: range.includes('d') ? 'numeric' : undefined,
                  month: range.includes('d') ? 'short' : undefined
                }), 
                value: convertSpeed(Number(d.rpm))
              }))}
              minValue={1600}
            />
          </div>

          {/* Chart Power */}
          <div className="glass-card p-4 rounded-lg h-[350px]">
            <RealtimeChart 
              title="Power Consumption"
              unit={getPowerUnitLabel()}
              color="hsl(var(--chart-power))"
              data={data.map(d => {
                const w = calculatePower(Number(d.voltage), Number(d.current));
                return {
                  time: new Date(d.timestamp).toLocaleTimeString('id-ID', {
                    hour:'2-digit', minute:'2-digit',
                    day: range.includes('d') ? 'numeric' : undefined,
                    month: range.includes('d') ? 'short' : undefined
                  }),
                  value: convertPower(w)
                };
              })}
              minValue={2400}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Monitoring;