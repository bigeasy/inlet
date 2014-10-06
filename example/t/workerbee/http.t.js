var proof = require('proof'),
    cadence = require('cadence'),
    logger = require('inlet/monitor/logger'),
    Pseudo = require('inlet/http/pseudo'),
    Binder = require('inlet/net/binder'),
    Bouquet = require('inlet/net/bouquet'),
    UserAgent = require('inlet/http/ua'),
    WorkerBee = require('../../index.js')

proof(1, cadence(function(async, assert) {
    var binder = new Binder('http://127.0.0.1:3000'),
        workerbee = new WorkerBee(binder),
        bouquet = new Bouquet(),
        ua = new UserAgent()

    logger.hush = true

    async(function() {
        bouquet.start(workerbee, async())
    }, function(body) {
        ua.fetch(workerbee.binder, { url: '/' }, async())
    }, function(body) {
        assert(body.toString(), 'Hello from WorkerBee', 'root')
    }, function() {
      bouquet.stop(async())
    })
}))
