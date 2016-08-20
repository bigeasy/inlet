require('proof/redux')(12, require('cadence')(prove))

function prove (async, assert) {
    var cadence = require('cadence')
    var Dispatcher = require('../dispatcher')
    var UserAgent = require('vizsla')
    var http = require('http')
    var connect = require('connect')

    new Dispatcher({ object: null })

    var now = 0
    function Service () {
        var dispatcher = new Dispatcher({
            object: this,
            Date: { now: function () { return now } },
            turnstiles: 1,
            timeout: 5,
        })
        dispatcher.dispatch('GET /', 'index')
        dispatcher.dispatch('GET /error', 'error')
        dispatcher.dispatch('GET /exception', 'exception')
        dispatcher.dispatch('GET /json', 'json')
        dispatcher.dispatch('GET /hang', 'hang')
        dispatcher.dispatch('GET /response', 'response')
        dispatcher.dispatch('GET /callbacky', 'callbacky')
        dispatcher.dispatch('GET /resources/:id', 'resource')
        this.dispatcher = dispatcher
    }

    Service.prototype.index = cadence(function () {
        return 'Service API'
    })

    Service.prototype.error = cadence(function (async, request) {
        request.raise(401)
    })

    Service.prototype.exception = cadence(function (async, request) {
        throw new Error('exception')
    })

    Service.prototype.json = cadence(function (async) {
        return { key: 'value' }
    })

    Service.prototype.response = cadence(function (async) {
        return Dispatcher.resend(200, { 'content-type': 'text/plain' }, 'responded')
    })

    Service.prototype.resource = cadence(function (async, request, id) {
        return { id: id }
    })

    Service.prototype.callbacky = cadence(function (async) {
        return cadence(function (async, response) {
            response.writeHeader(200, {
                'content-type': 'text/plain',
                'content-length': 2
            })
            response.end('x\n')
        })
    })

    Service.prototype.hang = cadence(function (async, request) {
        async(function () {
            this.wait = async()
            ; (this.notify)()
        }, function () {
            return { hang: true }
        })
    })

    var service = new Service

    var server = http.createServer(service.dispatcher.createWrappedDispatcher())
    var ua = new UserAgent, session = { url: 'http://127.0.0.1:8077' }

    async(function () {
        server.listen(8077, '127.0.0.1', async())
    }, function () {
        ua.fetch(session, async())
    }, function (body) {
        assert(body.toString(), 'Service API', 'get')
        ua.fetch(session, { url: '/error' }, async())
    }, function (body, response) {
        assert(response.statusCode, 401, 'error status code')
        assert(body, { description: 'Unknown' }, 'error message')
        ua.fetch(session, { url: '/exception' }, async())
    }, function (body, response) {
        assert(response.statusCode, 500, 'exception status code')
        ua.fetch(session, { url: '/json' }, async())
    }, function (body, response) {
        assert(body, { key: 'value' }, 'json')
        ua.fetch(session, { url: '/response' }, async())
    }, function (body, response) {
        assert(body.toString(), 'responded', 'json')
        ua.fetch(session, { url: '/callbacky' }, async())
    }, function (body, response) {
        assert(body.toString(), 'x\n', 'callbacky')
        ua.fetch(session, { url: '/resources/123' }, async())
    }, function (body, response) {
        assert(body, { id: '123' }, 'resource id')
        async(function () {
            service.notify = async()
            async(function () {
                ua.fetch(session, { url: '/hang' }, async())
            }, function (body, response) {
                assert(body, { hang: true }, 'delay replied')
            })
            async(function () {
                setTimeout(async(), 250)
            }, function () {
                now += 1000
                ua.fetch(session, { url: '/json' }, async())
                service.wait()
            }, function (body, response) {
                assert(body, { key: 'value' }, 'flush replied')
            })
        })
        async(function () {
            setTimeout(async(), 50)
        }, function () {
            ua.fetch(session, { url: '/json' }, async())
        }, function (body, response) {
            assert(response.statusCode, 503, 'timeout code')
            assert(body, { description: 'Service Not Available' }, 'timeout message')
        })
    }, function (body, response) {
        server.close(async())
    })
}
