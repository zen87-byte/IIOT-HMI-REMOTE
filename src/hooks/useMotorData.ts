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

const useMotorData = (timeRange: TimeRange) => {
  // Initial State Kosong
  const [data, setData] = useState<MotorData>({
    voltage: 0, current: 0, rpm: 0, power: 0,
    voltageHistory: [], currentHistory: [], rpmHistory: [], powerHistory: [],
  });

  const latestValues = useRef({ voltage: 0, current: 0, rpm: 0, power: 0 });
  const fix3 = (num: number) => Number((num || 0).toFixed(3));

  // Reset data saat timeRange berubah (Penting agar grafik tidak menumpuk)
  useEffect(() => {
    setData({
      voltage: 0, current: 0, rpm: 0, power: 0,
      voltageHistory: [], currentHistory: [], rpmHistory: [], powerHistory: [],
    });
  }, [timeRange]);

  useEffect(() => {
    // --- MODE LIVE ---
    if (timeRange === "live") {
      const wsUrl = import.meta.env.VITE_MQTT_WS_URL;
      if (!wsUrl) return;

      const client = mqtt.connect(wsUrl, {
        clientId: "frontend_sync_" + Math.random().toString(16).substring(2, 8),
        clean: true, reconnectPeriod: 2000,
      });

      client.on("connect", () => {
        client.subscribe(["pm/tegangan", "pm/arus", "vsd/actualspeed", "pm/power"]);
      });

      client.on("message", (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          const parseVal = (val: any) => (Array.isArray(val) ? val[0] : val) || 0;

          if (topic === "pm/tegangan") latestValues.current.voltage = parseVal(payload.tegangan);
          if (topic === "pm/arus") latestValues.current.current = parseVal(payload.arus);
          if (topic === "vsd/actualspeed") latestValues.current.rpm = parseVal(payload.actualspeed);
          if (topic === "pm/power") latestValues.current.power = parseVal(payload.power) * 1000;

          // Update angka digital instan
          setData((prev) => ({
            ...prev,
            voltage: latestValues.current.voltage,
            current: latestValues.current.current,
            rpm: latestValues.current.rpm,
            power: latestValues.current.power,
          }));
        } catch (err) { console.error(err); }
      });

      // Update Grafik Live per Detik
      const syncInterval = setInterval(() => {
        const nowStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setData((prev) => ({
          ...prev,
          voltageHistory: [...prev.voltageHistory, { time: nowStr, value: latestValues.current.voltage }].slice(-30),
          currentHistory: [...prev.currentHistory, { time: nowStr, value: latestValues.current.current }].slice(-30),
          rpmHistory: [...prev.rpmHistory, { time: nowStr, value: latestValues.current.rpm }].slice(-30),
          powerHistory: [...prev.powerHistory, { time: nowStr, value: latestValues.current.power }].slice(-30),
        }));
      }, 1000);

      return () => { client.end(); clearInterval(syncInterval); };
    } 
    
    // --- MODE HISTORY (API Fetch) ---
    else {
      const fetchHistory = async () => {
        try {
          // Panggil API dengan range yang dipilih
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/motor?range=${timeRange}`);
          const historyData = await res.json();
          
          if (!Array.isArray(historyData)) return;

          const vHist: DataPoint[] = [];
          const cHist: DataPoint[] = [];
          const rHist: DataPoint[] = [];
          const pHist: DataPoint[] = [];

          historyData.forEach((row: any) => {
            // Format jam sesuai locale ID
            const dateObj = new Date(row.timestamp);
            const t = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
            
            // Masukkan ke array
            vHist.push({ time: t, value: fix3(Number(row.voltage)) });
            cHist.push({ time: t, value: fix3(Number(row.current)) });
            rHist.push({ time: t, value: Math.round(Number(row.rpm)) });
            pHist.push({ time: t, value: fix3(Number(row.power)) });
          });

          // Set data sekaligus
          setData({
            voltage: vHist[vHist.length - 1]?.value || 0,
            current: cHist[cHist.length - 1]?.value || 0,
            rpm: rHist[rHist.length - 1]?.value || 0,
            power: pHist[pHist.length - 1]?.value || 0,
            voltageHistory: vHist,
            currentHistory: cHist,
            rpmHistory: rHist,
            powerHistory: pHist,
          });
        } catch (err) {
          console.error("Fetch History Error:", err);
        }
      };
      
      fetchHistory();
    }
  }, [timeRange]); // Re-run effect setiap timeRange berubah

  return data;
};

export default useMotorData;