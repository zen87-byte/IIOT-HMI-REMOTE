import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import mqtt from 'mqtt';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Database
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

const initDB = async () => {
  try {
    // Tabel Data Motor
    await pool.query(`
      CREATE TABLE IF NOT EXISTS motor_data (
        id SERIAL PRIMARY KEY,
        rpm NUMERIC,
        voltage NUMERIC,
        current NUMERIC,
        temperature NUMERIC,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabel Alarm Logs
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
    console.log("Database Tables Ready");
  } catch (err) {
    console.error("Init DB Error:", err);
  }
};
initDB();

// MQTT Setup
const mqttClient = mqtt.connect(process.env.MQTT_URL || 'mqtt://localhost:1883');

mqttClient.on('connect', () => {
  console.log("MQTT Connected");
  mqttClient.subscribe('motor/data');
});

// --- LISTENER UTAMA ---
mqttClient.on('message', async (topic, message) => {
  if (topic === 'motor/data') {
    try {
      const msg = JSON.parse(message.toString());

      const rpm = Number(msg.rpm) || 0;
      const voltage = Number(msg.voltage) || 0;
      const current = Number(msg.current) || 0;
      const temperature = Number(msg.temperature) || 0;

      // 1. Simpan Data Periodik
      await pool.query(
        `INSERT INTO motor_data (rpm, voltage, current, temperature, timestamp) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [rpm, voltage, current, temperature]
      );
      // 2. LOGIC ALARM
      const detectAlarms = async () => {
        const insertAlarm = async (level: string, msg: string) => {
          const check = await pool.query(
            `SELECT id FROM alarm_logs 
             WHERE message = $1 AND timestamp > NOW() - INTERVAL '10 seconds'`,
            [msg]
          );

          if (check.rows.length === 0) {
            console.log(`ALARM DETECTED: [${level}] ${msg}`);
            await pool.query(
              `INSERT INTO alarm_logs (level, message, status, timestamp) 
               VALUES ($1, $2, 'ACTIVE', NOW())`,
              [level, msg]
            );
          }
        };

        // --- RULE ARUS (CURRENT) ---
        // Warning: 15 < Arus <= 20
        if (current > 15 && current <= 20) {
          await insertAlarm('warning', 'High Current Warning');
        }
        // Critical: Arus > 20
        if (current > 20) {
          await insertAlarm('critical', 'Critical Overcurrent');
        }

        // --- RULE TEGANGAN (VOLTAGE) ---
        if (voltage > 240) await insertAlarm('critical', 'Overvoltage');
        if (voltage < 180) await insertAlarm('warning', 'Undervoltage');

        // --- RULE SPEED ---
        if (rpm > 1800) await insertAlarm('warning', 'Overspeed Warning');
      };

      await detectAlarms();

    } catch (err) {
      console.error("Error Processing MQTT Message:", err);
    }
  }
});

// --- API ENDPOINTS ---
// API: Control Endpoint (Web -> Backend -> MQTT -> HMI)
app.post('/api/control', (req, res) => {
  console.log("📡 Control Request:", req.body);
  
  const { action, value, kp, ki, kd } = req.body;
  
  if (!action) return res.status(400).json({ error: "Missing action" });

  let payload = {};

  // Construct Payload berdasarkan Action
  switch (action) {
    case 'START':
    case 'STOP':
      // Payload: { "command": "START" }
      payload = { 
        command: action, 
        timestamp: new Date() 
      };
      break;

    case 'SET_DIR':
      // Payload: { "command": "SET_DIR", "value": "FWD" }
      if (!value) return res.status(400).json({ error: "Missing value for direction" });
      payload = { 
        command: "SET_DIR", 
        value: value, 
        timestamp: new Date() 
      };
      break;

    case 'SET_PID':
      // Payload: { "command": "SET_PID", "kp": 1.5, "ki": 0.5, "kd": 0.1 }
      payload = { 
        command: "SET_PID", 
        kp: Number(kp), 
        ki: Number(ki), 
        kd: Number(kd),
        timestamp: new Date() 
      };
      break;

    default:
      return res.status(400).json({ error: "Unknown action" });
  }

  // Publish ke MQTT
  const mqttPayload = JSON.stringify(payload);
  
  mqttClient.publish('motor/control', mqttPayload, { qos: 1 }, (err) => {
    if (err) {
      console.error("MQTT Publish Failed:", err);
      return res.status(500).json({ error: "MQTT Fail" });
    }
    console.log("Published to 'motor/control':", mqttPayload);
    res.json({ success: true, message: `Executed ${action}` });
  });
});

app.get('/api/motor', async (req, res) => {
  try {
    const { range } = req.query;
    let timeInterval = "INTERVAL '1 hour'";
    if (range === '30m') timeInterval = "INTERVAL '30 minutes'";
    else if (range === '6h') timeInterval = "INTERVAL '6 hours'";
    else if (range === '24h') timeInterval = "INTERVAL '24 hours'";
    else if (range === '7d') timeInterval = "INTERVAL '7 days'";
    else if (range === '30d') timeInterval = "INTERVAL '30 days'";
    
    const result = await pool.query(
      `SELECT * FROM motor_data WHERE timestamp > NOW() - ${timeInterval} ORDER BY timestamp ASC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint Alarm
app.get('/api/alarms', async (req, res) => {
  try {
    console.log("Fetching Alarms..."); 
    const result = await pool.query(
      `SELECT * FROM alarm_logs ORDER BY timestamp DESC LIMIT 50`
    );
    console.log(`Sending ${result.rows.length} alarms`);
    res.json(result.rows);
  } catch (err: any) {
    console.error("API Alarm Error:", err);
    res.status(500).json({ error: "Db Error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});