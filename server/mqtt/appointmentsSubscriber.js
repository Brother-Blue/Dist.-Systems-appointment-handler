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
  resetTimeout: 10000, //After 10 seconds try again
};

let db;

//connect to the mosquitto broker
const client = mqtt.connect({
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT,
});

//When client goes offline, unsubscribe
client.on("offline", () => {
  console.log("Offline");
  client.unsubscribe(root + "appointments");
});

//When the client is closed we unsubscribe
client.on("close", () => {
  console.log("Close");
  client.unsubscribe(root + "appointments");
});

//Connection to the Mongo cluster
mongoClient.connect(
  "mongodb+srv://123123123:123123123@cluster0.5paxo.mongodb.net/Cluster0?retryWrites=true&w=majority",
  { useUnifiedTopology: true },
  (err, client) => {
    if (err) return console.error(err);
    db = client.db("root-test");
  }
);

//When the client is connected we subscribe
client.on("connect", (err) => {
  client.subscribe(root + "appointments");
});

let breakerstate;
let breaker;

// On message, run method depending on provided message in payload
client.on("message", (topic, message) => {
  let data = JSON.parse(message);
  
  switch (data.method) {
    case "add":
      /*Creates a circuit-breaker that wraps the function in order to track the load of the component
      when the load is too high we open the circuit, after the time reset we enter a half-open state.
      if the subsequent message is successfull the circuit is closed. The fallback handles the cases where
      there is to much load on the component. This logic applies to all functions in this switch case */
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

// Function to check for duplicate appointments and inserting to database
const insertAppointment = (data) => {
  return new Promise((resolve, reject) => {
    // Make request to database to get all booked appointments at a specific time at a specific office
    db.collection("appointments")
      .find({ time: data.time, dentistid: data.dentistid })
      .toArray()
      .then((appointmentresult) => {
        // Make request to the database to get data about the specific dentist office
        db.collection("dentistoffices")
          .find({ id: parseInt(data.dentistid) })
          .toArray()
          .then((officeresult) => {
            // Check if there are no appointments for the specified time or the amount of dentist is larger than the appointments booked.
            if (
              appointmentresult == "" ||
              appointmentresult.length < parseInt(officeresult[0].dentists)
            ) {
              // Insert the new appointment to the database
              db.collection("appointments")
                .insertOne({
                  userid: data.userid,
                  requestid: data.requestid,
                  dentistid: data.dentistid,
                  issuance: data.issuance,
                  time: data.time,
                })
                .then(() => {
                  // If the insertion was successfull, filter the data and publish to broker.
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
                  // Send a request to update available time-slots.
                  publish(
                    "dentistoffice",
                    JSON.stringify({
                      method: "getTimeSlots",
                      id: data.dentistid,
                      date: date,
                    }),
                    2
                  );
                  // Publish successfull response to the broker.
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
                  // if there is an error, publish failures to broker. 
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
              // if there is an error, publish failures to broker.
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
