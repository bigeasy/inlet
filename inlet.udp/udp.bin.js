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
    var Queue = require('./queue')

    var dgram = require('dgram')

    var Caller = require('conduit/caller')
    var Olio = require('olio')

    var Destructible = require('destructible')

    var olio = new Olio(program, function (constructor) {
        constructor.sender(program.argv, function () {
            return new Caller
        })
    })

    var destructible = new Destructible(3000, 'inlet.udp')
    program.on('shutdown', destructible.destroy.bind(destructible))
    destructible.completed.wait(async())

    async([function () {
        destructible.destroy()
    }], function () {
        olio.listen(destructible.monitor('olio'))
        Signal.first(destructible.completed, olio.ready, async())
    }, function () {
        var socket = dgram.createSocket('udp4')
        async(function () {
            socket.on('message', function (chunk) { queue.push(chunk) })
            program.ultimate.bind.listen(socket, async())
        }, function () {
            destructible.addDestructor('socket', socket, 'close')
            delta(destructible.monitor('listen')).ee(socket).on('close')
        })
    }, function () {
        destructible.completed.wait(async())
    })
})
