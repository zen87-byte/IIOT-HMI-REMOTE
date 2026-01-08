import { useState, useEffect } from "react";
import MotorToggle from "@/components/MotorToggle";
import UnitSelector from "@/components/UnitSelector";
import { useMotorContext } from "@/contexts/MotorContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  RotateCw, 
  RotateCcw, 
  Save, 
  Sliders, 
  Settings2, 
  Gauge, 
  Power, 
  PlayCircle, 
  StopCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

const Controller = () => {
  const { 
    isMotorOn, handleMotorToggle, 
    pid, setPid,    
    direction, setDirection,
    speedUnit, setSpeedUnit,
    powerUnit, setPowerUnit,
    controlMode, setControlMode,
    speedSetpoint, setSpeedSetpoint
  } = useMotorContext();

  const { user } = useAuth();
  const isOperator = user?.role === "operator";

  // Local state agar input tidak lag
  const [localPid, setLocalPid] = useState(pid);
  const [localSP, setLocalSP] = useState(speedSetpoint);

  useEffect(() => { setLocalPid(pid); }, [pid]);
  useEffect(() => { setLocalSP(speedSetpoint); }, [speedSetpoint]);

  const handleApplyPid = () => {
    if (isOperator) setPid(localPid);
  };

  const handleApplySetpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOperator) setSpeedSetpoint(localSP);
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-500 pb-20">
      
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight">System Control Center</h2>
        <p className="text-muted-foreground mt-2">Manage motor operation modes and system parameters</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SEKSI 1: MASTER & SAFETY */}
        <div className="space-y-6">
          <div className="glass-card p-8 rounded-2xl border-t-4 border-t-primary flex flex-col items-center justify-center min-h-[300px] shadow-lg">
            <div className="bg-primary/10 p-4 rounded-full mb-6">
              <Power className={cn("w-8 h-8 transition-colors", isMotorOn ? "text-success" : "text-muted-foreground")} />
            </div>
            <h3 className="text-xl font-bold mb-2">Master Enable</h3>
            <p className="text-xs text-muted-foreground mb-8 text-center px-4">
              Turn on to unlock motor mode controls and speed references.
            </p>
            
            <MotorToggle 
              isOn={isMotorOn} 
              onToggle={handleMotorToggle} 
              disabled={!isOperator} 
            />
            
            <div className={cn(
              "mt-8 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border",
              isMotorOn ? "bg-success/10 border-success/50 text-success animate-pulse" : "bg-muted border-border text-muted-foreground"
            )}>
              {isMotorOn ? "System Ready" : "System Locked"}
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl">
             <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
               <RotateCw className="w-5 h-5 text-primary"/> Rotation
             </h3>
             <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant={direction === "FWD" ? "default" : "outline"}
                  className={cn("h-12", direction === "FWD" && "bg-success hover:bg-success/80")}
                  onClick={() => setDirection("FWD")}
                  disabled={!isOperator || !isMotorOn} 
                >
                  FORWARD
                </Button>
                <Button 
                  variant={direction === "REV" ? "default" : "outline"}
                  className={cn("h-12", direction === "REV" && "bg-warning hover:bg-warning/80 text-black")}
                  onClick={() => setDirection("REV")}
                  disabled={!isOperator || !isMotorOn} 
                >
                  REVERSE
                </Button>
             </div>
          </div>
        </div>

        {/* SEKSI 2: MOTOR OPERATION CONTROL */}
        <div className="space-y-6">
          <div className={cn(
            "glass-card p-8 rounded-2xl shadow-lg border-t-4 transition-all duration-500",
            isMotorOn ? "border-t-success opacity-100" : "border-t-muted opacity-50 pointer-events-none grayscale"
          )}>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary"/> Motor Mode Control
            </h3>
            
            <div className="flex flex-col gap-4">
              {/* Tombol AUTO */}
              <Button 
                size="lg"
                variant={controlMode === "AUTO" ? "default" : "outline"}
                className={cn("h-16 text-lg font-black tracking-widest border-2", 
                  controlMode === "AUTO" ? "bg-blue-600 hover:bg-blue-700 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "border-dashed"
                )}
                onClick={() => setControlMode("AUTO")}
              >
                <PlayCircle className="mr-3 w-6 h-6" /> RUN AUTO
              </Button>

              {/* Tombol MANUAL */}
              <Button 
                size="lg"
                variant={controlMode === "MANUAL" ? "default" : "outline"}
                className={cn("h-16 text-lg font-black tracking-widest border-2", 
                  controlMode === "MANUAL" ? "bg-orange-600 hover:bg-orange-700 border-orange-400 shadow-[0_0_15px_rgba(234,88,12,0.4)]" : "border-dashed"
                )}
                onClick={() => setControlMode("MANUAL")}
              >
                <Settings2 className="mr-3 w-6 h-6" /> RUN MANUAL
              </Button>

              {/* Tombol STOP/OFF */}
              <Button 
                size="lg"
                variant="destructive"
                className="h-16 text-lg font-black tracking-widest shadow-lg active:scale-95 transition-transform"
                onClick={() => handleMotorToggle(false)}
              >
                <StopCircle className="mr-3 w-6 h-6" /> TURN OFF
              </Button>
            </div>

            {/* SPEED SETPOINT - Only for Manual */}
            <div className={cn(
              "mt-10 p-5 rounded-xl bg-secondary/30 border border-border transition-all duration-300",
              controlMode === "AUTO" ? "opacity-20 blur-[1px]" : "opacity-100"
            )}>
              <label className="text-[10px] font-bold uppercase text-muted-foreground mb-3 block tracking-tighter">
                Speed Reference ({speedUnit})
              </label>
              <form onSubmit={handleApplySetpoint} className="flex gap-2">
                <div className="relative flex-1">
                  <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <Input 
                    type="number"
                    value={localSP}
                    onChange={(e) => setLocalSP(parseFloat(e.target.value))}
                    className="pl-10 font-mono text-xl h-12 bg-background/50"
                    placeholder="0.0"
                  />
                </div>
                <Button type="submit" className="h-12 px-6 font-bold">SET</Button>
              </form>
            </div>
          </div>
        </div>

        {/* SEKSI 3: PARAMETERS & UNITS */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-md font-semibold flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary"/> PID Tuning
              </h3>
              <Button size="sm" onClick={handleApplyPid} disabled={!isOperator} className="h-8">
                <Save className="w-3 h-3 mr-2" /> Apply
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {['kp', 'ki', 'kd'].map((param) => (
                <div key={param} className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground text-center block">{param}</label>
                  <Input 
                    type="number" step="0.01"
                    value={(localPid as any)[param]}
                    onChange={(e) => setLocalPid({...localPid, [param]: parseFloat(e.target.value)})}
                    disabled={!isOperator}
                    className="font-mono text-center h-10 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl">
             <h3 className="text-md font-semibold mb-6">Display Scaling</h3>
             <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Speed Unit</span>
                  <UnitSelector type="speed" value={speedUnit} onChange={setSpeedUnit} disabled={!isOperator} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Power Unit</span>
                  <UnitSelector type="power" value={powerUnit} onChange={setPowerUnit} disabled={!isOperator} />
                </div>
             </div>
          </div>

          <div className="p-6 bg-primary/5 rounded-2xl border border-primary/20">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-success animate-ping" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Live Status</h3>
             </div>
             <div className="space-y-3 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Mode:</span>
                  <span className="font-bold text-foreground">{controlMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ref. Speed:</span>
                  <span className="font-bold text-foreground">{speedSetpoint} {speedUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VSD Comms:</span>
                  <span className="text-success">CONNECTED</span>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Controller;