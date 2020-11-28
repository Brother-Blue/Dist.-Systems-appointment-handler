const mqtt = require('mqtt');
const dotenv = require('dotenv');
const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const deviceRoot = 'root/';

dotenv.config();

const subscriber = mqtt.connect({
    host: process.env.MQTT_HOST,
    port: process.env.MQTT_PORT
  });

  var db

mongoClient.connect("mongodb+srv://123123123:123123123@cluster0.5paxo.mongodb.net/Cluster0?retryWrites=true&w=majority", { useUnifiedTopology: true }, (err, client) => {
  if (err) return console.error(err);
  db = client.db('root-test');
});

subscriber.on('connect', (err) => {
    subscriber.subscribe(deviceRoot + 'appointment');
    console.log(' >> Subscribed to root/appointment');
  })

  subscriber.on('message', (topic, message) => {
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
      subscriber.publish('root/appointments', message)
      console.log(appointments)
    })
    
  }
  const getAppointment = (appointmentID) => {
    db.collection('appointments').find({ _id: appointmentID}).toArray((err, appointment) => {
      if(err) console.error(err)
      var message = JSON.stringify(appointment)
      subscriber.publish('root/appointments', message)
      console.log(appointment)
    })
    
  }