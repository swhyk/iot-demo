require('dotenv').config();
const path = require('path');
const mqtt = require('mqtt');
const express = require('express');

const mqttUrl = process.env.MQTT_URL;
const topic = process.env.TOPIC;
const port = process.env.PORT || 3000;

const app = express();
const sseClients = new Set();

let count = 0;

function randomTemperature() {
    return Number((20 + Math.random() * 10).toFixed(1));
}

function broadcast(payload) {
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    for (const res of sseClients) {
        res.write(data);
    }
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/events', (req, res) => {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });
    res.flushHeaders();

    sseClients.add(res);
    req.on('close', () => {
        sseClients.delete(res);
    });
});

app.listen(port, () => {
    console.log(`🌐 可视化页面: http://localhost:${port}`);
});

const client = mqtt.connect(mqttUrl);

client.on('connect', () => {
    console.log("✅ publisher 已连接Broker");
    setInterval(() => {
        const temperature = randomTemperature();
        const msg = String(temperature);
        client.publish(topic, msg);
        console.log(`📤发布：温度 ${temperature}℃ (#${count})`);

        broadcast({
            time: new Date().toTimeString().slice(0, 8),
            value: temperature,
            count,
        });
        count++;
    }, 2000);
});

client.on('error', (err) => {
    console.error("❌连接错误", err);
});
