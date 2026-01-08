import { useState, useEffect, useRef } from "react";
import mqtt from "mqtt";
import { TimeRange } from "@/components/TimeRangeSelector";

interface DataPoint {
  time: string;
  value: number;
}

export interface MotorData {
  voltage: number;
  current: number;
  rpm: number;
  power: number;
  voltageHistory: DataPoint[];
  currentHistory: DataPoint[];
  rpmHistory: DataPoint[];
  powerHistory: DataPoint[];
}

const useMotorData = (isMotorOn: boolean, timeRange: TimeRange) => {
  const [data, setData] = useState<MotorData>({
    voltage: 0,
    current: 0,
    rpm: 0,
    power: 0,
    voltageHistory: [],
    currentHistory: [],
    rpmHistory: [],
    powerHistory: [],
  });

  // Buffer untuk menyimpan nilai terbaru dari tiap topik MQTT
  const latestValues = useRef({
    voltage: 0,
    current: 0,
    rpm: 0,
    power: 0,
  });

  // Ref untuk status motor agar bisa diakses di dalam listener MQTT
  const isMotorOnRef = useRef(isMotorOn);
  useEffect(() => {
    isMotorOnRef.current = isMotorOn;
  }, [isMotorOn]);

  const fix3 = (num: number) => Number(num.toFixed(3));

  useEffect(() => {
    // ============================================
    // MODE LIVE (MQTT WebSocket)
    // ============================================
    if (timeRange === "live") {
      const wsUrl = import.meta.env.VITE_MQTT_WS_URL;
      if (!wsUrl) return;

      const client = mqtt.connect(wsUrl, {
        clientId: "frontend_sync_" + Math.random().toString(16).substring(2, 8),
        clean: true,
        reconnectPeriod: 2000,
      });

      client.on("connect", () => {
        console.log("✅ MQTT Connected: Syncing 4 Topics");
        client.subscribe(["pm/tegangan", "pm/arus", "vsd/actualspeed", "pm/power"]);
      });

      client.on("message", (topic, message) => {
        // Jika motor mati di dashboard, kita abaikan pesan (opsional)
        if (!isMotorOnRef.current) return;

        try {
          const payload = JSON.parse(message.toString());
          
          // Helper untuk handle format array dari HMI [220.5]
          const parseVal = (val: any) => (Array.isArray(val) ? val[0] : val) || 0;

          // 1. Update Buffer (Ref tidak memicu re-render, jadi sangat ringan)
          if (topic === "pm/tegangan") latestValues.current.voltage = parseVal(payload.tegangan);
          if (topic === "pm/arus") latestValues.current.current = parseVal(payload.arus);
          if (topic === "vsd/actualspeed") latestValues.current.rpm = parseVal(payload.rpm);
          if (topic === "pm/power") {
          latestValues.current.power = parseVal(payload.power) * 1000;
        }

          // 2. Update state digital (StatusCard) segera agar responsif saat angka berubah
          setData((prev) => ({
            ...prev,
            voltage: latestValues.current.voltage,
            current: latestValues.current.current,
            rpm: latestValues.current.rpm,
            power: latestValues.current.power,
          }));
        } catch (err) {
          console.error("MQTT Parse Error:", err);
        }
      });

      // 3. SINKRONISASI GRAFIK (Snapshot per 1 detik)
      const syncInterval = setInterval(() => {
        const nowStr = new Date().toLocaleTimeString("id-ID", { 
          hour: "2-digit", minute: "2-digit", second: "2-digit" 
        });

        setData((prev) => ({
          ...prev,
          voltageHistory: [...prev.voltageHistory, { time: nowStr, value: latestValues.current.voltage }].slice(-30),
          currentHistory: [...prev.currentHistory, { time: nowStr, value: latestValues.current.current }].slice(-30),
          rpmHistory: [...prev.rpmHistory, { time: nowStr, value: latestValues.current.rpm }].slice(-30),
          powerHistory: [...prev.powerHistory, { time: nowStr, value: latestValues.current.power }].slice(-30),
        }));
      }, 1000);

      return () => {
        client.end();
        clearInterval(syncInterval);
      };
    } 
    
    // ============================================
    // MODE HISTORY (API Fetch)
    // ============================================
    else {
      const fetchHistory = async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/motor?range=${timeRange}`);
          const historyData = await res.json();
          
          if (!Array.isArray(historyData)) return;

          const vHist: DataPoint[] = [];
          const cHist: DataPoint[] = [];
          const rHist: DataPoint[] = [];
          const pHist: DataPoint[] = [];

          historyData.forEach((row: any) => {
            const t = new Date(row.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
            vHist.push({ time: t, value: fix3(Number(row.voltage)) });
            cHist.push({ time: t, value: fix3(Number(row.current)) });
            rHist.push({ time: t, value: Math.round(Number(row.rpm)) });
            pHist.push({ time: t, value: fix3(Number(row.power)) });
          });

          setData((prev) => ({
            ...prev,
            voltageHistory: vHist,
            currentHistory: cHist,
            rpmHistory: rHist,
            powerHistory: pHist,
            // Nilai terakhir untuk card
            voltage: vHist[vHist.length - 1]?.value || 0,
            current: cHist[cHist.length - 1]?.value || 0,
            rpm: rHist[rHist.length - 1]?.value || 0,
            power: pHist[pHist.length - 1]?.value || 0,
          }));
        } catch (err) {
          console.error("Fetch History Error:", err);
        }
      };
      fetchHistory();
    }
  }, [timeRange]);

  return data;
};

export default useMotorData;