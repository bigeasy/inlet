var crypto = require('crypto'),
    cadence = require('cadence/redux'),
    Cache = require('magazine'),
    uuid = require('node-uuid'),
    middleware = require('./middleware')

function Authenticator (binder) {
    this._auth = new Buffer(binder.auth).toString('base64')
    this._magazine = (new Cache).createMagazine()
    this.authorize = this.authenticate.bind(this)
    this.tokenize = this.token.bind(this)
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
        this._magazine.hold(accessToken, true).release()
        return { token_type: 'Bearer', access_token: accessToken }
    })
})

Authenticator.prototype.authenticate = cadence(function (async, request) {
    if (!middleware.isBearer(request)) return false
    var expired = Date.now() - 1000 * 60 * 60 * 24 // yesterday
    this._magazine.purge(function (cartridge) {
        return cartridge.when >= expired
    })
    var token = request.authorization.credentials
    var cartridge = this._magazine.hold(token, false), authorized
    if (authorized = cartridge.value) cartridge.release()
    else cartridge.remove()
    return authorized
})

module.exports = Authenticator
