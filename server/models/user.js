const mongoose = require('mongoose');

var userSchema = new Schema ({
    name: {type: String},
    ssn: {type: Number},
    emailaddress: {type: String, unique: true, trim: true, lowercases: true, match: [/^\w+([.-]?\w+)@\w+([.-]?\w+)(.\w{2,3})+$/, 'Please fill a valid email address']}
});

module.exports = mongoose.model('user', userSchema);