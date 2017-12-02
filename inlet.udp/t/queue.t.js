require('proof')(2, require('cadence')(prove))

function prove (async, okay) {
    var Destructible = require('destructible')

    var events = require('events')

    var cadence = require('cadence')

    var Olio = require('olio')
    var Mock = require('olio/mock2')

    var Caller = require('conduit/caller')
    var Procedure = require('conduit/procedure')

    var Signal = require('signal')

    var destructible = new Destructible(1000, 'olio/queue')

    destructible.completed.wait(async())

    var signal = new Signal()

    var ee = new events.EventEmitter
    var mock = new Mock(ee)
    var olio = new Olio(ee, function (configuration) {
        configuration.sender([ 'example' ], function () {
            return new Caller
        })
    })

    olio.listen(destructible.monitor('olio'))
    destructible.addDestructor('olio', olio, 'destroy')

    var expect = [{
        value: {
            okay: true, type: 'json', line: { x: '1' }
        },
        message: 'send'
    }, {
        value: {
            okay: false, type: 'text', line: '{'
        },
        message: 'unparsable'
    }]

    mock.initialize([ 'self' ], 0)
    mock.sibling([ 'example' ], 1, function () {
        return new Procedure(cadence(function (async, envelope) {
            var expected = expect.shift()
            okay(envelope, expected.value, expected.message)
            signal.notify()
            return []
        }))
    })

    var Queue = require('../queue')
    var queue = new Queue({
        olio: olio,
        argv: [ 'example' ],
        extractor: '$.x',
        json: true
    })

    cadence(function (async) {
        async(function () {
            Signal.first(destructible.completed, olio.ready, async())
        }, function () {
            queue.push('{"x":"1"}')
            signal.wait(async())
        }, function () {
            queue.push('{')
            signal.wait(async())
        })
    })(destructible.monitor('test'))
}
