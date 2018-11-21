var cadence = require('cadence')
var Procession = require('procession')

function Consumer () {
    this.queue = new Procession
}

Consumer.prototype.connect = cadence(function (async, destructible, inbox, outbox) {
    destructible.destruct.wait(outbox, 'end')
    destructible.monitor('inbox', inbox.pump(this, function (envelope) {
        this.queue.push(envelope)
    }), 'destructible', async())
})

module.exports = cadence(function (async, destructible, olio) {
    return new Consumer()
})
