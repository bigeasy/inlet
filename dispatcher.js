var cadence = require('cadence')
var dispatch = require('dispatch')
var interrupt = require('interrupt').createInterrupter('bigeasy.inlet')
var Operation = require('operation')
var Reactor = require('reactor')
var rescue = require('rescue')
var delta = require('delta')
var slice = [].slice

function Dispatcher (options) {
    options.object || (options = { object: options })
    this._dispatch = {}
    this._service = options.object
    this._logger = options.logger || function () {}
    this._reactor = new Reactor({
        operation: { object: this, method: '_respond' },
        Date: options.Date,
        // TODO Remove for 2.0.
        turnstiles: options.turnstiles || options.workers || 24,
        timeout: options.timeout
    })
    this.turnstile = this._reactor.turnstile
}

Dispatcher.prototype.dispatch = function (pattern, method) {
    this._dispatch[pattern] = handle(this._reactor, new Operation({ object: this._service, method: method }))
}

Dispatcher.prototype.createDispatcher = function () {
    return dispatch(this._dispatch)
}

Dispatcher.prototype.createWrappedDispatcher = function () {
    return require('connect')()
        .use(require('express-auth-parser'))
// TODO Configurable.
        .use(require('body-parser').urlencoded({ extended: false, limit: '64mb' }))
        .use(require('body-parser').json({ limit: '64mb' }))
        .use(this.createDispatcher())
}

Dispatcher.prototype._timeout = cadence(function (async, request) {
    request.raise(503, 'Service Not Available')
})

Dispatcher.prototype._respond = cadence(function (async, status, work) {
    var next = work.next
    var entry = {
        turnstile: this.turnstile.health,
        statusCode: 200,
        request: {
            method: work.request.method,
            header: work.request.headers,
            url: work.request.url
        }
    }

    work.request.raise = raise

    if (status.timedout) {
        work.operation = new Operation({ object: this, method: '_timeout' })
    }

    var block = async([function () {
        async(function () {
            async([function () {
                work.operation.apply([ work.request ].concat(work.vargs, async()))
            }, function (error) {
                for (;;) {
                    try {
                        return rescue(/^bigeasy.inlet#http$/m, function (error) {
                            var statusCode = entry.statusCode = error.statusCode
                            var description = entry.description = error.description
                            var headers = error.headers
                            var body = new Buffer(JSON.stringify({ description: description }) + '\n')
                            headers['content-length'] = body.length
                            headers['content-type'] = 'application/json'
                            work.response.writeHead(statusCode, description, headers)
                            work.response.end(body)
                            return [ block.break ]
                        })(error)
                    } catch (ignore) {
                        if (
                            typeof error == 'number' &&
                            Number.isInteger(error) &&
                            Math.floor(error / 100) <= 5 &&
                            Math.floor(error / 100) >= 3
                        ) {
                            error = { statusCode: error }
                        } else if (typeof error == 'string') {
                            error = { statusCode: 307, location: error }
                        }
                        if (
                            typeof error == 'object' &&
                            typeof error.statusCode == 'number' &&
                            Number.isInteger(error.statusCode) &&
                            Math.floor(error.statusCode / 100) <= 5 &&
                            Math.floor(error.statusCode / 100) >= 3
                        ) {
                            var properties = createProperties(error)
                            if (error.location) {
                                properties.headers.location = error.location
                            }
                            error = interrupt({ name: 'http', properties: properties })
                        } else {
                            throw error
                        }
                    }
                }
            }])
        }, function (result, headers) {
            headers || (headers = {})
            var body
            switch (typeof result) {
            case 'function':
                async(function () {
                    delta(async()).ee(work.response).on('finish')
                    if (result.length == 2) {
                        result.call(work.operation.object, work.response, async())
                    } else {
                        result.call(work.operation.object, work.response)
                    }
                }, function () {
                    return []
                })
                return
            case 'string':
                body = new Buffer(result)
                break
            default:
                headers['content-type'] = 'application/json'
                body = new Buffer(JSON.stringify(result) + '\n')
                break
            }
            headers['content-length'] = body.length
            work.response.writeHead(200, 'OK', headers)
            work.response.end(body)
        })
    }, function (error) {
        entry.statusCode = 0
        entry.stack = error.stack
        next(error)
    }], function () {
        this._logger('info', 'request', entry)
        return [ block.break ]
    })()
})

module.exports = Dispatcher

function handle (reactor, operation) {
    return function (request, response, next) {
        var vargs = slice.call(arguments, 3)
        reactor.push({
            operation: operation,
            request: request,
            response: response,
            vargs: vargs,
            next: next
        })
    }
}

function createProperties (properties) {
    return {
        statusCode: properties.statusCode,
        headers: properties.headers || {},
        description: properties.description || 'Unknown'
    }
}

function raise (statusCode, description, headers) {
    throw interrupt({
        name: 'http',
        properties: createProperties({
            statusCode: statusCode,
            description: description,
            headers: headers
        })
    })
}

Dispatcher.resend = function (statusCode, headers, body) {
    return function (response) {
        var h = {
            'content-type': headers['content-type'],
            'content-length': body.length
        }
        response.writeHeader(statusCode, h)
        response.end(body)
    }
}
