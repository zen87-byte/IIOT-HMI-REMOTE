import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import mqtt from 'mqtt';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

const mqttClient = mqtt.connect(process.env.MQTT_URL || 'mqtt://localhost:1883');

mqttClient.on('connect', () => {
  console.log("✅ MQTT Connected & Subscribing...");
  mqttClient.subscribe('motor/data');
});

mqttClient.on('message', async (topic, message) => {
  try {
    const msg = JSON.parse(message.toString());
    const { rpm, voltage, current, temperature } = msg;
    
    await pool.query(
      `INSERT INTO motor_data (rpm, voltage, current, temperature, timestamp) 
       VALUES ($1, $2, $3, $4, NOW())`,
      [rpm, voltage, current, temperature]
    );
  } catch (err) {
    console.error("MQTT Save Error:", err);
  }
});

app.get('/api/motor', async (req, res) => {
  try {
    const { range } = req.query;
    let timeQuery = "INTERVAL '1 hour'";

    if (range === '6h') timeQuery = "INTERVAL '6 hours'";
    if (range === '24h') timeQuery = "INTERVAL '24 hours'";
    if (range === '7d') timeQuery = "INTERVAL '7 days'";
    if (range === '30d') timeQuery = "INTERVAL '30 days'";

    const result = await pool.query(
      `SELECT * FROM motor_data 
       WHERE timestamp > NOW() - ${timeQuery} 
       ORDER BY timestamp ASC`
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Jalankan Server
app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});