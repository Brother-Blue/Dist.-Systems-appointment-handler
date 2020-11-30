const fetch = require('node-fetch');

//Code snippet found here: https://dev.to/isalevine/three-ways-to-retrieve-json-from-the-web-using-node-js-3c88

let url = "https://raw.githubusercontent.com/feldob/dit355_2020/master/dentists.json";
let settings = { method: "Get" };

fetch(url, settings)
    .then(res => res.json())
    .then((json) => {
        console.log(json);
});
