const mqtt = require('mqtt');
const dotenv = require('dotenv');
const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const fetch = require('node-fetch');
const { publish } = require('./publisher')
const root = 'dentistimo/';
const CircuitBreaker = require('opossum')

dotenv.config();

const options = {
    timeout: 3000, //If function takes longer than 3sec, trigger a failure
    errorHandlingPercentage: 50, //If 50% of requests fail, trigger circuit
    resetTimeout: 3000 //After xx seconds try again
}

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
  const breaker = new CircuitBreaker(updateDentistOffices, options)
  setInterval(() => {
      breaker.fire()
    .then()
    .catch()
    }, 600000);
})

client.on('connect', (err) => {
    client.subscribe(root + 'dentistoffice');
    console.log('Subscribed to dentistimo/dentistoffice');
})

client.on('message', (topic, message) => {
    let data = JSON.parse(message)
    const method = data.method
    let breaker;

    switch(method) {
        case 'getAll':
            breaker = new CircuitBreaker(getAllDentistOffices(), options)
            breaker.fire()
            .then(console.log)
            .catch(console.error)
            break;
        case 'getOne': 
            breaker = new CircuitBreaker(getDentistOffice(data.id), options)
            breaker.fire()
            .then(console.log)
            .catch(console.error)
            break;
        case 'getAllTimeslots':
            breaker = new CircuitBreaker(getAllTimeslots, options)
            breaker.fire()
            .then(console.log)
            .catch(console.error)
            break;
        default:
            return console.log('Invalid method')
    }
})

const updateDentistOffices = () => {
    return new Promise((resolve, reject) => {

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
                console.log(' > Dentist office collecton updated.')
                resolve({data: "Success"})
            }).catch(err => {
                publish('log/error', err);
                console.log(err);
                reject({data: "Failure"})
            });
        
    })
}

const getAllDentistOffices = () => {
    return new Promise((resolve, reject) => {
        db.collection('dentistoffices').find({}).toArray()
        .then((result) => {
            const message = JSON.stringify(result)
            publish('dentists', message)
            resolve({data: "Success"})
        })
        .catch((err) => {
            console.log(err)
            reject({data: "Failure"})
        })
    })
}

const getDentistOffice = (dentistId) => {
    return new Promise ((resolve, reject) => {
        db.collection('dentistoffices').find({ id: parseInt(dentistId) }).toArray()
        .then((result) => {
            var dentistoffice = result
            if(dentistoffice == null) console.log('Dentist office does not exist')
            const message = JSON.stringify(dentistoffice)
            publish('dentists/dentist', message)
            resolve({data: "Success"})
        })
        .catch((err) => {
            console.error(err);  
            reject({data: "Failure"})
        })
    })
}

const getAllTimeslots = () => {
    return new Promise ((resolve, reject) => {
        let officeArray = []
        db.collection('dentistoffices').find({}).toArray()
        .then((result) => {
                officeArray = result
                let officesArray = []
                for(let i = 0; i < officeArray.length; i++){
                    let office = {
                        id:"",
                        name: "",
                        timeslots: {
                            monday: [],
                            tuesday: [],
                            wednesday: [],
                            thursday: [],
                            friday: []
                        }
                    }
                    office.id = officeArray[i].id
                    office.name = officeArray[i].name
                    office.timeslots.monday = (getTimeSlots(officeArray[i].openinghours.monday))
                    office.timeslots.tuesday = (getTimeSlots(officeArray[i].openinghours.tuesday))
                    office.timeslots.wednesday = (getTimeSlots(officeArray[i].openinghours.wednesday))
                    office.timeslots.thursday = (getTimeSlots(officeArray[i].openinghours.thursday))
                    office.timeslots.friday = (getTimeSlots(officeArray[i].openinghours.friday))
                    officesArray.push(office)
                }
                publish('dentists/offices/timeslots', JSON.stringify(officesArray),1)
                resolve({data: "Success"})
             
        }).catch((err) => {
            console.log(err)
            reject({data: "Failure"})
        })

    })

}
 getTimeSlots = function (dailyhours) {
    var res= dailyhours.split("-"); 
    let openingHour = res[0].split(":");
    let closingHour = res[1].split(":");
    var timeslots = [];
    var i;

    var finalopeningHour = openingHour[0];
    var finalclosingHour = closingHour[0];

    for(i = parseInt(finalopeningHour); i < parseInt(finalclosingHour); i++) {
      var timeslotStart = i + ":00"
      var timeslotEnda = i + ":30"
      timeslots.push(timeslotStart + "-" + timeslotEnda)
      timeslotStart = i + ":30"
      timeslotEnda = i+1 + ":00"
      timeslots.push(timeslotStart + "-" + timeslotEnda)
    }
    return timeslots;
}
