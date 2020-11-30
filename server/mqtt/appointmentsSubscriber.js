const mqtt = require('mqtt');
const dotenv = require('dotenv');
const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const deviceRoot = 'root/';

dotenv.config();

let db;

connect = async () => {
  client = mqtt.connect({
    host: process.env.MQTT_HOST,
    port: process.env.MQTT_PORT
  });

  client.on('connect', (err) => {
    if (err.errorCode === -1) return console.error(err);
    console.log(' >> Publisher connected.');
  });
}

publish = async (topic, message, qos = 0) => {
  if (client) {
    try {
      console.log(`Pong! T: ${topic} M: ${message}`);
      await client.publish(topic, message, qos);
      // client.publish('dentistimo/logger', `Published message: ${message}`, 1);
    } catch (err) {
      console.error(err); // temporary
      // client.publish('dentistimo/logger', `ERROR: ${error}`, 2);
    }
  } else {
    await connect(); // If no publisher client exists, wait until connected then call publish again.
    publish(topic, message);
  }
}

mongoClient.connect("mongodb+srv://123123123:123123123@cluster0.5paxo.mongodb.net/Cluster0?retryWrites=true&w=majority", { useUnifiedTopology: true }, (err, client) => {
  if (err) return console.error(err);
  db = client.db('root-test');
});

client.on('connect', (err) => {
    client.subscribe(deviceRoot + 'appointment');
    console.log(' >> Subscribed to root/appointment');
  })

  client.on('message', (topic, message) => {
    var data = JSON.parse(message)

    switch(data.method) {
      case 'add':
        insertAppointment(data);
        break;
      case 'getAll':
        getAllAppointments();
        break;
      case 'getOne':
        //TODO figure out how to get and send the _id of each appointment
        getAppointment();
        break;
    }
  })

  const insertAppointment = (data) => {
    db.collection('appointments').insertOne({
      patient: data.patient,
      dentistOffice: data.dentistOffice,
      date: data.date
    })
    console.log(' > Appointment added.')
  }

  const getAllAppointments = () => {
    db.collection('appointments').find({}).toArray((err, appointments) => {
      if(err) console.error(err);
      var message = JSON.stringify(appointments)
      client.publish('root/appointments', message)
      console.log(appointments)
    })
    
  }
  const getAppointment = (appointmentID) => {
    db.collection('appointments').find({ _id: appointmentID}).toArray((err, appointment) => {
      if(err) console.error(err)
      var message = JSON.stringify(appointment)
      client.publish('root/appointments', message)
      console.log(appointment)
    })
    
  }