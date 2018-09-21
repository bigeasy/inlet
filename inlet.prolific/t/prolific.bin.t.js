require('proof')(1, prove)

function prove (okay, callback) {
    var Destructible = require('destructible')
    var destructible = new Destructible('t/prolific.bin')

    var shuttle = require('foremost')('prolific.shuttle')

    destructible.completed.wait(callback)

    var Mock = require('olio/mock')

    var Procession = require('procession')

    var cadence = require('cadence')

    var Acceptor = require('prolific.acceptor')
    var mock = new Mock

    var bin = require('../prolific.bin')
    var program = bin([], {}, destructible.monitor('bin'))

    cadence(function (async) {
        async(function () {
            mock.ready.wait(async())
        }, function () {
            mock.initialize('self', 0)
            program.ready.wait(async())
        }, function () {
            async(function () {
                var sink = require('prolific.resolver').sink
                var receiver = { inbox: new Procession, outbox: new Procession }
                sink.acceptor = new Acceptor(false, [{
                    path: ".",
                    level: "warn",
                    accept: true
                }])
                sink.queue = {
                    push: function (envelope) {
                        if (envelope != null) {
                            okay(envelope, {
                                path: 'example',
                                level: 3,
                                formatted: [],
                                json: { qualifier: 'example', level: 'error' }
                            }, 'envelope')
                        }
                    }
                }
                mock.sender('udp', 1, receiver)
                receiver.outbox.push({ qualifier: 'example', level: 'debug' })
                receiver.outbox.push({ qualifier: 'example', level: 'error' })
                receiver.outbox.push(null)
            })
        })
    })(destructible.monitor('test'))
}
