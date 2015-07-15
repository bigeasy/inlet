var crypto = require('crypto'),
    cadence = require('cadence/redux'),
    Cache = require('magazine'),
    uuid = require('node-uuid')

function Authenticator (auth) {
    this._auth = new Buffer(auth).toString('base64')
    this._magazine = new Cache().createMagazine()
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

Authenticator.prototype.authenticate = function (request) {
    if (!Authenticator.isBearer(request)) {
        request.raise(401, 'Forbidden')
    }
    this._magazine.expire(1000 * 60 * 60 * 24) // yesterday
    var token = request.authorization.credentials
    var cartridge = this._magazine.hold(token, false), authorized
    if (cartridge.value) {
        cartridge.release()
    } else {
        cartridge.remove()
        request.raise(401, 'Forbidden')
    }
}

Authenticator.isBearer = function (request) {
    return request.authorization && request.authorization.scheme == 'Bearer'
}

module.exports = Authenticator
