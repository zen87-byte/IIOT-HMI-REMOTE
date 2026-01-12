import express from "express";
import cors from "cors";
import { Pool } from "pg";
import mqtt from "mqtt";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MQTT_BROKER = process.env.MQTT_URL || "mqtt://localhost:1883";

app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json());

// --- Database Connection ---
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS motor_data (
        id SERIAL PRIMARY KEY,
        rpm NUMERIC,
        voltage NUMERIC,
        current NUMERIC,
        power NUMERIC,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS alarm_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT NOW(),
        level VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        source VARCHAR(50) DEFAULT 'SYSTEM'
      );
    `);
    console.log("Database tables ready");
  } catch (err) {
    console.error("Init DB Error:", err);
  }
};
initDB();

// --- In-Memory State (Read Only) ---
// Digunakan untuk endpoint /state agar frontend mendapat status terakhir saat refresh
let monitoredState = {
  status: "OFF", 
  direction: "FWD"
};

let sensorSnapshot = {
  rpm: 0,
  voltage: 0,
  current: 0,
  power: 0
};

// --- MQTT Setup ---
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on("connect", () => {
  console.log("Connected to MQTT Broker");
  mqttClient.subscribe([
    "pm/tegangan", 
    "pm/arus", 
    "vsd/actualspeed", 
    "pm/power",
    "vsd/mode/status", 
    "motor/stats"
  ]);
});

mqttClient.on("message", async (topic, message) => {
  try {
    const rawData = JSON.parse(message.toString());
    const parseVal = (val: any) => (Array.isArray(val) ? val[0] : val || 0);

    // 1. Handle Sensor Data
    if (topic.startsWith("pm/") || topic === "vsd/actualspeed") {
      if (topic === "pm/tegangan") sensorSnapshot.voltage = Number(parseVal(rawData.tegangan));
      if (topic === "pm/arus") sensorSnapshot.current = Number(parseVal(rawData.arus));
      if (topic === "vsd/actualspeed") sensorSnapshot.rpm = Number(parseVal(rawData.actualspeed));
      if (topic === "pm/power") sensorSnapshot.power = Number(parseVal(rawData.power)) * 1000;

      await pool.query(
        `INSERT INTO motor_data (rpm, voltage, current, power, timestamp) VALUES ($1, $2, $3, $4, NOW())`,
        [sensorSnapshot.rpm, sensorSnapshot.voltage, sensorSnapshot.current, sensorSnapshot.power]
      );

      detectAlarms(sensorSnapshot);
    }

    // 2. Handle Machine Status (Feedback only)
    if (topic === "vsd/mode/status") {
      if (rawData.mode === 1) monitoredState.status = "AUTO";
      else if (rawData.mode === 2) monitoredState.status = "MANUAL";
      else if (rawData.off === 1) monitoredState.status = "OFF";
    }
    
    if (topic === "motor/stats" && rawData.direction !== undefined) {
      monitoredState.direction = rawData.direction === 1 ? "FWD" : "REV";
    }

  } catch (err) {
    console.error(`MQTT Processing Error [${topic}]:`, err);
  }
});

const detectAlarms = async (data: any) => {
  const insertAlarm = async (level: string, msg: string) => {
    // Debounce: Prevent duplicate alarms within 10 seconds
    const check = await pool.query(
      `SELECT id FROM alarm_logs WHERE message = $1 AND timestamp > NOW() - INTERVAL '10 seconds'`,
      [msg]
    );
    if (check.rows.length === 0) {
      await pool.query(
        `INSERT INTO alarm_logs (level, message, status, timestamp) VALUES ($1, $2, 'ACTIVE', NOW())`,
        [level, msg]
      );
    }
  };

  // Logic threshold sesuai dashboard
  if (data.voltage > 230) await insertAlarm("critical", `Overvoltage: ${data.voltage.toFixed(1)}V`);
  if (data.voltage < 210 && data.voltage > 10) await insertAlarm("critical", `Undervoltage: ${data.voltage.toFixed(1)}V`);
  
  if (data.current > 2.0) await insertAlarm("critical", `Overcurrent: ${data.current.toFixed(2)}A`);
  else if (data.current > 1.5) await insertAlarm("warning", `High Current: ${data.current.toFixed(2)}A`);

  if (data.rpm > 22) await insertAlarm("critical", `Overspeed Critical: ${data.rpm.toFixed(1)} RPM`);
  else if (data.rpm > 20) await insertAlarm("warning", `Overspeed Warning: ${data.rpm.toFixed(1)} RPM`);
};

// --- Endpoints ---

// Auth
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "operator" && password === "operator123") {
    return res.json({
      success: true,
      user: { id: 1, username: "operator", role: "operator", name: "Operator Produksi" },
      token: "session-token-123",
    });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

app.get("/api/auth/me", (req, res) => {
  res.json({ id: 1, username: "operator", role: "operator", name: "Operator Produksi" });
});

// State (Read Only) - Agar frontend tidak error saat fetch initial state
app.get("/api/control/state", (req, res) => {
  res.json(monitoredState);
});

// Data Logs
app.get("/api/motor", async (req, res) => {
  try {
    const { range } = req.query;

    let interval = "INTERVAL '1 hour'"; 

    switch (range) {
      case "30m": interval = "INTERVAL '30 minutes'"; break;
      case "1h":  interval = "INTERVAL '1 hour'"; break;
      case "6h":  interval = "INTERVAL '6 hours'"; break;
      case "12h": interval = "INTERVAL '12 hours'"; break;
      case "24h": interval = "INTERVAL '24 hours'"; break;
      case "7d":  interval = "INTERVAL '7 days'"; break;
      case "30d": interval = "INTERVAL '30 days'"; break;
      default:    interval = "INTERVAL '1 hour'"; break;
    }
    
    const result = await pool.query(
      `SELECT * FROM motor_data WHERE timestamp > NOW() - ${interval} ORDER BY timestamp ASC`
    );
    
    res.json(result.rows);
  } catch (err: any) {
    console.error("Fetch Data Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/alarms", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM alarm_logs ORDER BY timestamp DESC LIMIT 50`);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: "Database Error" });
  }
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});