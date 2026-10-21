require('dotenv').config();
const mqtt = require('mqtt');

const mqttUrl = process.env.MQTT_URL;
const topic = process.env.TOPIC;

const client = mqtt.connect(mqttUrl);

client.on('connect', () => {
    console.log("✅ subscriber 已连接Broker");
    client.subscribe(topic,(err)=>{
        if(!err){
            console.log("📥订阅主题成功：",topic);
        }
    })
});

client.on('message', (t, payload)=>{
    console.log(`收到主题[${t}] : ${payload.toString()}`);
});

client.on('error',(err)=>{
    console.error("❌连接错误",err);
})