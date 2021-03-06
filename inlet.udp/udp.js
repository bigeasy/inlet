var dgram = require('dgram')

var coalesce = require('extant')

var Converter = require('./converter')

var Keyify = require('keyify')

var delta = require('delta')
var cadence = require('cadence')

var logger = require('prolific.logger').createLogger('inlet.udp')

module.exports = cadence(function (async, destructible, olio, properties) {
    var convert = Converter(properties.json)
    var extract = require(properties.extractor)
    async(function () {
        olio.sender(properties.to, cadence(function (async, destructible, inbox, outbox) {
            destructible.destruct.wait(outbox, 'end')
            return outbox
        }), async())
    }, function (sender) {
        var socket = dgram.createSocket('udp4')
        async(function () {
            socket.on('message', function (chunk) {
                var line = chunk.toString()
                var converted = convert(line)
                if (converted.okay) {
                    var key = Keyify.stringify(extract(converted.line))
                    sender.hash(key).conduit.push(converted)
                } else {
                    logger.error('parse', { line: line })
                }
            })
            delta(async()).ee(socket).on('listening')
            socket.bind({ address: properties.iface, port: properties.port })
        }, function () {
            var close = destructible.destruct.wait(socket, 'close')
            socket.on('close', function () {
                destructible.destruct.cancel(close)
            })
            delta(destructible.durable('listen')).ee(socket).on('close')
            return null
        })
    })
})
