const mqtt = require('mqtt');
const dotenv = require('dotenv');

dotenv.config();

const client = mqtt.connect({
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT
});

const topic = 'root/user';
const message = JSON.stringify({
    name: "Bob",
    method: "add",
    ssn: "199912121234",
    emailaddress: "nonya@test.com"
});

client.on('connect', () => {
  console.log(' >> Publisher connected...');
  client.publish(topic, message);
});