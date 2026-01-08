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
    // Tabel Motor Data (Sekarang dengan kolom power)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS motor_data (
        id SERIAL PRIMARY KEY,
        rpm NUMERIC,
        voltage NUMERIC,
        current NUMERIC,
        power NUMERIC,
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
    console.log("Database tables ready with Power column");
  } catch (err) {
    console.error("Init DB Error:", err);
  }
};
initDB();

// --- Authentication Endpoints ---

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'operator' && password === 'operator123') {
    return res.json({
      success: true,
      user: { id: 1, username: 'operator', role: 'operator', name: 'Operator Produksi' },
      token: 'dummy-token-12345'
    });
  }
  res.status(401).json({ error: "Invalid username or password" });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ id: 1, username: 'operator', role: 'operator', name: 'Operator Produksi' });
});

// ==========================================
// 📡 MQTT LOGIC (MULTI-TOPIC)
// ==========================================

// Variabel penampung snapshot terakhir
let currentStats = {
  rpm: 0,
  voltage: 0,
  current: 0,
  power: 0,
  temperature: 0
};

const mqttClient = mqtt.connect(process.env.MQTT_URL || 'mqtt://localhost:1883');

mqttClient.on('connect', () => {
  console.log("✅ MQTT Connected to Broker");
  // Subscribe ke 4 topik spesifik
  mqttClient.subscribe(['pm/tegangan', 'pm/arus', 'vsd/actualspeed', 'pm/power']);
});

mqttClient.on('message', async (topic, message) => {
  try {
    const rawData = JSON.parse(message.toString());
    
    // Helper untuk handle format array dari EasyBuilder [value]
    const parseValue = (val: any) => (Array.isArray(val) ? val[0] : (val || 0));

    // Mapping data ke variabel snapshot berdasarkan topik
    if (topic === 'pm/tegangan') {
      currentStats.voltage = parseValue(rawData.tegangan);
    } 
    else if (topic === 'pm/arus') {
      currentStats.current = parseValue(rawData.arus);
    } 
    else if (topic === 'vsd/actualspeed') {
      currentStats.rpm = parseValue(rawData.rpm);
    } 
    else if (topic === 'pm/power') {
      currentStats.power = parseValue(rawData.power)*1000;
    }

    // Log untuk monitoring terminal
    console.log(`Update [${topic}]:`, currentStats);

    // Simpan Snapshot ke Database
    await pool.query(
      `INSERT INTO motor_data (rpm, voltage, current, power, temperature, timestamp) 
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [currentStats.rpm, currentStats.voltage, currentStats.current, currentStats.power, currentStats.temperature]
    );

    // Jalankan Deteksi Alarm
    detectAlarms(currentStats);

  } catch (err) {
    console.error("MQTT Processing Error:", err);
  }
});

// --- Alarm Logic ---
const detectAlarms = async (data: any) => {
  const insertAlarm = async (level: string, msg: string) => {
    const check = await pool.query(
      `SELECT id FROM alarm_logs 
       WHERE message = $1 AND timestamp > NOW() - INTERVAL '10 seconds'`,
      [msg]
    );

    if (check.rows.length === 0) {
      console.log(`⚠️ ALARM: [${level}] ${msg}`);
      await pool.query(
        `INSERT INTO alarm_logs (level, message, status, timestamp) 
         VALUES ($1, $2, 'ACTIVE', NOW())`,
        [level, msg]
      );
    }
  };

  if (data.current > 15 && data.current <= 20) await insertAlarm('warning', 'High Current Warning');
  if (data.current > 20) await insertAlarm('critical', 'Critical Overcurrent');
  if (data.voltage > 240) await insertAlarm('critical', 'Overvoltage');
  if (data.voltage < 180) await insertAlarm('warning', 'Undervoltage');
  if (data.rpm > 1800) await insertAlarm('warning', 'Overspeed Warning');
};

// ==========================================
// 🎮 API ENDPOINTS
// ==========================================

app.post('/api/control', (req, res) => {
  const { action, value, kp, ki, kd } = req.body;
  if (!action) return res.status(400).json({ error: "Missing action" });

  let payload = { command: action, value, kp, ki, kd, timestamp: new Date() };
  
  mqttClient.publish('motor/control', JSON.stringify(payload), { qos: 1 });
  console.log("📡 Control Published:", action);
  res.json({ success: true, message: `Executed ${action}` });
});

app.get('/api/motor', async (req, res) => {
  try {
    const { range } = req.query;
    let timeInterval = "INTERVAL '1 hour'";
    
    if (range === '30m') timeInterval = "INTERVAL '30 minutes'";
    else if (range === '6h') timeInterval = "INTERVAL '6 hours'";
    else if (range === '24h') timeInterval = "INTERVAL '24 hours'";
    
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
    const result = await pool.query(`SELECT * FROM alarm_logs ORDER BY timestamp DESC LIMIT 50`);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: "Database Error" });
  }
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server Ready on Network Port ${PORT}`);
});