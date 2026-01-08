import { useState, useEffect } from "react";
import { Zap, Activity, Gauge, Settings, Bell, LogOut, Bolt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import MotorToggle from "@/components/MotorToggle";
import StatusCard from "@/components/StatusCard";
import RealtimeChart from "@/components/RealtimeChart";
import TimeRangeSelector, { TimeRange } from "@/components/TimeRangeSelector";
import UsageHistory from "@/components/UsageHistory";
import UnitSelector from "@/components/UnitSelector";
import useMotorData from "@/hooks/useMotorData";
import { useAlarms, Alarm } from "@/hooks/useAlarms";
import { useUnitConversion } from "@/hooks/useUnitConversion";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// --- Types ---
interface HistoryEntry {
  id: string;
  timestamp: string;
  event: "start" | "stop" | "warning" | "maintenance" | "critical";
  description: string;
  duration?: string;
}

const Index = () => {
  // --- Hooks & State ---
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isMotorOn, setIsMotorOn] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("live");

  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([
    {
      id: "1",
      timestamp: "Today, 14:32",
      event: "start",
      description: "Motor started - Normal operation",
    },
    {
      id: "2",
      timestamp: "Today, 10:15",
      event: "stop",
      description: "Motor stopped - User initiated",
      duration: "4h 17m",
    },
  ]);

  // Fetch Data (MQTT for Live / API for History)
  const motorData = useMotorData(isMotorOn, timeRange);

  // Alarm Logic
  const { thresholds } = useAlarms(
    motorData.current,
    motorData.rpm,
    motorData.voltage,
    isMotorOn
  );
  
  // Perhitungan Alarm Aktif untuk History Log
  // Kita panggil hook lagi atau gunakan value dari hook di atas jika sudah di-return
  // Asumsi: useAlarms mengembalikan activeAlarms
  const { activeAlarms } = useAlarms(
    motorData.current, 
    motorData.rpm, 
    motorData.voltage, 
    isMotorOn
  );

  // Unit Conversion
  const {
    speedUnit, setSpeedUnit, convertSpeed, getSpeedUnitLabel,
    powerUnit, setPowerUnit, convertPower, getPowerUnitLabel,
    calculatePower
  } = useUnitConversion();

  const isOperator = user?.role === "operator";
  const powerWatts = calculatePower(motorData.voltage, motorData.current);
  const displayPower = isMotorOn ? convertPower(powerWatts) : 0;

  // --- Effects ---

  // Handle Alarm Logging with Debouncing/Anti-Flood
  useEffect(() => {
    if (activeAlarms.length > 0) {
      const newEntries: HistoryEntry[] = activeAlarms.map((alarm: Alarm) => ({
        id: alarm.id,
        timestamp: new Date().toLocaleString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        event: alarm.level === "critical" ? "critical" as const : "warning" as const,
        description: alarm.message,
      }));

      setHistoryEntries((prev) => {
        const lastEntry = prev[0];

        // Filter: Hanya terima entry baru jika BERBEDA dengan entry terakhir
        // Mencegah spam log jika error yang sama muncul terus menerus
        const uniqueNewEntries = newEntries.filter(newEntry => {
          if (!lastEntry) return true;
          if (newEntry.description === lastEntry.description && newEntry.event === lastEntry.event) {
            return false;
          }
          return true;
        });

        if (uniqueNewEntries.length === 0) return prev;

        // Simpan 100 history terakhir
        return [...uniqueNewEntries, ...prev].slice(0, 100); 
      });

      // Toast notification tetap muncul untuk feedback visual langsung
      activeAlarms.forEach((alarm: Alarm) => {
        if (alarm.level === "critical") {
          toast.error(alarm.message);
        } else {
          toast.warning(alarm.message);
        }
      });
    }
  }, [activeAlarms]);

  // --- Handlers ---

  const handleMotorToggle = (newState: boolean) => {
    if (!isOperator) {
      toast.error("Access Denied", {
        description: "Only operators can control the motor",
      });
      return;
    }

    setIsMotorOn(newState);

    const entry: HistoryEntry = {
      id: `event-${Date.now()}`,
      timestamp: new Date().toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      event: newState ? "start" : "stop",
      description: newState ? "Motor started - Operator initiated" : "Motor stopped - Operator initiated",
    };
    
    setHistoryEntries((prev) => [entry, ...prev].slice(0, 100));

    toast(newState ? "Motor Started" : "Motor Stopped", {
      description: newState
        ? "The AC motor is now running"
        : "The AC motor has been stopped",
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Helper: Determine alarm status per card
  const getCurrentAlarmLevel = () => {
    if (!isMotorOn) return "normal";
    if (motorData.current >= thresholds.current.critical) return "critical";
    if (motorData.current >= thresholds.current.warning) return "warning";
    return "normal";
  };

  const getRpmAlarmLevel = () => {
    if (!isMotorOn) return "normal";
    if (motorData.rpm <= thresholds.rpm.criticalLow || motorData.rpm >= thresholds.rpm.criticalHigh) return "critical";
    if (motorData.rpm <= thresholds.rpm.warningLow || motorData.rpm >= thresholds.rpm.warningHigh) return "warning";
    return "normal";
  };

  const getVoltageAlarmLevel = () => {
    if (!isMotorOn) return "normal";
    if (motorData.voltage <= thresholds.voltage.criticalLow || motorData.voltage >= thresholds.voltage.criticalHigh) return "critical";
    if (motorData.voltage <= thresholds.voltage.warningLow || motorData.voltage >= thresholds.voltage.warningHigh) return "warning";
    return "normal";
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />

      {/* Header - Full Width */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Gauge className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  IIoT Motor Control
                </h1>
                <p className="text-sm text-muted-foreground">
                  AC Motor Monitoring Dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg">
                <span className="text-sm text-muted-foreground">Role:</span>
                <span className="text-sm font-medium text-label capitalize">
                  {user?.role}
                </span>
              </div>
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors" aria-label="Notifications">
                <Bell className="w-5 h-5 text-muted-foreground" />
              </button>
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors" aria-label="Settings">
                <Settings className="w-5 h-5 text-muted-foreground" />
              </button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Full Width */}
      <main className="w-full px-6 py-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column - Motor Control */}
          <div className="lg:col-span-3">
            <div className="glass-card rounded-lg p-6 flex flex-col items-center sticky top-24">
              <h2 className="text-lg font-semibold mb-2 text-center">
                Motor Control
              </h2>
              {!isOperator && (
                <p className="text-xs text-muted-foreground mb-4 text-center">
                  View only - Operator access required
                </p>
              )}
              <MotorToggle
                isOn={isMotorOn}
                onToggle={handleMotorToggle}
                disabled={!isOperator}
              />

              <div className="mt-6 w-full pt-6 border-t border-border">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="label-text text-xs">Uptime</p>
                    <p className="font-mono text-lg mt-1">
                      {isMotorOn ? "00:12:34" : "--:--:--"}
                    </p>
                  </div>
                  <div>
                    <p className="label-text text-xs">Cycles</p>
                    <p className="font-mono text-lg mt-1">1,247</p>
                  </div>
                </div>
              </div>

              {/* Units Selection */}
              <div className="mt-6 w-full pt-6 border-t border-border space-y-4">
                <div>
                  <p className="label-text text-xs text-center mb-2">Speed Unit</p>
                  <div className="flex justify-center">
                    <UnitSelector type="speed" value={speedUnit} onChange={setSpeedUnit} />
                  </div>
                </div>
                <div>
                  <p className="label-text text-xs text-center mb-2">Power Unit</p>
                  <div className="flex justify-center">
                    <UnitSelector type="power" value={powerUnit} onChange={setPowerUnit} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column - Stats & Charts */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatusCard
                title="Voltage"
                value={motorData.voltage}
                unit="V"
                icon={Zap}
                variant="voltage"
                trend={isMotorOn ? "stable" : undefined}
                trendValue={isMotorOn ? "±2.1%" : undefined}
                alarmLevel={getVoltageAlarmLevel()}
              />
              <StatusCard
                title="Current"
                value={motorData.current}
                unit="A"
                icon={Activity}
                variant="current"
                trend={isMotorOn ? "up" : undefined}
                trendValue={isMotorOn ? "0.3A" : undefined}
                alarmLevel={getCurrentAlarmLevel()}
              />
              <StatusCard
                title="Speed"
                value={convertSpeed(motorData.rpm)}
                unit={getSpeedUnitLabel()}
                icon={Gauge}
                variant="rpm"
                trend={isMotorOn ? "stable" : undefined}
                trendValue={isMotorOn ? "±1.2%" : undefined}
                alarmLevel={getRpmAlarmLevel()}
              />
              <StatusCard
                title="Power"
                value={displayPower}
                unit={getPowerUnitLabel()}
                icon={Bolt}
                variant="power"
                trend={isMotorOn ? "stable" : undefined}
                trendValue={isMotorOn ? "±3.5%" : undefined}
              />
            </div>

            {/* Time Range & Charts Title */}
            <div className="flex items-center justify-between bg-card/50 p-2 rounded-lg border border-border/50">
              <h2 className="text-sm font-semibold px-2">
                {timeRange === "live" ? "Real-time Monitoring" : "Historical Data Analysis"}
              </h2>
              <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card rounded-lg p-4 h-[320px]">
                <RealtimeChart
                  title="Voltage Trend"
                  data={motorData.voltageHistory}
                  unit="V"
                  color="hsl(var(--chart-voltage))"
                  minValue={200}
                  maxValue={240}
                  warningThreshold={{ low: thresholds.voltage.warningLow, high: thresholds.voltage.warningHigh }}
                  criticalThreshold={{ low: thresholds.voltage.criticalLow, high: thresholds.voltage.criticalHigh }}
                  alarmLevel={getVoltageAlarmLevel()}
                />
              </div>
              <div className="glass-card rounded-lg p-4 h-[320px]">
                <RealtimeChart
                  title="Current Load"
                  data={motorData.currentHistory}
                  unit="A"
                  color="hsl(var(--chart-current))"
                  minValue={0}
                  maxValue={25}
                  warningThreshold={{ high: thresholds.current.warning }}
                  criticalThreshold={{ high: thresholds.current.critical }}
                  alarmLevel={getCurrentAlarmLevel()}
                />
              </div>
              <div className="glass-card rounded-lg p-4 h-[320px]">
                <RealtimeChart
                  title="Motor Speed"
                  data={motorData.rpmHistory}
                  unit={getSpeedUnitLabel()}
                  color="hsl(var(--chart-rpm))"
                  minValue={1500}
                  maxValue={2000}
                  warningThreshold={{ low: thresholds.rpm.warningLow, high: thresholds.rpm.warningHigh }}
                  criticalThreshold={{ low: thresholds.rpm.criticalLow, high: thresholds.rpm.criticalHigh }}
                  alarmLevel={getRpmAlarmLevel()}
                />
              </div>
              <div className="glass-card rounded-lg p-4 h-[320px]">
                <RealtimeChart
                  title="Power Usage"
                  data={motorData.powerHistory.map(p => ({
                    time: p.time,
                    value: convertPower(p.value)
                  }))}
                  unit={getPowerUnitLabel()}
                  color="hsl(var(--chart-power))"
                  minValue={0}
                  maxValue={powerUnit === "W" ? 5000 : powerUnit === "kW" ? 5 : 7}
                />
              </div>
            </div>
          </div>

          {/* Right Column - History - Full Height */}
          <div className="lg:col-span-3">
             {/* Tambahkan sticky agar history tetap terlihat saat scroll */}
             <div className="sticky top-24 h-[calc(100vh-8rem)]">
                <UsageHistory entries={historyEntries} />
             </div>
          </div>

        </div>
      </main>

      {/* Footer - Full Width */}
      <footer className="border-t border-border mt-8 py-4">
        <div className="w-full px-6 text-center text-sm text-muted-foreground">
          <p>IIoT Motor Control System • Industrial Internet of Things Lab</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;