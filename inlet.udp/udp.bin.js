/*
    ___ usage ___ en_US ___

    usage: olio <socket> [command] <args>


    options:

      -b, --bind <interface:port>

        interface and port to bind to

      -t, --to <name>

        name of service to send message to

      -j, --json

        parse message as JSON

      -i, --id <string>

        extractor for id

      --help              display this message

    ___ $ ___ en_US ___

    unknown argument:
        unknown argument: %s

    ___ . ___
 */
require('arguable')(module, function (program, callback) {
    program.required('bind', 'to')
    program.validate(require('arguable/bindable'), 'bind')

    var logger = require('prolific.logger').createLogger('inlet.udp')

    var dgram = require('dgram')

    var Caller = require('conduit/caller')
    var Olio = require('olio')

    var Destructible = require('destructible')
    var destructible = new Destructible('inlet/udp.bin')

    program.on('shutdown', destructible.destroy.bind(destructible))

    var shuttle = require('foremost')('prolific.shuttle')
    shuttle.start(logger)
    destructible.destruct.wait(shuttle, 'close')

    destructible.completed.wait(callback)

    var coalesce = require('extant')

    var Converter = require('./converter')

    var convert = Converter(program.ultimate.json)
    var extract = Function.apply(Function, [].concat(
        '$', Object.keys(global), 'return ' + coalesce(program.ultimate.id, 'Math.random()')
    ))

    var Keyify = require('keyify')

    var delta = require('delta')

    var cadence = require('cadence')

    cadence(function (async) {
        async(function () {
            destructible.monitor('olio', Olio, async())
        }, function (olio) {
            olio.sender(program.ultimate.to, cadence(function (async, destructible) {
                destructible.monitor('caller', Caller, async())
            }), async())
        }, function (sender) {
            var socket = dgram.createSocket('udp4')
            async(function () {
                socket.on('message', function (chunk) {
                    var line = chunk.toString()
                    var converted = convert(line)
                    if (converted.okay) {
                        var key = Keyify.stringify(extract(converted.line))
                        sender.hash(key).sender.outbox.push(converted)
                    } else {
                        logger.error('parse', { line: line })
                    }
                })
                socket.bind({
                    address: program.ultimate.bind.address,
                    port: program.ultimate.bind.port
                }, async())
            }, function () {
                destructible.destruct.wait(socket, 'close')
                delta(destructible.monitor('listen')).ee(socket).on('close')
                program.ready.unlatch()
            })
        })
    })(destructible.monitor('initialize', true))
})
