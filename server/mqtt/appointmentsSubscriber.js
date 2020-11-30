const mqtt = require('mqtt');
const dotenv = require('dotenv');
const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const { publish } = require('./publisher');
const deviceRoot = 'dentistimo/';

dotenv.config();

let db;

const client = mqtt.connect({
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT
});

mongoClient.connect("mongodb+srv://123123123:123123123@cluster0.5paxo.mongodb.net/Cluster0?retryWrites=true&w=majority", { useUnifiedTopology: true }, (err, client) => {
  if (err) return console.error(err);
  db = client.db('root-test');
});

client.on('connect', (err) => {
  client.subscribe(deviceRoot + 'appointments');
  console.log(' >> Subscribed to root/appointments');
});

client.on('message', (topic, message) => {
  let data = JSON.parse(message)

  switch(data.method) {
    case 'add':
      insertAppointment(data);
      break;
    case 'getAll':
      getAllAppointments();
    break;
    case 'getOne':
      getAppointment(data._id);
      break;
  }
});

const insertAppointment = (data) => {
  db.collection('appointments').insertOne({
    patient: data.patient,
    dentistOffice: data.dentistOffice,
    date: data.date
  });

  db.collection('users').find({ ssn: data.patient }).toArray((err, user) => {
    if (user) {
      console.log(user[0]);
      let payload = JSON.stringify({
        date: data.date,
        email: user[0].emailaddress,
        name: user[0].name
      });
      publish('notifier', payload);
    }
  });
  console.log(' >> Appointment added.')
};

const getAllAppointments = () => {
  db.collection('appointments').find({}).toArray((err, appointments) => {
    if(err) console.error(err);
    const message = JSON.stringify(appointments)
    publish('appointments', message)
    console.log(appointments)
  })
};

const getAppointment = (appointmentID) => {
  db.collection('appointments').find({ _id: appointmentID}).toArray((err, appointment) => {
    if(err) console.error(err)
    const message = JSON.stringify(appointment)
    publish('root/appointments', message)
    console.log(appointment)
  }) 
};