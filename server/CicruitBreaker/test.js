// Tutorial for CircuitBreaker https://blog.bearer.sh/build-a-circuit-breaker-in-node-js/
const CircuitBreaker = require ('./CircuitBreaker.js')

const unstableRequest = () => {
    return new Promise((resolve, reject) => {
        if (Math.random() > .6){
            resolve({data: "Success"})
        } else {
            reject({data: "Failed"})
        }
    })
}

const breaker = new CircuitBreaker(unstableRequest)

setInterval(() => {
    breaker
        .fire()
        .then(console.log)
        .catch(console.error)
}, 1000)