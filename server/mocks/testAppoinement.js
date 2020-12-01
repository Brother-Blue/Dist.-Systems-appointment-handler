const mqtt = require('mqtt');
const dotenv = require('dotenv');
const { publish } = require('../mqtt/publisher');

dotenv.config();

const client = mqtt.connect({
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT
});

let message = JSON.stringify({
  method: 'add',
  patient: '199912121234',
  dentistOffice: '987',
  date: new Date("2018-01-01T11:30:00.000Z")
});

client.on('connect', () => {
  console.log('ping');
  publish('appointments', message, 1);
});