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

    var sink = require('prolific.resolver').sink

    var Procedure = require('conduit/procedure')

    var Olio = require('olio')

    var cadence = require('cadence')

    cadence(function (async) {
        async(function () {
            destructible.monitor('olio', Olio, cadence(function (async, destructible) {
                async(function () {
                    destructible.monitor('procedure', Procedure, cadence(function (async, envelope) {
                        sink.queue.push(envelope)
                    }), async())
                }, function (procedure) {
                    destructible.destruct.wait(procedure.outbox, 'end')
                    return procedure
                })
            }), async())
        }, function () {
            program.ready.unlatch()
        })
    })(destructible.monitor('initialize', true))
})
