import { connect } from "mqtt";
const client = connect("mqtt://localhost:1883");

setInterval(() => {
  const data = {
    rpm: 1625 + Math.random() * 200,
    voltage: 220 + Math.random() * 10,
    current: 15 + Math.random(),
    temperature: 40 + Math.random() * 5
  };

  client.publish("motor/data", JSON.stringify(data));
  console.log("Published", data);
}, 1000);
