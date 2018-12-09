var cadence = require('cadence')

function Prolific (properties) {
}

Prolific.prototype.connect = cadence(function (async, destructible, inbox, outbox) {
    var sink = require('prolific.resolver').sink
    destructible.durable('inbox', inbox.pump(function (envelope) {
        if (envelope != null) {
            var entry = envelope.line
            sink.json(entry.level, entry.qualifier, entry.label, entry, entry)
        }
    }), 'destructible', async())
})

module.exports = cadence(function (async, destructible, olio) {
    return new Prolific
})
