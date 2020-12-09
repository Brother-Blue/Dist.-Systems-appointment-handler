const mqtt = require('mqtt');
const dotenv = require('dotenv');
const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const { publish } = require('./publisher');
const { subscribe } = require('./subscriber'); // { subscribe, unsubscribe } for future use

dotenv.config();

const client = mqtt.connect({
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT
});

let db;

mongoClient.connect("mongodb+srv://123123123:123123123@cluster0.5paxo.mongodb.net/Cluster0?retryWrites=true&w=majority", { useUnifiedTopology: true }, (err, client) => {
  if (err) return console.error(err);
  db = client.db('root-test');
});

client.on('connect', (err) => {
    subscribe('users');
    console.log('Subscribed to dentistimo/users');
});

client.on('message', (topic, message) => {
    const data = JSON.parse(message);
    const method = data.method;

    switch(method) {
        case 'add':
            insertUser(data);
            break;
        case 'getAll':
            getAllUsers(data);
            break;
        case 'getOne': 
            getUser(data.id);
            break;
        default:
            return console.log('Invalid method')
    }
});

const insertUser = (data) => {
    db.collection('users').insertOne({
        ssn: data.ssn,
        name: data.name,
        emailaddress: data.emailaddress
    })
};

const getAllUsers = () => {
    db.collection('users').find({}).toArray((err, user) => {
        if(err) console.error(err);
        const message = JSON.stringify(user)
        publish('users', message)
    })
};

const getUser = (userSsn) => {
    db.collection('users').find({ ssn: userSsn }).toArray((err, user) => {
        if(err) console.error(err);
        const message = JSON.stringify(user)
        publish('users/user', message)
    })
};

