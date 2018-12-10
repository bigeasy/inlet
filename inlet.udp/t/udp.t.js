require('proof')(1, prove)

function prove (okay, callback) {
    var Destructible = require('destructible')
    var destructible = new Destructible('t/udp.bin.t')

    destructible.completed.wait(callback)

    var cadence = require('cadence')

    var dgram = require('dgram')

    var Mock = require('olio/mock')

    var Procession = require('procession')

    var socket = dgram.createSocket('udp4')

    var path = require('path')

    cadence(function (async) {
        async(function () {
            destructible.durable('mock', Mock, {
                socket: path.resolve(__dirname, 'socket'),
                children: {
                    udp: {
                        path: path.resolve(__dirname, '..'),
                        workers: 1,
                        properties: {
                            id: function () { return Math.random() },
                            iface: '127.0.0.1',
                            json: true,
                            port: 8514,
                            to: 'consumer'
                        }
                    },
                    consumer: {
                        path: path.resolve(__dirname, 'consumer.js'),
                        workers: 1,
                        properties: {}
                    }
                }
            }, async())
        }, function (children) {
            children.consumer[0].queue.shifter().dequeue(async())
            socket.send('{"id":1', 8514, '127.0.0.1')
            socket.send('{"id":1}', 8514, '127.0.0.1')
        }, function (envelope) {
            okay(envelope, { okay: true, type: 'json', line: { id: 1 } }, 'sent')
            socket.close()
        })
    })(destructible.durable('run'))
}
