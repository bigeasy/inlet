var cadence = require('cadence')
var dispatch = require('dispatch')
var interrupt = require('interrupt').createInterrupter()
var Turnstile = require('turnstile')
var Operation = require('operation')
var Reactor = require('reactor')
var slice = [].slice

function Dispatcher (service, options) {
    options || (options = {})
    this._turnstile = this.turnstile = options.turnstile || new Turnstile({ workers: 24 })
    this._dispatch = {}
    this._service = service
    this._logger = options.logger || function () {}
    this._reactor = new Reactor({ object: this, method: '_respond' }, this._turnstile)
}

Dispatcher.prototype.dispatch = function (pattern, method) {
    this._dispatch[pattern] = handle(this._reactor, new Operation({ object: this._service, method: method }))
}

Dispatcher.prototype.createDispatcher = function () {
    return dispatch(this._dispatch)
}

// TODO Create `inlet.wrapped`.
Dispatcher.prototype.createWrappedDispatcher = function () {
    return require('connect')()
        .use(require('express-auth-parser'))
        .use(require('body-parser').json())
        .use(this.createDispatcher())
}

Dispatcher.prototype._timeout = cadence(function (async, request) {
    console.log('foo', request.url)
    request.raise(503, 'Service Not Available')
})

Dispatcher.prototype._respond = cadence(function (async, status, work) {
    var next = work.next
    var entry = {
        turnstile: {
            waiting: this._turnstile.waiting,
            workers: this._turnstile.workers,
            working: this._turnstile.working
        },
        statusCode: 200,
        request: {
            metthod: work.request.method,
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
            }, interrupt.rescue(function (error) {
                entry.statusCode = error.statusCode
                entry.message = error.message
                var body = new Buffer(JSON.stringify({ message: error.message }))
                error.context.headers['content-length'] = body.length
                error.context.headers['content-type'] = 'application/json'
                work.response.writeHead(error.context.statusCode,
                                        error.message,
                                        error.context.headers)
                work.response.end(body)
                return [ block.break ]
            })])
        }, function (result, headers) {
            headers || (headers = {})
            var body
            switch (typeof result) {
            case 'function':
                // todo: delta on response end.
                result(work.response)
                return
            case 'string':
                body = new Buffer(result)
                break
            default:
                headers['content-type'] = 'application/json'
                body = new Buffer(JSON.stringify(result))
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
        this._logger(entry)
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

function raise (statusCode, message, headers) {
    interrupt.raise(new Error, message || 'Unknown', { statusCode: statusCode, headers: headers || {} })
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
