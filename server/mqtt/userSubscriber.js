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
    subscriber.subscribe(deviceRoot + 'user');
    console.log('Subscribed to root/user');
})

subscriber.on('message', (topic, message) => {
    var data = JSON.parse(message)
    var method = data.method

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
})

const insertUser = (data) => {
    db.collection('user').insertOne({
        ssn: data.ssn,
        name: data.name,
        emailaddress: data.emailaddress
    })
}

const getAllUsers = () => {
    db.collection('user').find({}).toArray((err, user) => {
        if(err) console.error(err);
        var message = JSON.stringify(user)
        subscriber.publish('user', message)
    })
}

const getUser = (userSsn) => {
    db.collection('user').find({ ssn: userSsn }).toArray((err, user) => {
        if(err) console.error(err);
        var message = JSON.stringify(user)
        subscriber.publish('user/user', message)
    })
}

