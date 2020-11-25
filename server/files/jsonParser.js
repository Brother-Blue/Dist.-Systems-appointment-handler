const fs = require('fs');

let rawdata = fs.readFileSync('../files/dentistRegistry.json');
let dentistRegistryFile = JSON.parse(rawdata);
console.log(dentistRegistryFile);
