require('proof')(3, require('cadence')(prove))

function prove (async, okay) {
    var cadence = require('cadence')
    var Destructible = require('destructible')
    var Signal = require('signal')
    var Olio = require('olio')
    var events = require('events')
    var Mock = require('olio/mock2')
    var Caller = require('conduit/caller')
    var Procedure = require('conduit/procedure')

    var destructible = new Destructible(1000, 'inlet/queue')

    destructible.completed.wait(async())


    var expect = [{
        value: { okay: true, type: 'json', line: { key: 1 } },
        message: 'json'
    }, {
        value: { okay: false, type: 'text', line: '}' },
        message: 'unparsed'
    }]

    var ee = new events.EventEmitter
    var mock = new Mock(ee)
    var olio = new Olio(ee, function (configuration) {
        configuration.sender([ 'example' ], function () {
            return new Caller
        })
    })


    destructible.addDestructor('olio', olio, 'destroy')
    olio.listen(destructible.monitor('olio'))

    mock.initialize([ 'self' ], 0)
    mock.sibling([ 'example' ], 1, function () {
        return new Procedure(function (envelope, callback) {
            var expected = expect.shift()
            okay(envelope, expected.value, expected.message)
            callback(null)
        })
    })


    var Queue = require('../queue')
    var queue = new Queue({
        olio: olio,
        argv: [ 'example' ],
        extractor: 'String($.key)',
        json: true
    })

    cadence(function (async) {
        async(function () {
            Signal.first(destructible.completed, olio.ready, async())
        }, function () {
            queue.push('{"key":1}')
            queue.push('}')
            queue.queue.wait(async())
        }, function () {
            okay(true, 'done')
        })
    })(destructible.monitor('test'))
}
