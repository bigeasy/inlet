require('proof')(1, prove)

function prove (okay, callback) {
    var Destructible = require('destructible')
    var destructible = new Destructible('t/prolific.bin')

    var shuttle = require('foremost')('prolific.shuttle')

    destructible.completed.wait(callback)

    var Mock = require('olio/mock')

    var Caller = require('conduit/caller')

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
            destructible.monitor('caller', Caller, async())
        }, function (caller) {
            async(function () {
                mock.sender('udp', 1, caller)
                require('prolific.resolver').sink.queue = {
                    push: function (envelope) {
                        okay(envelope, { a: 1 }, 'envelope')
                    }
                }
                caller.invoke({ a: 1 }, async())
            }, function () {
                caller.outbox.push(null)
                caller.inbox.push(null)
                mock.sender('udp', 1, caller)
            })
        })
    })(destructible.monitor('test'))
}
