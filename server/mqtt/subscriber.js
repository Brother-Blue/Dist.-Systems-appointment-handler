const mqtt = require('mqtt');
const dotenv = require('dotenv');
// const { publisher } = require('./publisher');

dotenv.config();

let client;

connect = async () => {
  client = mqtt.connect({
      host: process.env.MQTT_HOST,
      port: process.env.MQTT_PORT
  });
  
  client.on('connect', (err) => {
      if (err.errorCode === -1) return console.error(err);
  });
};

const subscribe = async (topic) => {
  if (client) {
    try {
      client.subscribe('dentistimo/' + topic);
      // publish(/logger, `Subscribed to topic: ${topic}`)
    } catch (err) {
      console.error(err);
      // publish(/logger, `ERROR: ${err}`, 1)
    }
  } else {
    await connect();
    subscribe(topic);
  }
}

const unsubscribe = async (topic) => {
  if (client) {
    try {
      await client.unsubscribe('dentistimo/' + topic);
      // publish(/logger, `Unsubscribed to topic: ${topic}`)
    } catch (err) {
      console.error(err);
      // publish(/logger, `ERROR: ${err}`, 1)
    }
  } else {
    await connect();
    unsubscribe(topic);
  }
}

module.exports.subscribe = subscribe;
module.exports.unsubscribe = unsubscribe;