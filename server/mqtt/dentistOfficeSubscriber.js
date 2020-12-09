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
  updateDentistOffices();
});

client.on('connect', (err) => {
    console.log('Test Client connected!');
    client.subscribe(deviceRoot + 'dentistoffice');
    console.log('Subscribed');
})

client.on('message', (topic, message) => {
    let data = JSON.parse(message)
    const method = data.method

    switch(method) {
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

const updateDentistOffices = (data) => {
    try{
        fetch(url, settings)
        .then(res => res.json())
        .then((json) => {
            
            var result = [];
    
            for(var i = 0; i < json.dentists.length; i++){
                result.push(json.dentists[i]);
            }
    
            for(var i in result){
                db.collection('dentistoffices').updateOne(
                    { "id": result[i].id },
                    { $set: {
                        "id": result[i].id,
                        "name": result[i].name,
                        "owner": result[i].owner,
                        "dentists": result[i].dentists,
                        "address": result[i].address,
                        "city": result[i].city,
                        "coordinate": {
                            "longitude": result[i].coordinate.longitude,
                            "latitude": result[i].coordinate.latitude
                        },
                        "openinghours": {
                            "monday": result[i].openinghours.monday,
                            "tuesday": result[i].openinghours.tuesday,
                            "wednesday": result[i].openinghours.wednesday,
                            "thursday": result[i].openinghours.thursday,
                            "friday": result[i].openinghours.friday
                        }
                    }},
                    {upsert: true})
            }
        });
        console.log(' > Dentist office collecton updated.')


    } catch(e) {
         client.publish(deviceRoot+'log/error', e);
         console.log(e);
    }
    
    setTimeout(updateDentistOffices, 600000);
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