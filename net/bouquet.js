var cadence = require('cadence/redux')
var http = require('http'), https = require('https')

require('cadence/loops')

function Bouquet () {
    this._servers = []
}

Bouquet.prototype.start = cadence(function (async, object) {
    var protocol = require(object.binder.protocol.replace(/:$/, ''))
    var vargs = [ object.binder.options, object.dispatch(object.binder) ]
    if (Object.keys(vargs[0]).length === 0) vargs.shift()
    var server = protocol.createServer.apply(protocol, vargs)
    server.listen(object.binder.port, async())
    this._servers.push(server)
})

Bouquet.prototype.merge = function (bouquet) {
    this._servers.push.apply(this._servers, bouquet._servers)
    bouquet._servers.length = 0
}

Bouquet.prototype.stop = cadence(function (async) {
    async.forEach(function (server) {
        server.close(async())
    })(this._servers)
})

module.exports = Bouquet
