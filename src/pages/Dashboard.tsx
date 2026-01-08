import { Zap, Activity, Gauge, Bolt, CheckCircle, AlertTriangle, AlertOctagon } from "lucide-react";
import StatusCard from "@/components/StatusCard";
import RealtimeChart from "@/components/RealtimeChart";
import { useMotorContext } from "@/contexts/MotorContext";
import { useUnitConversion } from "@/hooks/useUnitConversion";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  // Ambil data real-time dari Context
  const { isMotorOn, motorData, thresholds, activeAlarms } = useMotorContext();
  
  // Ambil helper konversi unit
  const { convertSpeed, getSpeedUnitLabel, convertPower, getPowerUnitLabel } = useUnitConversion();

  // 1. SAFETY CHECK: Cegah Blank Screen jika data belum siap
  if (!motorData || !motorData.voltageHistory) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <Activity className="w-10 h-10 text-primary" />
          <span className="text-sm text-muted-foreground">Connecting to MQTT Broker...</span>
        </div>
      </div>
    );
  }

  // 2. Tampilkan Power langsung dari data MQTT (bukan kalkulasi manual lagi)
  // Kita konversi sesuai unit yang dipilih (watt/kw/hp)
  const displayPower = isMotorOn ? convertPower(motorData.power) : 0;

  // 3. Helper Logic untuk menentukan warna status (Normal/Warning/Critical)
  const getAlarmLevel = (val: number, type: 'current' | 'voltage' | 'rpm') => {
    if (!isMotorOn) return "normal";
    const t = thresholds[type];

    if (type === 'voltage') {
      if (val <= t.criticalLow || val >= t.criticalHigh) return "critical";
      if (val <= t.warningLow || val >= t.warningHigh) return "warning";
    } else if (type === 'rpm') {
      if (val <= t.criticalLow || val >= t.criticalHigh) return "critical";
      if (val <= t.warningLow || val >= t.warningHigh) return "warning";
    } else if (type === 'current') {
      if (val >= t.critical) return "critical";
      if (val >= t.warning) return "warning";
    }
    return "normal";
  };

  // 4. Komponen Panel Status Sistem (Kanan Bawah)
  const renderSystemStatus = () => {
    if (!isMotorOn) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-secondary/20 rounded-lg border-2 border-dashed border-border">
          <div className="p-4 bg-secondary rounded-full mb-3">
            <Zap className="w-8 h-8 opacity-50" />
          </div>
          <h3 className="text-lg font-semibold">MOTOR OFF</h3>
          <p className="text-sm">System is in standby</p>
        </div>
      );
    }

    if (activeAlarms.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-success/10 border border-success/30 rounded-lg animate-in fade-in">
          <div className="p-4 bg-success/20 rounded-full mb-3 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
            <CheckCircle className="w-12 h-12 text-success" />
          </div>
          <h3 className="text-2xl font-bold text-success tracking-wide">SYSTEM NORMAL</h3>
          <p className="text-sm text-success/80 mt-1">All parameters within limits</p>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col gap-3 overflow-y-auto pr-1">
        {activeAlarms.map((alarm) => (
          <div
            key={alarm.id}
            className={cn(
              "flex flex-col p-4 rounded-lg border shadow-sm animate-pulse",
              alarm.level === 'critical'
                ? "bg-destructive/10 border-destructive text-destructive"
                : "bg-warning/10 border-warning text-warning"
            )}
          >
            <div className="flex items-center gap-3 mb-1">
              {alarm.level === 'critical' ? <AlertOctagon className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              <span className="font-bold text-lg uppercase tracking-wider">
                {alarm.level === 'critical' ? 'CRITICAL ERROR' : 'WARNING ALERT'}
              </span>
            </div>
            <p className="text-foreground font-medium pl-9 text-md leading-tight">
              {alarm.message}
            </p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col gap-4 p-4 overflow-hidden animate-in fade-in duration-500">

      {/* --- TOP BAR: Indikator Live --- */}
      <div className="flex-none flex items-center justify-between bg-card/50 px-4 py-2 rounded-lg border border-border/50">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm font-semibold">KIT 2-C Motor - Multi Topic Sync</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
          </span>
          <span className="text-xs font-mono text-success font-bold">LIVE MQTT</span>
        </div>
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4">

        {/* KOLOM KIRI: 4 Grafik (2x2) */}
        <div className="col-span-9 grid grid-cols-2 grid-rows-2 gap-4 h-full">
          
          <div className="glass-card rounded-lg p-3 min-h-0 overflow-hidden flex flex-col">
            <RealtimeChart
              title="Voltage"
              data={motorData.voltageHistory}
              unit="V"
              color="hsl(var(--chart-voltage))"
              minValue={215} maxValue={230}
              criticalThreshold={{high: 230}}
              alarmLevel={getAlarmLevel(motorData.voltage, 'voltage')}
            />
          </div>

          <div className="glass-card rounded-lg p-3 min-h-0 overflow-hidden flex flex-col">
            <RealtimeChart
              title="Current"
              data={motorData.currentHistory}
              unit="A"
              color="hsl(var(--chart-current))"
              minValue={0} maxValue={2.5} criticalThreshold={{high: 2}}
              alarmLevel={getAlarmLevel(motorData.current, 'current')}
            />
          </div>

          <div className="glass-card rounded-lg p-3 min-h-0 overflow-hidden flex flex-col">
            <RealtimeChart
              title="Speed"
              data={motorData.rpmHistory.map(r => ({ time: r.time, value: convertSpeed(r.value) }))}
              unit={getSpeedUnitLabel()}
              color="hsl(var(--chart-rpm))"
              minValue={0} criticalThreshold={{high: 20}} maxValue={25}
              alarmLevel={getAlarmLevel(motorData.rpm, 'rpm')}
            />
          </div>

          <div className="glass-card rounded-lg p-3 min-h-0 overflow-hidden flex flex-col">
            <RealtimeChart
              title="Power"
              data={motorData.powerHistory.map(p => ({ time: p.time, value: convertPower(p.value) }))}
              unit={getPowerUnitLabel()}
              color="hsl(var(--chart-power))"
              minValue={0}
            />
          </div>
        </div>

        {/* KOLOM KANAN: Status Cards & Alarm Panel */}
        <div className="col-span-3 flex flex-col gap-4 h-full">
          
          <div className="flex flex-col gap-3">
            <StatusCard
              title="Voltage" value={motorData.voltage} unit="V" icon={Zap} variant="voltage"
              alarmLevel={getAlarmLevel(motorData.voltage, 'voltage')} className="py-3"
            />
            <StatusCard
              title="Current" value={motorData.current} unit="A" icon={Activity} variant="current"
              alarmLevel={getAlarmLevel(motorData.current, 'current')} className="py-3"
            />
            <StatusCard
              title="Speed" value={convertSpeed(motorData.rpm)} unit={getSpeedUnitLabel()} icon={Gauge} variant="rpm"
              alarmLevel={getAlarmLevel(motorData.rpm, 'rpm')} className="py-3"
            />
            <StatusCard
              title="Power" value={displayPower} unit={getPowerUnitLabel()} icon={Bolt} variant="power"
              className="py-3"
            />
          </div>

          <div className="flex-1 glass-card rounded-lg p-4 min-h-0 flex flex-col overflow-hidden">
            <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-widest border-b border-border/50 pb-2">
              System Condition
            </h3>
            <div className="flex-1 relative overflow-hidden">
              <div className="absolute inset-0 overflow-y-auto">
                {renderSystemStatus()}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;