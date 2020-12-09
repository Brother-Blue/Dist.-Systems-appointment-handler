const mqtt = require('mqtt');
const dotenv = require('dotenv');

let eventID = 0;

dotenv.config();

let client = mqtt.connect({
        host: process.env.MQTT_HOST,
        port: process.env.MQTT_PORT
    });
    
client.on('connect', (err) => {
    if (err.errorCode === -1) return console.error(err);
});

const publish = async (topic, message, qos = 0) => {
    if (client) {
        try {
            client.publish('dentistimo/' + topic, message, qos);
            client.publish('dentistimo/log/general', `Published message: ${message}. Event ID: ${eventID}`, 1);

        } catch (err) {
            client.publish('dentistimo/log/error', `ERROR: ${err}. Event ID: ${eventID}`, 1);
        }
        eventID++;
    } else {
        publish(topic, message);
    }
};

module.exports.publish = publish;