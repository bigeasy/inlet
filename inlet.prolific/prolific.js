var cadence = require('cadence')

function Prolific (properties) {
}

Prolific.prototype.connect = cadence(function (async, destructible, inbox, outbox) {
    var sink = require('prolific.resolver').sink
    destructible.durable('inbox', inbox.pump(function (envelope) {
        if (envelope != null) {
            sink.json(envelope.level, envelope.qualifier, envelope.label, envelope)
        }
    }), 'destructible', async())
})

module.exports = cadence(function (async, destructible, olio) {
    return new Prolific
})
