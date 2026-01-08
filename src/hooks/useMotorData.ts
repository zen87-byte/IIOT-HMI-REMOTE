import { useState, useEffect, useRef } from "react";
import mqtt from "mqtt";
import { TimeRange } from "@/components/TimeRangeSelector";

interface DataPoint {
  time: string;
  value: number;
}

interface MotorData {
  voltage: number;
  current: number;
  rpm: number;
  power: number;
  voltageHistory: DataPoint[];
  currentHistory: DataPoint[];
  rpmHistory: DataPoint[];
  powerHistory: DataPoint[];
}

const useMotorData = (isMotorOn: boolean, timeRange: TimeRange, powerFactor = 0.85) => {
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

  const mqttClientRef = useRef<mqtt.MqttClient | null>(null);
  
  const isMotorOnRef = useRef(isMotorOn);
  
  useEffect(() => {
    isMotorOnRef.current = isMotorOn;
  }, [isMotorOn]);

  const formatTime = (dateInput: string | Date) => {
    const date = new Date(dateInput);
    if (timeRange === "live" || timeRange === "1h") {
      return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }
    if (timeRange === "6h" || timeRange === "24h") {
      return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const fix3 = (num: number) => Number(num.toFixed(3));

  useEffect(() => {
    // ============================================
    // MODE LIVE: HYBRID (API FETCH + MQTT)
    // ============================================
    if (timeRange === "live") {
      const wsUrl = import.meta.env.VITE_MQTT_WS_URL;
      
      if (!wsUrl) return;

      const fetchInitialLiveData = async () => {
        try {
          const res = await fetch(`/api/motor?range=1h`);
          const historyData = await res.json();
          
          if (Array.isArray(historyData) && historyData.length > 0) {
            const recentData = historyData.slice(-30);
            
            const vHist: DataPoint[] = [];
            const cHist: DataPoint[] = [];
            const rHist: DataPoint[] = [];
            const pHist: DataPoint[] = [];
            let lastVals = { v: 0, c: 0, r: 0, p: 0 };

            recentData.forEach((row: any) => {
              const t = formatTime(row.timestamp);
              const rawP = Number(row.voltage) * Number(row.current) * powerFactor;
              
              const v = fix3(Number(row.voltage));
              const c = fix3(Number(row.current));
              const r = Math.round(Number(row.rpm));
              const p = fix3(rawP);

              vHist.push({ time: t, value: v });
              cHist.push({ time: t, value: c });
              rHist.push({ time: t, value: r });
              pHist.push({ time: t, value: p });
              lastVals = { v, c, r, p };
            });

            setData({
              voltage: lastVals.v,
              current: lastVals.c,
              rpm: lastVals.r,
              power: lastVals.p,
              voltageHistory: vHist,
              currentHistory: cHist,
              rpmHistory: rHist,
              powerHistory: pHist,
            });
          }
        } catch (err) {
          console.error("Gagal pre-fill live data:", err);
        }
      };

      fetchInitialLiveData();

      console.log("Connecting to MQTT WS:", wsUrl);
      const client = mqtt.connect(wsUrl, {
        keepalive: 60,
        clientId: 'hmi_' + Math.random().toString(16).substr(2, 8),
        clean: true,
        reconnectPeriod: 2000,
      });

      mqttClientRef.current = client;

      client.on("connect", () => {
        console.log("✅ MQTT Connected");
        client.subscribe("motor/data");
      });

      client.on("message", (topic, message) => {
        if (!isMotorOnRef.current) return; 

        try {
          const payload = JSON.parse(message.toString());
          const nowStr = formatTime(new Date());
          const rawP = Number(payload.voltage) * Number(payload.current) * powerFactor;

          const v = fix3(Number(payload.voltage));
          const c = fix3(Number(payload.current));
          const r = Math.round(Number(payload.rpm));
          const p = fix3(rawP);

          setData((prev) => {
            const pushData = (arr: DataPoint[], val: number) => {
               const newArr = [...arr, { time: nowStr, value: val }];
               return newArr.length > 50 ? newArr.slice(1) : newArr;
            };

            return {
              voltage: v,
              current: c,
              rpm: r,
              power: p,
              voltageHistory: pushData(prev.voltageHistory, v),
              currentHistory: pushData(prev.currentHistory, c),
              rpmHistory: pushData(prev.rpmHistory, r),
              powerHistory: pushData(prev.powerHistory, p),
            };
          });
        } catch (err) {
          console.error("MQTT Parse Error:", err);
        }
      });
    } 
    
    // ============================================
    // MODE HISTORY
    // ============================================
    else {
      if (mqttClientRef.current) {
        mqttClientRef.current.end();
        mqttClientRef.current = null;
      }

      const fetchHistory = async () => {
        try {
          const res = await fetch(`/api/motor?range=${timeRange}`);
          const historyData = await res.json();
          
          if (!Array.isArray(historyData)) return;

          const vHist: DataPoint[] = [];
          const cHist: DataPoint[] = [];
          const rHist: DataPoint[] = [];
          const pHist: DataPoint[] = [];
          let lastVals = { v: 0, c: 0, r: 0, p: 0 };

          historyData.forEach((row: any) => {
            const t = formatTime(row.timestamp);
            const rawP = Number(row.voltage) * Number(row.current) * powerFactor;
            
            const v = fix3(Number(row.voltage));
            const c = fix3(Number(row.current));
            const r = Math.round(Number(row.rpm));
            const p = fix3(rawP);

            vHist.push({ time: t, value: v });
            cHist.push({ time: t, value: c });
            rHist.push({ time: t, value: r });
            pHist.push({ time: t, value: p });
            lastVals = { v, c, r, p };
          });

          setData({
            voltage: lastVals.v,
            current: lastVals.c,
            rpm: lastVals.r,
            power: lastVals.p,
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

    return () => {
      if (mqttClientRef.current) {
        mqttClientRef.current.end();
        mqttClientRef.current = null;
      }
    };
  // HAPUS isMotorOn dari dependency array, ganti logic pakai useRef
  }, [timeRange, powerFactor]); 

  return data;
};

export default useMotorData;