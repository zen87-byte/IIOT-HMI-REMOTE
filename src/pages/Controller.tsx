import { useState, useEffect } from "react";
import MotorToggle from "@/components/MotorToggle";
import UnitSelector from "@/components/UnitSelector";
import { useMotorContext } from "@/contexts/MotorContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RotateCw, RotateCcw, Save, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";

const Controller = () => {
  // 1. AMBIL SEMUA DARI CONTEXT (Termasuk Unit & Setter)
  // Jangan pakai useUnitConversion di sini agar API terpanggil
  const { 
    isMotorOn, 
    handleMotorToggle, 
    pid,       
    setPid,    
    direction, 
    setDirection,
    // Ambil Unit langsung dari Context
    speedUnit, 
    setSpeedUnit,
    powerUnit,
    setPowerUnit
  } = useMotorContext();

  const { user } = useAuth();
  const isOperator = user?.role === "operator";

  // 2. Local State untuk Input PID
  const [localPid, setLocalPid] = useState(pid);

  // 3. Sinkronisasi PID
  useEffect(() => {
    setLocalPid(pid);
  }, [pid]);

  const handleApplyPid = () => {
    if (!isOperator) return;
    setPid(localPid); // Ini akan memanggil API -> Backend -> MQTT
  };

  return (
    <div className="max-w-5xl mx-auto animate-in zoom-in-95 duration-300 pb-10">
      
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold">Manual Control Panel</h2>
        <p className="text-muted-foreground">Direct PLC override & unit configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* KOLOM KIRI: MAIN CONTROL */}
        <div className="space-y-6">
          
          {/* MASTER SWITCH */}
          <div className="glass-card p-10 rounded-xl flex flex-col items-center justify-center min-h-[300px]">
            <h3 className="text-lg font-semibold mb-8 text-label">Master Switch</h3>
            <MotorToggle 
              isOn={isMotorOn} 
              onToggle={handleMotorToggle} 
              disabled={!isOperator} 
            />
            {!isOperator && (
               <div className="mt-6 p-3 bg-secondary/50 rounded text-xs text-muted-foreground">
                  ⚠ View Only mode. Login as Operator to control.
               </div>
            )}
          </div>

          {/* DIRECTION CONTROL */}
          <div className="glass-card p-6 rounded-xl">
             <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
               <RotateCw className="w-5 h-5 text-primary"/> Motor Direction
             </h3>
             <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant={direction === "FWD" ? "default" : "outline"}
                  className={cn("h-12 text-md", direction === "FWD" && "bg-success hover:bg-success/80 text-white")}
                  onClick={() => setDirection("FWD")}
                  disabled={!isOperator || isMotorOn} 
                  title={isMotorOn ? "Stop motor to change direction" : ""}
                >
                  <RotateCw className="mr-2 w-5 h-5" /> FORWARD
                </Button>

                <Button 
                  variant={direction === "REV" ? "default" : "outline"}
                  className={cn("h-12 text-md", direction === "REV" && "bg-warning hover:bg-warning/80 text-black")}
                  onClick={() => setDirection("REV")}
                  disabled={!isOperator || isMotorOn} 
                  title={isMotorOn ? "Stop motor to change direction" : ""}
                >
                  <RotateCcw className="mr-2 w-5 h-5" /> REVERSE
                </Button>
             </div>
             
             {isMotorOn && (
                <p className="text-xs text-muted-foreground mt-3 text-center animate-pulse text-warning">
                   ⚠️ Stop the motor to change direction.
                </p>
             )}
          </div>
        </div>

        {/* KOLOM KANAN: CONFIGURATION */}
        <div className="space-y-6">
          
          {/* PID PARAMETERS */}
          <div className="glass-card p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-semibold flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary"/> PID Parameters
              </h3>
              <Button 
                size="sm" 
                onClick={handleApplyPid} 
                disabled={!isOperator}
              >
                <Save className="w-4 h-4 mr-2" /> Apply
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs uppercase text-muted-foreground mb-1 block">Kp</label>
                <Input 
                  type="number" step="0.1"
                  value={localPid.kp}
                  onChange={(e) => setLocalPid({...localPid, kp: parseFloat(e.target.value)})}
                  disabled={!isOperator}
                  className="font-mono text-center"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-muted-foreground mb-1 block">Ki</label>
                <Input 
                  type="number" step="0.01"
                  value={localPid.ki}
                  onChange={(e) => setLocalPid({...localPid, ki: parseFloat(e.target.value)})}
                  disabled={!isOperator}
                  className="font-mono text-center"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-muted-foreground mb-1 block">Kd</label>
                <Input 
                  type="number" step="0.01"
                  value={localPid.kd}
                  onChange={(e) => setLocalPid({...localPid, kd: parseFloat(e.target.value)})}
                  disabled={!isOperator}
                  className="font-mono text-center"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 text-right">
              Changes are synced to HMI automatically.
            </p>
          </div>

          {/* DISPLAY UNITS */}
          <div className="glass-card p-6 rounded-xl">
             <h3 className="text-md font-semibold mb-4">Display Units</h3>
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase text-muted-foreground">Speed</label>
                  {/* Pastikan onChange memanggil setSpeedUnit dari Context */}
                  <UnitSelector 
                    type="speed" 
                    value={speedUnit} 
                    onChange={setSpeedUnit} 
                    disabled={!isOperator}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase text-muted-foreground">Power</label>
                  <UnitSelector 
                    type="power" 
                    value={powerUnit} 
                    onChange={setPowerUnit}
                    disabled={!isOperator}
                  />
                </div>
             </div>
             <p className="text-[10px] text-muted-foreground mt-3">
               *Unit selection is synchronized across all operator screens.
             </p>
          </div>

          {/* SYSTEM STATUS */}
          <div className="glass-card p-6 rounded-xl">
             <h3 className="text-md font-semibold mb-4">System Status</h3>
             <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-border/50 pb-2">
                   <span className="text-muted-foreground">Connection</span>
                   <span className="text-success font-mono">ONLINE (MQTT)</span>
                </div>
                <div className="flex justify-between pt-1">
                   <span className="text-muted-foreground">Active Direction</span>
                   <span className={cn("font-mono font-bold", direction === "FWD" ? "text-success" : "text-warning")}>
                     {direction}
                   </span>
                </div>
                <div className="flex justify-between pt-1">
                   <span className="text-muted-foreground">Active PID</span>
                   <span className="text-foreground font-mono text-xs">
                     {pid.kp} / {pid.ki} / {pid.kd}
                   </span>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Controller;