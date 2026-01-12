import { connect } from "mqtt";

// Ganti 'localhost' dengan IP laptop jika dijalankan dari device lain
// const client = connect("mqtt://192.168.30.105:1883"); 
const client = connect("mqtt://localhost:1883");

client.on("connect", () => {
  console.log("✅ Simulator Connected to MQTT Broker");
});

setInterval(() => {
  // --- 1. GENERATE DUMMY DATA ---
  
  // Voltage: Naik turun dikit di area 220V
  const valVoltage = 218 + Math.random() * 4; 
  
  // Current: Kecil aja (0.5 - 2.0 A) biar gak Alarm Critical
  const valCurrent = 0.5 + Math.random() * 1.5; 
  
  // RPM: Sesuai skala dashboard baru (10 - 20 RPM)
  const valRpm = 10 + Math.random() * 10; 

  // Power: Hitung KW (Rumus P = V * I * pf / 1000)
  const valPowerKW = (valVoltage * valCurrent * 0.85) / 1000;


  // --- 2. PUBLISH KE 4 TOPIK ---

  // A. Tegangan (pm/tegangan)
  // Backend baca key: 'tegangan'
  client.publish("pm/tegangan", JSON.stringify({ 
    tegangan: valVoltage 
  }));

  // B. Arus (pm/arus)
  // Backend baca key: 'arus'
  client.publish("pm/arus", JSON.stringify({ 
    arus: valCurrent 
  }));

  // C. Speed (vsd/actualspeed)
  // Backend baca key: 'actualspeed' (HMI formatnya kadang array, kita ikutin)
  client.publish("vsd/actualspeed", JSON.stringify({ 
    actualspeed: [valRpm] 
  }));

  // D. Power (pm/power)
  // Backend baca key: 'power'
  client.publish("pm/power", JSON.stringify({ 
    power: valPowerKW 
  }));

  // Log biar enak diliat di terminal
  console.log(`📡 [SENT] V:${valVoltage.toFixed(1)} | I:${valCurrent.toFixed(2)} | RPM:${valRpm.toFixed(1)} | P:${valPowerKW.toFixed(3)}kW`);

}, 1000); // Kirim setiap 1 detik