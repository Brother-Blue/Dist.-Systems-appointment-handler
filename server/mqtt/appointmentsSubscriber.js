const mqtt = require("mqtt");
const dotenv = require("dotenv");
const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;
const { publish } = require('./publisher');
const root = 'dentistimo/';
const CircuitBreaker = require('opossum')

dotenv.config();

const options = {
  timeout: 10000, //If function takes longer than xx sec, trigger a failure
  errorHandlingPercentage: 50, //If xx% of requests fail, trigger circuit
  resetTimeout: 30000 //After xx seconds try again
}

let db;

const client = mqtt.connect({
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT,
});

mongoClient.connect(
  "mongodb+srv://123123123:123123123@cluster0.5paxo.mongodb.net/Cluster0?retryWrites=true&w=majority",
  { useUnifiedTopology: true },
  (err, client) => {
    if (err) return console.error(err);
    db = client.db("root-test");
  }
);

client.on('connect', (err) => {
  client.subscribe(root + 'appointments');
});

client.on("message", (topic, message) => {
  let data = JSON.parse(message);
  switch (data.method) {
    case "add":
      breaker = new CircuitBreaker(insertAppointment(data), options)
      breaker.fire()
      .then(console.log)
      .catch(console.error)
      break;
    case "getAll":
      breaker = new CircuitBreaker(getAllAppointments, options)
      breaker.fire()
      .then(console.log)
      .catch(console.error)
      break;
    case "getOne":
      breaker = new CircuitBreaker(getAppointment(data._id), options)
      breaker.fire()
      .then(console.log)
      .catch(console.error)
      break;
    case "getOffice":
      getOfficeAppointment(data.dentistid);
      break;
    default:
      return console.log("Invalid method");
  }
});

const insertAppointment = (data) => {
  return new Promise((resolve, reject) => {
    db.collection("appointments")
    .find({ time: data.time })
    .toArray()
    .then((result) => {
      if(result == ''){
        db.collection("appointments").insertOne({
          userid: data.userid,
          requestid: data.requestid,
          dentistid: data.dentistid,
          issuance: data.issuance,
          time: data.time,
        }).then((result) => {      
          let payload = JSON.stringify({
            date: data.time,
            emailaddress: data.emailaddress,
            name: data.name,
          });
          publish("notifier", payload);
          publish("log/general", payload);

          console.log(" >> Appointment added.");
    
        }).then(() => {
          let response = JSON.stringify({
            userid: data.userid,
            requestid: data.requestid,
            time: data.time,
            success: true
          })
          let date = data.time.split(' ')[0]
          publish('dentistoffice', JSON.stringify({'method': 'getTimeSlots', 'id': data.dentistid, 'date': date}) )

          publish("appointments/response", response)
          resolve({data: "Success"})
    
        }).catch((err) => {
              let response = JSON.stringify({
            userid: data.userid,
            requestid: data.requestid,
            time: data.time,
            success: false
          })
    
          console.log("Appointment insertion failed")
          publish("log/error", err)
          publish("appointments/response", response)
          reject({data: "Failure"})
        })
      } else {
        let response = JSON.stringify({
          userid: data.userid,
          requestid: data.requestid,
          time: data.time,
          success: false
        })
  
        console.log("Appointment insertion failed")
        publish("log/error", 'Appointment insertion failed')
        publish("appointments/response", response)
        reject({data: "Failure"})
      }
      
    })
    })
    


};

const getAllAppointments = () => {
  return new Promise((resolve, reject) => {
    db.collection("appointments")
    .find({})
    .toArray()
    .then((result) => {
      const message = JSON.stringify(result);
      publish("appointments", message);
      resolve({data: "Success"})
    })
    .catch((err) => {
      console.log(err)
      publish("log/error", err)
      reject({data: "Failure"})
    });
  })
};

const getAppointment = (appointmentID) => {
  return new Promise((resolve, reject) => {
    db.collection("appointments")
    .find({ _id: appointmentID })
    .toArray((err, appointment) => {
      if (err) console.error(err);
      const message = JSON.stringify(appointment);
      publish("appointments", message);
      resolve({data: "Success"})
    })
    .catch((err) => {
      console.log(err)
      publish("log/error", err)
      reject({data: "Failure"})
    })
  })
  
};

const getOfficeAppointment = (officeID) => {
  db.collection("appointments")
    .find({ dentistid: officeID })
    .toArray((err, appointment) => {
      if (err) console.log(err);
      const message = JSON.stringify(appointment);
      publish("appointments/office", message);
    })
};