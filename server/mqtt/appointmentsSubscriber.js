const mqtt = require("mqtt");
const dotenv = require("dotenv");
const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;
const { publish } = require("./publisher");
const root = "dentistimo/";
const CircuitBreaker = require("opossum");

dotenv.config();

const options = {
  timeout: 10000, //If function takes longer than 10 sec, trigger a failure
  errorHandlingPercentage: 10, //If 10% of requests fail, trigger circuit
  resetTimeout: 10000, //After 30 seconds try again
};

let db;

const client = mqtt.connect({
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT,
});

client.on("offline", () => {
  console.log("Offline");
  client.unsubscribe(root + "appointments");
});

client.on("close", () => {
  console.log("Close");
  client.unsubscribe(root + "appointments");
});

mongoClient.connect(
  "mongodb+srv://123123123:123123123@cluster0.5paxo.mongodb.net/Cluster0?retryWrites=true&w=majority",
  { useUnifiedTopology: true },
  (err, client) => {
    if (err) return console.error(err);
    db = client.db("root-test");
  }
);

client.on("connect", (err) => {
  client.subscribe(root + "appointments");
});

let breakerstate;
let breaker;
// On message, run method depending on message
client.on("message", (topic, message) => {
  let data = JSON.parse(message);
  
  switch (data.method) {
    case "add":
      breaker = new CircuitBreaker(insertAppointment(data), options);
      breaker.fallback(() => "Sorry, out of service right now");
      breaker.on("open", () => { 
        if(breakerstate != "opened"){
          console.log("Circuitbreaker opened");
          breakerstate = "opened"
        }
      })
      breaker.on("halfOpen", () => { 
        if(breakerstate != "halfOpen"){
          console.log("Circuitbreaker halfOpen");
          breakerstate = "halfOpen"
        }
      });
      /*The opossum librarys eventlistener for the "Closed" state does not work.
        We decided to work with the "Success" listener and force close it. */
      breaker.on("success", () => {
        if(breakerstate != "closed"){
          breaker.close();
          console.log("Circuitbreaker closed");
          breakerstate = "closed";
        }
        }
      );
      breaker.fire();
      break;
    case "getAll":
      breaker = new CircuitBreaker(getAllAppointments, options);
      breaker.fallback(() => "Sorry, out of service right now");
      breaker.on("open", () => { 
        if(breakerstate != "opened"){
          console.log("Circuitbreaker opened");
          breakerstate = "opened"
        }
      })
      breaker.on("halfOpen", () => { 
        if(breakerstate != "halfOpen"){
          console.log("Circuitbreaker halfOpen");
          breakerstate = "halfOpen"
        }
      });
      /*The opossum librarys eventlistener for the "Closed" state does not work.
        We decided to work with the "Success" listener and force close it. */
      breaker.on("success", () => {
        if(breakerstate != "closed"){
          breaker.close();
          console.log("Circuitbreaker closed");
          breakerstate = "closed";
        }
        }
      );
      breaker.fire();
      break;
    case "getOne":
      breaker = new CircuitBreaker(getAppointment(data._id), options);
      breaker.fallback(() => "Sorry, out of service right now");
      breaker.on("open", () => { 
        if(breakerstate != "opened"){
          console.log("Circuitbreaker opened");
          breakerstate = "opened"
        }
      })
      breaker.on("halfOpen", () => { 
        if(breakerstate != "halfOpen"){
          console.log("Circuitbreaker halfOpen");
          breakerstate = "halfOpen"
        }
      });
      /*The opossum librarys eventlistener for the "Closed" state does not work.
        We decided to work with the "Success" listener and force close it. */
      breaker.on("success", () => {
        if(breakerstate != "closed"){
          breaker.close();
          console.log("Circuitbreaker closed");
          breakerstate = "closed";
        }
        }
      );
      breaker.fire();
      break;
    case "getOffice":
      breaker = new CircuitBreaker(
        getOfficeAppointment(data.dentistid),
        options
      );
      breaker.fallback(() => "Sorry, out of service right now");
      breaker.on("open", () => { 
        if(breakerstate != "opened"){
          console.log("Circuitbreaker opened");
          breakerstate = "opened"
        }
      })
      breaker.on("halfOpen", () => { 
        if(breakerstate != "halfOpen"){
          console.log("Circuitbreaker halfOpen");
          breakerstate = "halfOpen"
        }
      });
      /*The opossum librarys eventlistener for the "Closed" state does not work.
        We decided to work with the "Success" listener and force close it. */
      breaker.on("success", () => {
        if(breakerstate != "closed"){
          breaker.close();
          console.log("Circuitbreaker closed");
          breakerstate = "closed";
        }
        }
      );
      breaker.fire();
      break;
    default:
      return console.log("Invalid method");
  }
});

// Store new appointment on publish message
const insertAppointment = (data) => {
  return new Promise((resolve, reject) => {
    db.collection("appointments")
      .find({ time: data.time, dentistid: data.dentistid })
      .toArray()
      .then((appointmentresult) => {
        db.collection("dentistoffices")
          .find({ id: parseInt(data.dentistid) })
          .toArray()
          .then((officeresult) => {
            if (
              appointmentresult == "" ||
              appointmentresult.length < parseInt(officeresult[0].dentists)
            ) {
              db.collection("appointments")
                .insertOne({
                  userid: data.userid,
                  requestid: data.requestid,
                  dentistid: data.dentistid,
                  issuance: data.issuance,
                  time: data.time,
                })
                .then(() => {
                  let payload = JSON.stringify({
                    date: data.time,
                    emailaddress: data.emailaddress,
                    name: data.name,
                  });
                  publish("notifier", payload, 2);
                  publish("log/general", payload, 1);

                })
                .then(() => {
                  let response = JSON.stringify({
                    userid: data.userid,
                    requestid: data.requestid,
                    time: data.time,
                    success: true,
                  });
                  let date = data.time.split(" ")[0];
                  publish(
                    "dentistoffice",
                    JSON.stringify({
                      method: "getTimeSlots",
                      id: data.dentistid,
                      date: date,
                    }),
                    2
                  );

                  publish("appointments/response", response, 1);
                  resolve({ data: "Success" });
                })
                .catch((err) => {
                  let response = JSON.stringify({
                    userid: data.userid,
                    requestid: data.requestid,
                    time: data.time,
                    success: false,
                  });

                  publish("log/error", err, 2);
                  publish("appointments/response", response, 1);
                  reject({ data: "Failure" });
                });
            } else {
              let response = JSON.stringify({
                userid: data.userid,
                requestid: data.requestid,
                time: data.time,
                success: false,
              });

              publish("log/error", "Appointment insertion failed", 2);
              publish("appointments/response", response, 1);
              reject({ data: "Failure" });
            }
          });
      });
  });
};

// Publish all stored appointments
const getAllAppointments = () => {
  return new Promise((resolve, reject) => {
    db.collection("appointments")
      .find({})
      .toArray()
      .then((result) => {
        const message = JSON.stringify(result);
        publish("appointments", message, 2);
        resolve({ data: "Success" });
      })
      .catch((err) => {
        publish("log/error", err, 2);
        reject({ data: "Failure" });
      });
  });
};

// Publish specific stored appointment based on ID
const getAppointment = (appointmentID) => {
  return new Promise((resolve, reject) => {
    db.collection("appointments")
      .find({ _id: appointmentID })
      .toArray((err, appointment) => {
        if (err) publish("log/error", err, 2);
        const message = JSON.stringify(appointment);
        publish("appointments", message, 2);
        resolve({ data: "Success" });
      })
      .catch((err) => {
        publish("log/error", err, 2);
        reject({ data: "Failure" });
      });
  });
};
