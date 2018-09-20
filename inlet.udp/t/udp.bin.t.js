require('proof')(1, prove)

function prove (okay, callback) {
    var Destructible = require('destructible')
    var destructible = new Destructible('t/udp.bin.t')

    destructible.completed.wait(callback)

    var bin = require('../udp.bin')

    var cadence = require('cadence')

    var Signal = require('signal')
    var dgram = require('dgram')

    var Mock = require('olio/mock')
    var mock = new Mock

    var program = bin([
        '--json',
        '--id', '$.id',
        '--to', 'other',
        '--bind', 8514
    ], {}, destructible.monitor('spawn'))

    var Procession = require('procession')

    var done = new Signal

    var socket = dgram.createSocket('udp4')

    cadence(function (async) {
        async(function () {
            mock.ready.wait(async())
        }, function () {
            mock.initialize('self', 0)
            mock.sibling('other', 1, cadence(function (async, destructible) {
                var inbox = new Procession, shifter = inbox.shifter()
                cadence(function (async) {
                    async(function () {
                        shifter.dequeue(async())
                    }, function (envelope) {
                        okay(envelope, { okay: true, type: 'json', line: { id: 1 } }, 'sent')
                        done.unlatch()
                    })
                })(destructible.monitor('inbox'))
                destructible.monitor('receiver', function (destructible, callback) {
                    callback(null, { inbox: inbox, outbox: new Procession })
                }, async())
            }))
        }, function () {
            program.ready.wait(async())
        }, function () {
            socket.send('{"id":1', 8514, '127.0.0.1', async())
        }, function () {
            socket.send('{"id":1}', 8514, '127.0.0.1', async())
        }, function () {
            done.wait(async())
        }, function () {
            program.emit('SIGTERM')
            socket.close()
        })
    })(destructible.monitor('run'))
}
