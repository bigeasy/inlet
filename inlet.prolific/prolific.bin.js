/*
    ___ usage ___ en_US ___

    usage: inlet prolific


    options:

      --help              display this message

    ___ $ ___ en_US ___

    unknown argument:
        unknown argument: %s

    ___ . ___
 */
require('arguable')(module, function (program, callback) {
    var Destructible = require('destructible')
    var destructible = new Destructible('t/prolific.bin')

    destructible.completed.wait(callback)

    program.on('shutdown', destructible.destroy.bind(destructible))

    var logger = require('prolific.logger').createLogger('inlet.prolific')

    var shuttle = require('foremost')('prolific.shuttle')
    shuttle.start(logger)
    destructible.destruct.wait(shuttle, 'close')

    var Acceptor = require('prolific.acceptor')

    var sink = require('prolific.resolver').sink
    sink.acceptor = new Acceptor(true, [])

    var Procession = require('procession')
    var Olio = require('olio')

    var cadence = require('cadence')

    cadence(function (async) {
        async(function () {
            destructible.monitor('olio', Olio, cadence(function (async, destructible) {
                var receiver = { inbox: new Procession, outbox: new Procession }
                receiver.inbox.pump(cadence(function (async, envelope) {
                    if (envelope != null) {
                        var entry = sink.acceptor.acceptByProperties([ envelope ])
                        if (entry != null) {
                            sink.queue.push(entry)
                        }
                    }
                    return []
                }), destructible.monitor('outbox'))
                destructible.destruct.wait(receiver.outbox, 'end')
                return receiver
            }), async())
        }, function () {
            program.ready.unlatch()
        })
    })(destructible.monitor('initialize', true))
})
