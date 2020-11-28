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
    subscriber.subscribe(deviceRoot + 'dentistoffice');
    console.log(' >> Subscribed to root/dentistoffice');
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



