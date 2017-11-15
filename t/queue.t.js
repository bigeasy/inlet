require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var Olio = require('olio')
    var Mock = require('olio/mock2')
    var Caller = require('conduit/caller')
    var olio = new Olio(mock, function (configuration) {
        configuration.sender([ 'example' ], function () {
            return Caller
        })
    })
    var Queue = require('../queue')
    async(function () {
    }, function () {
    })
}
