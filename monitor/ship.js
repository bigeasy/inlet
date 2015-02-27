var cadence = require('cadence/redux')
var UserAgent = require('../http/ua')
var Binder = require('../net/binder')
var url = require('url')
var ok = require('assert').ok

function Sender (url, pems) {
    var binder = this._binder = new Binder(url, pems)
    var $ = /^\/(?:bulk|inputs)\/([^\/]+)/.exec(binder.pathname)
    this._token = $[1]
    this._ua = new UserAgent(false)
}

Sender.prototype.send = cadence(function (async, bulk, tags, messages) {
    async(function () {
        var message = Array.isArray(messages) ? messages.join('\n') : messages
        this._ua.fetch(this._binder, {
            url: (bulk ? '/bulk/' : '/inputs/') + this._token,
            headers: {
                'content-type': 'text/plain',
                'X-LOGGLY-TAG': tags.join(',')
            },
            payload: new Buffer(message)
        }, async())
    })
})

module.exports = Sender
