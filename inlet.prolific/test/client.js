var cadence = require('cadence')
var http = require('http')
var delta = require('delta')
var Conduit = require('conduit/conduit')

module.exports = cadence(function (async, destructible, olio) {
    var logger = require('prolific.logger').createLogger('olio.http')
    var Reactor = require('reactor')
    var Caller = require('conduit/caller')
    olio.sender('prolific', cadence(function (async, destructible, inbox, outbox) { return outbox }), async())
})
