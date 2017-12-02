var cadence = require('cadence')

var Turnstile = require('turnstile')
Turnstile.Queue = require('turnstile/queue')

var Converter = require('./converter')

function Queue (options) {
    this.turnstile = new Turnstile
    this.queue = new Turnstile.Queue(this, '_send', this.turnstile)
    this._olio = options.olio
    this._argv = options.argv
    this._extractor = new Function('$', 'return ' + options.extractor)
    this._converter = Converter(options.json)
}

Queue.prototype._send = cadence(function (callback, envelope) {
    // TODO Load shedding? Maybe crash?
    var parsed = this._converter.call(null, envelope.body)
    var index = parsed.okay
              ? this._extractor.call(null, parsed.line)
              : parsed.line
    this._olio.sender(this._argv, index).invoke(parsed, callback)
})

Queue.prototype.push = function (entry) {
    this.queue.push(entry)
}

module.exports = Queue
