# Industrial IoT HMI Remote System
This Human Machine Interface (HMI) remote project is 3-phase motor monitoring web that used to in industrial project. This porject implement real-time monitoring for voltage, current, speed, and power consumption. There are system condition monitor to warn if there any issue on the motor, like overcurrent, overspeed, undervoltage, etc. This website also provide historical motor data, the user could see the trend and dynamical data in the past, 30 minutes, 1 hour, 6 hours, 12 hourse, 1 day, 7 days, and 30 days. 

This project was developed by Electrical Engineering student for TF4017 Industrial IoT course.

**Real-TIme Monitoring**
<img width="1841" height="912" alt="Screenshot From 2026-01-12 17-10-04" src="https://github.com/user-attachments/assets/31853571-a8d5-4b8e-8156-4bcf7342e8af" />

**Historical Monitoring**
<img width="1841" height="912" alt="Screenshot From 2026-01-12 17-10-30" src="https://github.com/user-attachments/assets/35641d19-ecaa-46e6-a6bf-93918615b93d" />

**Alarm notification and record**
<img width="1841" height="912" alt="Screenshot From 2026-01-12 17-10-59" src="https://github.com/user-attachments/assets/210c68d9-ab6d-4d31-9867-3e6cb9784653" />

# Tech Stack
Frontend:
1. Framework: React JS (Vite)
2. Language: Typescript
3. Styling: Tailwind CSS + Shadcn UI
4. Charting: Recharts
5. Communication: MQTT JS (Websocet)

Backend
1. Runtime: Node JS
2. Framework: Express
3. Database: PostgreSQL
4. ORM/query: Node-postgres (pg)
5. Broker: Mosquitto (MQTT)

# How to Start
***Requirement***
NodeJS (v.18+), PostgreSQL, Mosquitto MQTT

**Steps Guide**
1. Mosquitto Configuration
   Ensure websocket is activated in mosquitto configuration. Check the `mosquitto.conf`
   ```
   listener 1883
   allow_anonymous true
   listener 9001
   protocol websockets
   allow_anonymous true
   ```
2. Clone this project/download via zip, then run `npm i` to install all the library and dependencies
3. Connect to the same local network as HMI local. The HMI local is build with easyBuilder. See the ip address with `ip a` in linux Ubuntu. If want to run simulation, just write with `localhost`.
4. Create and setup `.env`.
   ```
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432POSTGRES_DB=(your database db)
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=(your database password)
   MQTT_URL=mqtt://localhost:1883
   VITE_MQTT_WS_URL=ws://(your ip address):9001
   NODE_ENV=development
   PORT=3000
   VITE_API_URL=http://(your ip address):3000
   ```
4. Run the server. In terminal, run: `npm run start` or `npx tsx server.ts`
5. Run the frontend. In terminal, run: `npm run dev`
6. The website will on. If did'nt use local HMI, run `node publisher.js` to execute the simulation.
 
# Author
1. Riswandha Mashuri
2. M. Eiros Dante
3. M. Yusuf Al Azmi
4. Naufal Abrar
