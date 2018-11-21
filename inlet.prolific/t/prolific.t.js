require('proof')(1, prove)

function prove (okay, callback) {
    var Destructible = require('destructible')
    var destructible = new Destructible('t/prolific')

    var shuttle = require('foremost')('prolific.shuttle')

    destructible.completed.wait(callback)

    var Mock = require('olio/mock')

    var Procession = require('procession')

    var cadence = require('cadence')

    var path = require('path')


    cadence(function (async) {
        async(function () {
            destructible.monitor('mock', Mock, {
                socket: path.resolve(__dirname, 'socket'),
                children: {
                    prolific: {
                        path: path.resolve(__dirname, '..'),
                        workers: 1,
                        properties: {}
                    },
                    client: {
                        path: path.resolve(__dirname, 'client.js'),
                        workers: 1,
                        properties: {}
                    }
                }
            }, async())
        }, function (children) {
            var wait = async()
            var sink = require('prolific.resolver').sink
            sink.json = function (level, qualifier, label, entry) {
                okay({
                    level: level,
                    qualifier: qualifier,
                    label: label,
                    entry: entry
                }, {
                    level: 'error',
                    qualifier: 'qualifier',
                    label: 'label',
                    entry: { level: 'error', qualifier: 'qualifier', label: 'label' }
                }, 'prolific')
                wait()
            }
            children.client[0].processes[0].conduit.push({ qualifier: 'qualifier', level: 'error', label: 'label' })
        })
    })(destructible.monitor('test'))
}
