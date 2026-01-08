import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { startMqttServer } from "@/lib/mqttServer";

startMqttServer();

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT * FROM motor_data ORDER BY timestamp DESC LIMIT 30`
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
