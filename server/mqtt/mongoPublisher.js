const mqtt = require("mqtt");
const dotenv = require("dotenv");

dotenv.config();

const client = mqtt.connect({
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT,
});

const userTopic = "root/user";
const userMessage = JSON.stringify({
  name: "Bob",
  ssn: "199912121234",
  emailaddress: "nonya@test.com",
  method: "add",
});

const dentistTopic = "root/dentistoffice";
const dentistMessage = JSON.stringify({
  id: "987",
  name: "Bob's Dental",
  owner: "Bob Bobson",
  dentists: ["Me", "Myself", "I"],
  address: "123 Toothy Hurty Avenue",
  city: "Dubai",
  coordinate: {
    latitude: "12.3456",
    longitude: "18.7654",
  },
  openinghours: {
    monday: "10:00-18:30",
    tuesday: "10:00-18:30",
    wednesday: "9:00-18:30",
    thursday: "9:00-18:30",
    friday: "8:00-14:30",
  },
  method: "add",
});

const appointmentTopic = "root/appointment";
const appointmentMessage = JSON.stringify({
  patient: "199912121234",
  dentistOffice: "987",
  date: new Date("2020-11-30T10:30:00.000Z"),
  method: "add",
});

// These are tests for the logger, just for writing.
const loggerTopicGeneral = "General";
const loggerMessageGeneral = "general";

const loggerTopicError = "Error";
const loggerMessageError = "error";

const loggerTopicConfirm = "Confirmation";
const loggerMessageConfirm = "confirmation";

client.on("connect", () => {
  console.log(" >> Publisher connected...");
  client.publish(userTopic, userMessage);
  client.publish(dentistTopic, dentistMessage);
  client.publish(appointmentTopic, appointmentMessage);

  // Here are some tests for the logger.
  client.publish(loggerTopicGeneral, loggerMessageGeneral);
  client.publish(loggerTopicError, loggerMessageError);
  client.publish(loggerTopicConfirm, loggerMessageConfirm);
});
