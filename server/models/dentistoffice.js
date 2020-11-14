var mongoose = require('mongoose');

var dentistofficeSchema = new Schema ({
    name: {type: String},
    owner: {type: String},
    dentists: {type: Number},
    address: {type: String},
    city: {type: String},
    coordinate: [{
        latitude: {type: Number},
        longitude: {type: Number}
    }],
    openinghours: [{
        monday: {type: String},
        tuesday: {type: String},
        wednesday: {type: String},
        thursday: {type: String},
        friday: {type: String}
    }]
});

module.exports = mongoose.model('dentistoffice', dentistofficeSchema);