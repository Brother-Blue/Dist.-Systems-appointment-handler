const fetch = require('node-fetch');

let url = "https://raw.githubusercontent.com/feldob/dit355_2020/master/dentists.json";
let settings = { method: "Get" };

fetch(url, settings)
    .then(res => res.json())
    .then((json) => {
        console.log(json);
});
