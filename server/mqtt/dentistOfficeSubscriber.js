const mqtt = require('mqtt');
const dotenv = require('dotenv');
const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const deviceRoot = 'root/';
const fetch = require('node-fetch');

dotenv.config();

const subscriber = mqtt.connect({
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT
});

let url = "https://raw.githubusercontent.com/feldob/dit355_2020/master/dentists.json";
let settings = { method: "Get" };
var db

mongoClient.connect("mongodb+srv://123123123:123123123@cluster0.5paxo.mongodb.net/Cluster0?retryWrites=true&w=majority", { useUnifiedTopology: true }, (err, client) => {
  if (err) return console.error(err);
  db = client.db('root-test');
});

subscriber.on('connect', (err) => {
    subscriber.subscribe(deviceRoot + 'dentistoffice');
    console.log('Subscribed to root/test');
    
    fetch(url, settings)
    .then(res => res.json())
    .then((json) => {
        // My problem is that I do not know what to do here.. I don't understand it.
        console.log(json);
    });

})

subscriber.on('message', (topic, message) => {
    var data = JSON.parse(message)
    var method = data.method

    switch(method) {
        case 'add':
            insertDentistOffice(data);
            break;
        case 'getAll':
            getAllDentistOffices(data);
            break;
        case 'getOne': 
            getDentistOffice(data.id);
            break;
        default:
            return console.log('Invalid method')
    }
})

const insertDentistOffice = (data) => {
    db.collection('dentistoffices').insertOne({
        id: data.id,
        name: data.name,
        owner: data.owner,
        dentists: data.dentists,
        address: data.address,
        city: data.city,
        coordinate: [{
            latitude: data.coordinate.latitude,
            longitude: data.coordinate.longitude,
        }],
        openinghours: [{
            monday: data.openinghours.monday,
            tuesday: data.openinghours.tuesday,
            wednesday: data.openinghours.wednesday,
            thursday: data.openinghours.thursday,
            friday: data.openinghours.friday,
        }]

    })
    console.log(' > Dentist office added.')
}

const getAllDentistOffices = () => {
    db.collection('dentistoffices').find({}).toArray((err, dentistoffices) => {
        if(err) console.error(err);
        var message = JSON.stringify(dentistoffices)
        subscriber.publish('dentists', message)
    })
}

const getDentistOffice = (dentistId) => {
    db.collection('dentistoffices').find({ id: dentistId }).toArray((err, dentistoffice) => {
        if(err) console.error(err);
        var message = JSON.stringify(dentistoffice)
        subscriber.publish('dentists/dentist', message)
    })
}



