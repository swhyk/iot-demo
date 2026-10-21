require('dotenv').config();
const mqtt = require('mqtt');

const mqttUrl = process.env.MQTT_URL;
const topic = process.env.TOPIC;

const client = mqtt.connect(mqttUrl);

client.on('connect', () => {
    console.log("✅ publisher 已连接Broker");
    let count = 0;
    setInterval(()=>{
        const msg = `消息编号:${count}, Hello MQTT`;
        client.publish(topic, msg);
        console.log("📤发布：",msg);
        count++;
    },2000);
});

client.on('error',(err)=>{
    console.error("❌连接错误",err);
})