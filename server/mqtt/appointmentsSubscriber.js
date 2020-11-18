const mqtt = require('mqtt');
const dotenv = require('dotenv');
const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const deviceRoot = 'root/';


const subscriber = mqtt.connect({
    host: process.env.MQTT_HOST,
    port: process.env.MQTT_PORT
  });

  var db

mongoClient.connect("mongodb+srv://123123123:123123123@cluster0.5paxo.mongodb.net/Cluster0?retryWrites=true&w=majority", { useUnifiedTopology: true }, (err, client) => {
  if (err) return console.error(err);
  db = client.db('root-appointments');
});

subscriber.on('connect', (err) => {
    console.log('appointment subscriber connected!');
    subscriber.subscribe(deviceRoot + 'appointments');
    console.log('Subscribed to root/appointments');
  })

  subscriber.on('message', (topic, message) => {
    data = json.parse(message)
    if(data.method == add){
      insertAppointment(data)
    }
  })

  const insertAppointment = (data) => {
    db.collection('appointments').insertOne({
      // TODO: add appropriate data to be
    })
  }
