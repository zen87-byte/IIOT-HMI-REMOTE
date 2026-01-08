import { useState, useEffect } from "react";
import { 
  Bell, AlertTriangle, AlertOctagon, CheckCircle2, 
  History, RefreshCcw, Search
} from "lucide-react";
import { useMotorContext } from "@/contexts/MotorContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AlarmLog {
  id: number;
  timestamp: string;
  level: "warning" | "critical";
  message: string;
  status: "ACTIVE" | "RESOLVED";
}

const Alarm = () => {
  const { activeAlarms } = useMotorContext();
  const [historyLogs, setHistoryLogs] = useState<AlarmLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "critical" | "warning">("all");

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const res = await fetch(`${apiUrl}/api/alarms`);
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data);
      }
    } catch (error) {
      console.error("Failed to fetch alarms", error);
      toast.error("Gagal memuat riwayat alarm");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = historyLogs.filter(log => 
    filter === "all" ? true : log.level === filter
  );

  return (
    // PERBAIKAN 1: Hapus 'max-w-7xl mx-auto', ganti dengan 'h-full w-full p-4'
    <div className="h-full w-full p-4 flex flex-col gap-6 animate-in fade-in duration-500 overflow-hidden">
      
      {/* --- SECTION 1: LIVE ACTIVE ALARMS --- */}
      <div className="flex-none space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className={cn("w-6 h-6", activeAlarms.length > 0 ? "text-destructive animate-bounce" : "text-muted-foreground")} />
            {activeAlarms.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-ping" />
            )}
          </div>
          <h2 className="text-xl font-bold">Active System Alarms</h2>
        </div>

        {activeAlarms.length === 0 ? (
          <div className="glass-card p-6 rounded-xl flex items-center gap-4 border-l-4 border-l-success bg-success/5">
            <CheckCircle2 className="w-8 h-8 text-success" />
            <div>
              <h3 className="text-md font-semibold text-success">All Systems Nominal</h3>
              <p className="text-xs text-muted-foreground">No active faults detected in real-time monitoring.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeAlarms.map((alarm) => (
              <div 
                key={alarm.id} 
                className={cn(
                  "p-4 rounded-xl border shadow-lg relative overflow-hidden flex flex-col gap-1",
                  alarm.level === 'critical' 
                    ? "bg-destructive/10 border-destructive text-destructive" 
                    : "bg-warning/10 border-warning text-warning"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {alarm.level === 'critical' ? <AlertOctagon className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
                    <span className="font-bold uppercase tracking-wider text-xs">{alarm.level}</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-80 animate-pulse bg-background/20 px-1 rounded">LIVE</span>
                </div>
                <h3 className="text-sm font-bold leading-tight">{alarm.message}</h3>
                <p className="text-[10px] opacity-75">{new Date().toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- SECTION 2: ALARM HISTORY (DATABASE) --- */}
      {/* Gunakan flex-1 agar tabel mengisi sisa layar ke bawah */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        
        {/* Header & Controls */}
        <div className="flex-none flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-3 rounded-lg border border-border">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Event Log History
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-secondary/50 p-1 rounded-lg">
              {(["all", "warning", "critical"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all",
                    filter === f ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            <Button variant="outline" size="icon" onClick={fetchHistory} disabled={loading}>
              <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Table List Container */}
        {/* PERBAIKAN 2: Gunakan overflow-auto agar tabel bisa discroll di dalam card */}
        <div className="flex-1 glass-card rounded-xl overflow-hidden relative">
          <div className="absolute inset-0 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs font-semibold sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">Message</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((log) => (
                    <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                          log.level === 'critical' 
                            ? "bg-destructive/10 text-destructive border-destructive/20" 
                            : "bg-warning/10 text-warning border-warning/20"
                        )}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-medium text-foreground">
                        {log.message}
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                          {log.status || "LOGGED"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 opacity-20" />
                        <p>No log records found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Alarm;