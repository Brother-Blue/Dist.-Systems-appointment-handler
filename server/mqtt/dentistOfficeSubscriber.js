const mqtt = require("mqtt");
const dotenv = require("dotenv");
const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;
const fetch = require("node-fetch");
const { publish } = require("./publisher");
const root = "dentistimo/";
const CircuitBreaker = require("opossum");

dotenv.config();

const options = {
  timeout: 10000, //If function takes longer than 10 sec, trigger a failure
  errorHandlingPercentage: 10, //If 10% of requests fail, trigger circuit
  resetTimeout: 30000, //After 30 seconds try again
};

let db;

//URL to the dentist registry file.
let url =
  "https://raw.githubusercontent.com/feldob/dit355_2020/master/dentists.json";
//Specify what function the fetch should work with.
let settings = { method: "Get" };

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
    const breaker = new CircuitBreaker(updateDentistOffices, options);
    //Sets an interval that calls the updateDentistOffices-function every 10 minutes.
    setInterval(() => {
      breaker.fire().then().catch();
    }, 600000);
  }
);

client.on("connect", (err) => {
  client.subscribe(root + "dentistoffice");
  console.log("Subscribed to dentistimo/dentistoffice");
});

client.on("offline", () => {
  console.log("Offline");
  client.unsubscribe(root + "dentistoffice");
});

client.on("close", () => {
  console.log("Close");
  client.unsubscribe(root + "dentistoffice");
});

// On message, run method depending on message
client.on("message", (topic, message) => {
  let data = JSON.parse(message);
  const method = data.method;
  let breaker;

  switch (method) {
    case "getAll":
      breaker = new CircuitBreaker(getAllDentistOffices(), options);
      breaker.fallback(() => "Sorry, out of service right now");
      breaker.fire().then(console.log).catch(console.error);
      break;
    case "getOne":
      breaker = new CircuitBreaker(getDentistOffice(data.id), options);
      breaker.fallback(() => "Sorry, out of service right now");
      breaker.fire().then(console.log).catch(console.error);
      break;
    case "getAllTimeslots":
      breaker = new CircuitBreaker(getAllTimeslots, options);
      breaker.fallback(() => "Sorry, out of service right now");
      breaker.fire().then(console.log).catch(console.error);
      break;
    case "getTimeSlots":
      breaker = new CircuitBreaker(getTimeSlots(data.id, data.date), options);
      breaker.fallback(() => "Sorry, out of service right now");
      breaker.fire().then(console.log).catch(console.error);
      break;
    default:
      return console.log("Invalid method");
  }
});

//Function to fetch data and replace the existing data in the dentistoffice-collection.
const updateDentistOffices = () => {
  return new Promise((resolve, reject) => {
    //Uses node fetch to fetch data from the dentist registry
    fetch(url, settings)
      .then((res) => res.json())
      .then((json) => {
        //Remove all existin data from the collection
        db.collection("dentistoffices")
          .remove()
          .then(() => {
            //If the removal was successful, insert the fetched data to the collection
            var result = [];

            for (var i = 0; i < json.dentists.length; i++) {
              result.push(json.dentists[i]);
            }

            for (var i in result) {
              db.collection("dentistoffices").updateOne(
                { id: result[i].id },
                {
                  $set: {
                    id: result[i].id,
                    name: result[i].name,
                    owner: result[i].owner,
                    dentists: result[i].dentists,
                    address: result[i].address,
                    city: result[i].city,
                    coordinate: {
                      longitude: result[i].coordinate.longitude,
                      latitude: result[i].coordinate.latitude,
                    },
                    openinghours: {
                      monday: result[i].openinghours.monday,
                      tuesday: result[i].openinghours.tuesday,
                      wednesday: result[i].openinghours.wednesday,
                      thursday: result[i].openinghours.thursday,
                      friday: result[i].openinghours.friday,
                    },
                  },
                },
                { upsert: true }
              );
            }
            console.log(" > Dentist office collecton updated.");
            resolve({ data: "Success" });
          })
          .catch((err) => {
            console.log("Could not remove collection");
            publish("log/error", err, 2);
            reject({ data: "Failure" });
          });
      })
      .catch((err) => {
        console.log("Could not fetch data");
        publish("log/error", err, 2);
        reject({ data: "Failure" });
      });
  });
};

// Publish all stored dentistOffices
const getAllDentistOffices = () => {
  return new Promise((resolve, reject) => {
    db.collection("dentistoffices")
      .find({})
      .toArray()
      .then((result) => {
        const message = JSON.stringify(result);
        publish("dentists", message, 2);
        resolve({ data: "Success" });
      })
      .catch((err) => {
        publish("log/error", err, 2);
        reject({ data: "Failure" });
      });
  });
};

// Publish specific stored dentistOffice based on ID
const getDentistOffice = (dentistId) => {
  return new Promise((resolve, reject) => {
    db.collection("dentistoffices")
      .find({ id: parseInt(dentistId) })
      .toArray()
      .then((result) => {
        var dentistoffice = result;
        if (dentistoffice == null) console.log("Dentist office does not exist");
        const message = JSON.stringify(dentistoffice);
        publish("dentists/dentist", message, 2);
        resolve({ data: "Success" });
      })
      .catch((err) => {
        publish("log/error", err, 2);
        reject({ data: "Failure" });
      });
  });
};

// UNUSED: Publish all timeslots for all dentistOffices for an entire week
const getAllTimeslots = () => {
  return new Promise((resolve, reject) => {
    let officeArray = [];
    db.collection("dentistoffices")
      .find({})
      .toArray()
      .then((result) => {
        officeArray = result;
        let officesArray = [];
        for (let i = 0; i < officeArray.length; i++) {
          let office = {
            id: "",
            name: "",
            timeslots: {
              monday: [],
              tuesday: [],
              wednesday: [],
              thursday: [],
              friday: [],
            },
          };
          office.id = officeArray[i].id;
          office.name = officeArray[i].name;
          office.timeslots.monday = getTimeSlots(
            officeArray[i].openinghours.monday
          );
          office.timeslots.tuesday = getTimeSlots(
            officeArray[i].openinghours.tuesday
          );
          office.timeslots.wednesday = getTimeSlots(
            officeArray[i].openinghours.wednesday
          );
          office.timeslots.thursday = getTimeSlots(
            officeArray[i].openinghours.thursday
          );
          office.timeslots.friday = getTimeSlots(
            officeArray[i].openinghours.friday
          );
          officesArray.push(office);
        }
        publish("dentists/offices/timeslots", JSON.stringify(officesArray), 2);
        resolve({ data: "Success" });
      })
      .catch((err) => {
        publish("log/error", err, 2);
        reject({ data: "Failure" });
      });
  });
};

// Publish timeslots for a specific day for a given dentistOffice
const getTimeSlots = (dentistId, date) => {
  return new Promise((resolve, reject) => {
    let appointments = [];
    let officeArray = [];
    let timeSlot = [];
    let busyDate = [];
    let removeDate = [];
    const daySelected = new Date(date).getDay();

    // Find correct dentistOffice
    db.collection("dentistoffices")
      .find({ id: parseInt(dentistId) })
      .toArray()
      .then((result) => {
        officeArray = result[0];

        // Look for specific day depending on user selection
        switch (daySelected) {
          case 1:
            timeSlot = calcTimeSlots(officeArray.openinghours.monday);
            break;

          case 2:
            timeSlot = calcTimeSlots(officeArray.openinghours.tuesday);
            break;

          case 3:
            timeSlot = calcTimeSlots(officeArray.openinghours.wednesday);
            break;

          case 4:
            timeSlot = calcTimeSlots(officeArray.openinghours.thursday);
            break;

          case 5:
            timeSlot = calcTimeSlots(officeArray.openinghours.friday);
            break;
        }

        // Find booked appointments for given dentistOffice
        db.collection("appointments")
          .find({ dentistid: String(dentistId) })
          .toArray()
          .then((result) => {
            appointments = result;

            // Find appointments on the same date as user selection
            for (let i = 0; i < appointments.length; i++) {
              let time = appointments[i].time.split(" ");
              if (time[0] === date) {
                busyDate.push(time[1]);
              }
            }

            // Find busy timeslots by comparing dentists with booked times
            for (let i = 0; i < busyDate.length; i++) {
              let counter = 0;
              for (let k = 0; k < busyDate.length; k++) {
                if (busyDate[i] === busyDate[k]) {
                  counter++;
                }
              }
              if (counter >= officeArray.dentists) {
                removeDate.push(busyDate[i]);
              }
            }

            // Remove busy/ booked times
            for (let i = 0; i < removeDate.length; i++) {
              timeSlot = timeSlot.filter((val) => !removeDate.includes(val));
            }
            publish("dentists/offices/timeslots", JSON.stringify(timeSlot), 2);
            resolve({ data: "Success" });
          })
          .catch((err) => {
            publish("log/error", err, 2);
            reject({ data: "Failure" });
          });
      })
      .catch((err) => {
        publish("log/error", err, 2);
        reject({ data: "Failure" });
      });
  });
};

// Calculate timeslots for a dentistOffice
calcTimeSlots = function (dailyhours) {
  var res = dailyhours.split("-");
  let openingHour = res[0].split(":");
  let closingHour = res[1].split(":");
  var timeslots = [];
  var i;

  var finalopeningHour = openingHour[0];
  var finalclosingHour = closingHour[0];

  // Create timeslots from an opening and closing hour
  for (i = parseInt(finalopeningHour); i < parseInt(finalclosingHour); i++) {
    if (i != 12) {
      // Skip 12-13 timeslot for lunchhour
      if (i != 10) {
        // Skip 10:00-10:30 timeslot for fikabreak
        var timeslotStart = i + ":00";
        var timeslotEnda = i + ":30";
        timeslots.push(timeslotStart + "-" + timeslotEnda);
      }
      timeslotStart = i + ":30";
      timeslotEnda = i + 1 + ":00";
      timeslots.push(timeslotStart + "-" + timeslotEnda);
    }
  }
  return timeslots;
};
