const mqtt = require('mqtt');
const dotenv = require('dotenv');

dotenv.config();

connect = async () => {
    client = mqtt.connect({
        host: process.env.MQTT_HOST,
        port: process.env.MQTT_PORT
    });
    
    client.on('connect', (err) => {
        if (err.errorCode === -1) return console.error(err);
    });
};

const publish = async (topic, message, qos = 0) => {
    if (client) {
        try {
            await client.publish('dentistimo/' + topic, message, qos);
             // client.publish('dentistimo/logger', `Published message: ${message}`, 1);
            } catch (err) {
                console.error(err); // temporary
                // client.publish('dentistimo/logger', `ERROR: ${error}`, 2);
            }
        } else {
            await connect(); // If no publisher client exists, wait until connected then call publish again.
            publish(topic, message);
        }
};

module.exports.publish = publish;