import { useState } from "react"; // useState tetap butuh untuk 'loading' status UI
import MotorToggle from "@/components/MotorToggle";
import UnitSelector from "@/components/UnitSelector";
import { useMotorContext } from "@/contexts/MotorContext";
import { useUnitConversion } from "@/hooks/useUnitConversion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RotateCw, RotateCcw, Save, Sliders } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Controller = () => {
  // 1. Ambil PID dan Direction dari Context (Global)
  const { 
    isMotorOn, 
    handleMotorToggle, 
    pid,       // Ambil nilai global
    setPid,    // Ambil fungsi update global
    direction, // Ambil nilai global
    setDirection // Ambil fungsi update global
  } = useMotorContext();

  const { user } = useAuth();
  const { speedUnit, setSpeedUnit, powerUnit, setPowerUnit } = useUnitConversion();
  
  const isOperator = user?.role === "operator";

  // State lokal HANYA untuk loading UI spinner
  const [loading, setLoading] = useState(false);

  // Local state temporary untuk input PID agar tidak re-render setiap ketik
  // Kita sync dengan global state pid saat pertama render
  const [localPid, setLocalPid] = useState(pid);

  const sendCommand = async (type: "SET_PID" | "SET_DIR", payload: any) => {
    if (!isOperator) {
      toast.error("Access Denied", { description: "Operator role required." });
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Sending config to HMI...");

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
      
      const response = await fetch(`${apiUrl}/api/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: type, 
          ...payload 
        }),
      });

      if (!response.ok) throw new Error("Failed to send command");

      toast.success("Configuration Updated", { id: toastId });
      
      // Update GLOBAL Context agar tersimpan
      if (type === "SET_DIR") {
        setDirection(payload.value);
      } else if (type === "SET_PID") {
        setPid({ kp: payload.kp, ki: payload.ki, kd: payload.kd });
      }

    } catch (error) {
      console.error(error);
      toast.error("Connection Failed", { id: toastId });
    } finally {
      setLoading(false);
    }
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

          <div className="glass-card p-6 rounded-xl">
             <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
               <RotateCw className="w-5 h-5 text-primary"/> Motor Direction
             </h3>
             <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant={direction === "FWD" ? "default" : "outline"}
                  className={cn("h-12 text-md", direction === "FWD" && "bg-success hover:bg-success/80 text-white")}
                  onClick={() => sendCommand("SET_DIR", { value: "FWD" })}
                  disabled={!isOperator || loading}
                >
                  <RotateCw className="mr-2 w-5 h-5" /> FORWARD
                </Button>

                <Button 
                  variant={direction === "REV" ? "default" : "outline"}
                  className={cn("h-12 text-md", direction === "REV" && "bg-warning hover:bg-warning/80 text-black")}
                  onClick={() => sendCommand("SET_DIR", { value: "REV" })}
                  disabled={!isOperator || loading}
                >
                  <RotateCcw className="mr-2 w-5 h-5" /> REVERSE
                </Button>
             </div>
          </div>
        </div>

        {/* KOLOM KANAN: CONFIGURATION */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-semibold flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary"/> PID Parameters
              </h3>
              <Button 
                size="sm" 
                // Kirim nilai dari local input state
                onClick={() => sendCommand("SET_PID", localPid)} 
                disabled={!isOperator || loading}
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
          </div>

          <div className="glass-card p-6 rounded-xl">
             <h3 className="text-md font-semibold mb-4">Display Units</h3>
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase text-muted-foreground">Speed</label>
                  <UnitSelector type="speed" value={speedUnit} onChange={setSpeedUnit} />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase text-muted-foreground">Power</label>
                  <UnitSelector type="power" value={powerUnit} onChange={setPowerUnit} />
                </div>
             </div>
          </div>

          <div className="glass-card p-6 rounded-xl">
             <h3 className="text-md font-semibold mb-4">System Status</h3>
             <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-border/50 pb-2">
                   <span className="text-muted-foreground">Connection</span>
                   <span className="text-success font-mono">ONLINE (MQTT)</span>
                </div>
                <div className="flex justify-between pt-1">
                   <span className="text-muted-foreground">Direction</span>
                   <span className={cn("font-mono font-bold", direction === "FWD" ? "text-success" : "text-warning")}>
                     {direction}
                   </span>
                </div>
                {/* Menampilkan nilai PID yang tersimpan di Context (Global) */}
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