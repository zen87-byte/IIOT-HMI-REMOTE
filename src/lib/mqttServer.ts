const mqtt = require("mqtt");
import pool from "./db";

export function startMqttServer() {
  const url = process.env.MQTT_URL;
  if (!url) throw new Error("MQTT_URL missing");
  
  const client = mqtt.connect(url);
  const TOPIC = "motor/data";

  client.on("connect", () => {
    console.log("[MQTT] Connected");
    client.subscribe(TOPIC);
  });

  client.on("message", async (topic: any, buffer:any) => {
    const msg = JSON.parse(buffer.toString());
    const { rpm, voltage, current, temperature } = msg;

    await pool.query(
      `INSERT INTO motor_data (rpm, voltage, current, temperature, topic)
       VALUES ($1, $2, $3, $4, $5)`,
      [rpm, voltage, current, temperature, topic]
    );

    console.log("[MQTT] Saved:", msg);
  });
}
