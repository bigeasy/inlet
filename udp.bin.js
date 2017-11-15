/*
    ___ usage ___ en_US ___

    usage: olio <socket> [command] <args>


    options:

      -b, --bind <interface:port>

        interface and port to bind to

      -k, --key <method>

        key material for hashing

      -j, --json

        if true, input is parsed as JSON

      --help              display this message

    ___ $ ___ en_US ___

    unknown argument:
        unknown argument: %s

    ___ . ___
 */
require('arguable')(module, require('cadence')(function (async, program) {
    var udp = require('./udp')
    var Caller = require('conduit/caller')
    var Olio = require('olio')

    var olio = new Olio(program, function (constructor) {
        constructor.sender(program.argv, function () {
            return new Caller
        })
    })

    var Destructible = require('destructible')
    var destructible = new Destructible(3000, 'inlet.udp')

    program.on('shutdown', destructible.destroy.bind(destructible))
    destructible.completed.wait(async())

    var finalist = require('finalist')

    async([function () {
        destructible.destroy()
    }], function () {
        finalist(function (callback) {
            destructible.completed.wait(callback)
            olio.ready.wait(callback)
        }, async())
    }, function () {
        var dgram = require('dgram')
        var socket = dgram.createSocket('udp4')
        socket.on('message', function (chunk) { queue.push(chunk) })
        program.ultimate.bind.listen(socket, async())
    }, function () {
        destructible.completed.wait(async())
    })
})
