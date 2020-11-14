const mqtt = require('mqtt');
const dotenv = require('dotenv');

dotenv.config();

const client = mqtt.connect({
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT
});

const topic = 'dentist-test';

client.on('connect', () => {
  console.log(' >> Subscriber connected...');
  client.subscribe(topic);
});

client.on('message', (topic, message) => {
  console.log(`Received message: ${message} from topic: ${topic}.`);
});