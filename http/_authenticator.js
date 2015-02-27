var crypto = require('crypto'),
    cadence = require('cadence'),
    Cache = require('magazine'),
    uuid = require('node-uuid'),
    middleware = require('inlet/http/middleware')

function Authenticator (binder) {
    this._auth = new Buffer(binder.auth).toString('base64')
    this._magazine = (new Cache).createMagazine()
    this.authorize = this.authenticate.bind(this)
    this.tokenize = this.token.bind(this)
    this.expiration = 1000 * 60 * 60 * 24 // yesterday
}

Authenticator.prototype.allow = function (accessToken) {
    this._magazine.hold(accessToken, true).release()
}

Authenticator.prototype.token = cadence(function (async, request) {
    var authorized =
        request.authorization &&
        request.authorization.scheme == 'Basic' &&
        request.authorization.credentials == this._auth
    if (!authorized) {
        request.raise(401, 'Forbidden')
    }
    async(function () {
        crypto.randomBytes(16, async())
    }, function (bytes) {
        var accessToken = uuid.v4(bytes)
        this.allow(accessToken)
        return { token_type: 'Bearer', access_token: accessToken }
    })
})

Authenticator.prototype.authenticate = function (request) {
    if (!middleware.isBearer(request)) {
        request.raise(401, 'Not Authorized')
    }
    var expired = Date.now() - this.expiration
    this._magazine.purge(function (cartridge) {
        return cartridge.when >= expired
    })
    var token = request.authorization.credentials
    var cartridge = this._magazine.hold(token, false), authorized
    if (authorized = cartridge.value) cartridge.release()
    else cartridge.remove()
    if (!authorized) {
        request.raise(401, 'Not Authorized')
    }
}

module.exports = Authenticator
