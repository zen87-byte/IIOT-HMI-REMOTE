import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import mqtt from 'mqtt';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: "*", 
    methods: ["GET", "POST"]
}));

app.use(express.json());

// --- Database Setup ---
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
        temperature NUMERIC,
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

// --- Authentication Endpoints ---

// Login Endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log(`Login attempt: ${username}`);

  // Hardcoded user for demo purposes
  if (username === 'operator' && password === 'operator123') {
    return res.json({
      success: true,
      user: {
        id: 1,
        username: 'operator',
        role: 'operator',
        name: 'Operator Produksi'
      },
      token: 'dummy-token-12345'
    });
  }
  
  res.status(401).json({ error: "Invalid username or password" });
});

// Check User Endpoint
app.get('/api/auth/me', (req, res) => {
  // Mock response to maintain session state on frontend
  res.json({
      id: 1,
      username: 'operator',
      role: 'operator',
      name: 'Operator Produksi'
  });
});

// --- MQTT & Business Logic ---

const mqttClient = mqtt.connect(process.env.MQTT_URL || 'mqtt://localhost:1883');

mqttClient.on('connect', () => {
  console.log("MQTT Connected");
  mqttClient.subscribe('motor/data');
});

mqttClient.on('message', async (topic, message) => {
  if (topic === 'motor/data') {
    try {
      const msg = JSON.parse(message.toString());

      const rpm = Number(msg.rpm) || 0;
      const voltage = Number(msg.voltage) || 0;
      const current = Number(msg.current) || 0;
      const temperature = Number(msg.temperature) || 0;

      // Save data
      await pool.query(
        `INSERT INTO motor_data (rpm, voltage, current, temperature, timestamp) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [rpm, voltage, current, temperature]
      );

      // Alarm Logic
      const detectAlarms = async () => {
        const insertAlarm = async (level: string, msg: string) => {
          const check = await pool.query(
            `SELECT id FROM alarm_logs 
             WHERE message = $1 AND timestamp > NOW() - INTERVAL '10 seconds'`,
            [msg]
          );

          if (check.rows.length === 0) {
            console.log(`ALARM [${level}]: ${msg}`);
            await pool.query(
              `INSERT INTO alarm_logs (level, message, status, timestamp) 
               VALUES ($1, $2, 'ACTIVE', NOW())`,
              [level, msg]
            );
          }
        };

        if (current > 15 && current <= 20) await insertAlarm('warning', 'High Current Warning');
        if (current > 20) await insertAlarm('critical', 'Critical Overcurrent');
        if (voltage > 240) await insertAlarm('critical', 'Overvoltage');
        if (voltage < 180) await insertAlarm('warning', 'Undervoltage');
        if (rpm > 1800) await insertAlarm('warning', 'Overspeed Warning');
      };

      await detectAlarms();

    } catch (err) {
      console.error("MQTT Error:", err);
    }
  }
});

// --- Control API ---
app.post('/api/control', (req, res) => {
  console.log("📡 Control Request:", req.body);
  const { action, value, kp, ki, kd } = req.body;
  
  if (!action) return res.status(400).json({ error: "Missing action" });

  let payload = {};
  switch (action) {
    case 'START':
    case 'STOP':
      payload = { command: action, timestamp: new Date() };
      break;
    
    case 'SET_DIR':
      payload = { command: "SET_DIR", value: value, timestamp: new Date() };
      break;
    
    case 'SET_PID':
      payload = { command: "SET_PID", kp: Number(kp), ki: Number(ki), kd: Number(kd), timestamp: new Date() };
      break;

    // --- TAMBAHAN BARU UNTUK UNIT ---
    case 'SET_SPEED_UNIT':
      // value: "rpm" | "hz" | "rad/s"
      payload = { command: "SET_SPEED_UNIT", value: value, timestamp: new Date() };
      break;

    case 'SET_POWER_UNIT':
      // value: "watt" | "kw" | "hp"
      payload = { command: "SET_POWER_UNIT", value: value, timestamp: new Date() };
      break;

    default:
      return res.status(400).json({ error: "Unknown action" });
  }

  mqttClient.publish('motor/control', JSON.stringify(payload), { qos: 1 });
  res.json({ success: true, message: `Executed ${action}` });
});
// --- Data API ---

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

app.get('/api/alarms', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM alarm_logs ORDER BY timestamp DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: "Database Error" });
  }
});

// --- Server Start ---

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server Ready.`);
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Network: http://0.0.0.0:${PORT}`);
});