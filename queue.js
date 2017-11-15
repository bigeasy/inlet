var Turnstile = require('turnstile')
Turnstile.Queue = require('turnstile/queue')

function Queue (olio, extractor) {
    this.turnstile = new Turnstile
    this.queue = new Turnstile.Queue(this, '_send', this.turnstile)
    this._olio = olio
    this._extractor = new Function('$', 'return ' + extractor)
}

Queue.prototype._send = cadence(function (callback, envelope) {
    // TODO Load shedding? Maybe crash?
    var index = this._extractor.call(null, envelope.body)
    this._olio.sender(this._argv, index).invoke(envelope.body, async())
})

module.exports = Queue
