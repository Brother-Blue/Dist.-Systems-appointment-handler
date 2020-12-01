const mqtt = require('mqtt');
const dotenv = require('dotenv');
const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const fetch = require('node-fetch');
const deviceRoot = 'dentistimo/';
const { publish } = require('./publisher')

dotenv.config();

let db;
let url = "https://raw.githubusercontent.com/feldob/dit355_2020/master/dentists.json";
let settings = { method: "Get" };

const client = mqtt.connect({
    host: process.env.MQTT_HOST,
    port: process.env.MQTT_PORT
  });

mongoClient.connect("mongodb+srv://123123123:123123123@cluster0.5paxo.mongodb.net/Cluster0?retryWrites=true&w=majority", { useUnifiedTopology: true }, (err, client) => {
  if (err) return console.error(err);
  db = client.db('root-test');

  fetch(url, settings)
    .then(res => res.json())
    .then((json) => {
        
        var result = [];

        for(var i = 0; i < json.dentists.length; i++){
            result.push(json.dentists[i]);
            console.log(result[i]);
        }

        for(var i in result){
            insertDentistOffice(result[i]);
        }
    });

});

client.on('connect', (err) => {
    console.log('Test Client connected!');
    client.subscribe(deviceRoot + 'dentistoffice');
    console.log('Subscribed to root/test');
})

client.on('message', (topic, message) => {
    let data = JSON.parse(message)
    const method = data.method

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
            latitude: data.coordinate.latitude || data.coordinate[0],
            longitude: data.coordinate.longitude || data.coordinate[1],
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
        const message = JSON.stringify(dentistoffices)
        publish('dentists', message)
    })
}

const getDentistOffice = (dentistId) => {
    db.collection('dentistoffices').find({ id: parseInt(dentistId) }).toArray((err, dentistoffice) => {
        if(err) console.error(err);
        if(dentistoffice == null) console.log('Dentist office does not exist')
        const message = JSON.stringify(dentistoffice)
        publish('dentists/dentist', message)
    })
}
