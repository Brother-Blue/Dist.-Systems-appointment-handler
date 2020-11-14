const mongoose = require('mongoose');
const Dentistoffice = require('./dentistoffice');
const User = require('./user');
var Schema = mongoose.Schema;

var appointmentSchema = new Schema({
    patient: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    dentistoffice: {
        type: Schema.Types.ObjectId,
        ref: 'dentistoffice'
    },
    date: {type: Date}
});

module.exports = mongoose.model('appointment', appointmentSchema);
