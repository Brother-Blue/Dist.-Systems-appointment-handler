// Tutorial for CircuitBreaker https://blog.bearer.sh/build-a-circuit-breaker-in-node-js/
class CircuitBreaker  {
    constructor(request){
        this.request = request
        this.state = "CLOSED"
        this.failureTreshold = 3
        this.failureCount = 0
        this.successThreshold = 2
        this.successCount = 0
        this.timeout = 6000
        this.nextAttempt = Date.now()
    }

    async fire() {
        if (this.state === "OPEN") {
            if (this.nextAttempt <= Date.now()) {
                this.state = "HALF"
            } else {
                throw new Error("Cicruit is currently OPEN")
            }
        }
        try {
            const response = await this.request()
            return this.success(response)
        } catch (err) {
            return this.fail(err)
        }

    }

    status(action) {
        console.table({
            Action: action,
            Timestamp: Date.now(),
            Successes: this.successCount,
            Failures: this.failureCount,
            State: this.state
        })
    }

    success(response) {
        if (this.state === "HALF") {
            this.successCount++
            if(this.successCount > this.successThreshold) {
                this.successCount = 0
                this.state = "CLOSED"
            }
        }
        this.failureCount = 0
        this.status("Success")
        return response
    }

    fail(err) {
        this.failureCount++
        if (this.failureCount >= this.failureTreshold){
            this.state = "OPEN"
            this.nextAttempt = Date.now() + this.timeout
        }
        this.status("Failure")
        return err
    }
}

module.exports = CircuitBreaker