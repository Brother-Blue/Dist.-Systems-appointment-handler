const mqtt = require('mqtt');
const dotenv = require('dotenv');
const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const deviceRoot = 'root/';

dotenv.config();

const testClient = mqtt.connect({
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT
});

var collection

mongoClient.connect("mongodb+srv://123123123:123123123@cluster0.5paxo.mongodb.net/Cluster0?retryWrites=true&w=majority", { useUnifiedTopology: true }, (err, client) => {
  if (err) return console.error(err);
  collection = client.db('root-test');
});

testClient.on('connect', (err) => {
  console.log('Test Client connected!');
  testClient.subscribe(deviceRoot + 'test');
  console.log('Subscribed to root/test');
})

testClient.on('message', (topic, message) => {
  name = JSON.parse(message).name
  insertName(name, collection);
  getNames(collection);
  deleteName(name, collection);
});

const insertName = (testName, db) => {
  const coll = db.collection('names');
  coll.insertOne({
    name: testName
  });
}

const getNames = (db) => {
  const coll = db.collection('names');
  coll.find({}).toArray((err, docs) => {
    if (err) console.error(err);
    console.log(docs);
  });
}

const deleteName = (testName, db) => {
  const coll = db.collection('names');
  coll.deleteOne({
    name: testName
  });
  console.log(`Successfully deleted: ${testName}`);
}