const fetch = require('node-fetch');
const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;

var db

mongoClient.connect("mongodb+srv://123123123:123123123@cluster0.5paxo.mongodb.net/Cluster0?retryWrites=true&w=majority", { useUnifiedTopology: true }, (err, client) => {
  if (err) return console.error(err);
  db = client.db('root-test');
});

//Code snippet found here: https://dev.to/isalevine/three-ways-to-retrieve-json-from-the-web-using-node-js-3c88

let url = "https://raw.githubusercontent.com/feldob/dit355_2020/master/dentists.json";
let settings = { method: "Get" };

fetch(url, settings)
    .then(res => res.json())
    .then((json) => {
        db.collection('dentistoffices').insertMany({
            id: json.id,
            name: json.name,
            owner: json.owner,
            dentists: json.dentists,
            address: json.address,
            city: json.city,
            coordinate: [{
            latitude: json.coordinate.latitude,
            longitude: json.coordinate.longitude,
        }],
        openinghours: [{
            monday: json.openinghours.monday,
            tuesday: json.openinghours.tuesday,
            wednesday: json.openinghours.wednesday,
            thursday: json.openinghours.thursday,
            friday: json.openinghours.friday,
        }]
    })
});
