require('proof')(1, prove)

function prove (okay, callback) {
    var Destructible = require('destructible')
    var destructible = new Destructible('t/prolific.bin')

    var shuttle = require('foremost')('prolific.shuttle')

    destructible.completed.wait(callback)

    var Mock = require('olio/mock')

    var Procession = require('procession')

    var cadence = require('cadence')

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
                var receiver = { inbox: new Procession, outbox: new Procession }
                require('prolific.resolver').sink.queue = {
                    push: function (envelope) {
                        if (envelope != null) {
                            okay(envelope, { a: 1 }, 'envelope')
                        }
                    }
                }
                mock.sender('udp', 1, receiver)
                receiver.outbox.push({ a: 1 })
                receiver.outbox.push(null)
            })
        })
    })(destructible.monitor('test'))
}
