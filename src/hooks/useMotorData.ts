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

  // Ref untuk menyimpan koneksi MQTT
  const mqttClientRef = useRef<mqtt.MqttClient | null>(null);

  // Helper 1: Format Jam (HH:mm:ss)
  const formatTime = (dateInput: string | Date) => {
    const date = new Date(dateInput);
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  // Helper 2: Pembulatan 3 angka belakang koma (tetap jadi Number)
  const fix3 = (num: number) => Number(num.toFixed(3));

  useEffect(() => {
    // ============================================
    // MODE LIVE: KONEK VIA MQTT WEBSOCKET
    // ============================================
    if (timeRange === "live") {
      
      // [PENTING] Syntax Vite untuk ambil variabel .env
      const wsUrl = import.meta.env.VITE_MQTT_WS_URL; 
      
      if (!wsUrl) {
        console.error("VITE_MQTT_WS_URL not found in .env");
        return;
      }

      // Reset history saat masuk mode live
      setData(prev => ({
        ...prev,
        voltageHistory: [], currentHistory: [], rpmHistory: [], powerHistory: []
      }));

      console.log("Connecting to MQTT WS:", wsUrl);
      
      const client = mqtt.connect(wsUrl, {
        keepalive: 60,
        clientId: 'hmi_client_' + Math.random().toString(16).substr(2, 8),
        clean: true,
        reconnectPeriod: 2000,
      });

      mqttClientRef.current = client;

      client.on("connect", () => {
        console.log("✅ MQTT WebSocket Connected!");
        client.subscribe("motor/data");
      });

      client.on("error", (err) => {
        console.error("❌ MQTT Connection Error:", err);
      });

      client.on("message", (topic, message) => {
        if (!isMotorOn) return; 

        try {
          const payload = JSON.parse(message.toString());
          const nowStr = formatTime(new Date());
          
          // Hitung Power Raw
          const rawPower = Number(payload.voltage) * Number(payload.current) * powerFactor;

          // Siapkan data yang sudah dibulatkan
          const v = fix3(Number(payload.voltage));
          const c = fix3(Number(payload.current));
          const r = Math.round(Number(payload.rpm)); // RPM bulat integer
          const p = fix3(rawPower);

          setData((prev) => {
            // Helper push data (Max 30 items sliding window)
            const pushData = (arr: DataPoint[], val: number) => {
               const newArr = [...arr, { time: nowStr, value: val }];
               return newArr.length > 30 ? newArr.slice(1) : newArr;
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
          console.error("Error parsing MQTT msg:", err);
        }
      });
    } 
    
    // ============================================
    // MODE HISTORY: FETCH DATABASE API
    // ============================================
    else {
      // Matikan MQTT jika sebelumnya nyala
      if (mqttClientRef.current) {
        console.log("Stopping MQTT for History Mode...");
        mqttClientRef.current.end();
        mqttClientRef.current = null;
      }

      const fetchHistory = async () => {
        try {
          // Fetch ke API (pastikan proxy di vite.config.ts sudah benar)
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
            const rawPower = Number(row.voltage) * Number(row.current) * powerFactor;
            
            // Bulatkan data history juga
            const v = fix3(Number(row.voltage));
            const c = fix3(Number(row.current));
            const r = Math.round(Number(row.rpm));
            const p = fix3(rawPower);

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
          console.error("Failed to fetch history:", err);
        }
      };

      fetchHistory();
    }

    // Cleanup saat unmount atau ganti mode
    return () => {
      if (mqttClientRef.current) {
        mqttClientRef.current.end();
        mqttClientRef.current = null;
      }
    };
  }, [timeRange, isMotorOn, powerFactor]);

  return data;
};

export default useMotorData;