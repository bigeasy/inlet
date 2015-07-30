var cadence = require('cadence')
var dispatch = require('dispatch')
var Interrupt = require('interrupt'),
    interrupt = new Interrupt

function Dispatcher (service, logger) {
    this._dispatch = {}
    this._service = service
    this._logger = logger || { info: function () {} }
}

Dispatcher.prototype.dispatch = function (pattern, method) {
    this._dispatch[pattern] = handle(this._service, method).bind(this)
}

Dispatcher.prototype.createDispatcher = function () {
    var dispatcher = dispatch(this._dispatch)
    dispatcher.server = function () {
        return require('connect')()
            .use(require('express-auth-parser'))
            .use(require('body-parser').json())
            .use(dispatcher)
    }
    return dispatcher
}

module.exports = Dispatcher

var catcher = cadence(function (async, object, method, request) {
    object[method](request, async())
})

function handle (object, method) {
    return function (request, response, next) {
        var logger = this._logger

        request.raise = raise
        catcher(object, method, request, function (error, result) {
            delete request.raise
            var body
            if (error) {
                try {
                    interrupt.rescue(function (error) {
                        logger.info('http', {
                            statusCode: error.code,
                            request: {
                                headers: request.headers,
                                url: request.url
                            },
                            response: {
                                statusCode: error.code,
                                data: error.data
                            }
                        })
                        body = new Buffer(JSON.stringify({ message: error.message }))
                        error.context.headers['content-length'] = body.length
                        error.context.headers['content-type'] = 'application/json'
                        response.writeHead(error.context.code,
                                           error.message,
                                           error.context.headers)
                        response.end(body)
                    })(error)
                } catch (error) {
                    next(error)
                }
            } else {
                logger.info('http', {
                    statusCode: 200,
                    request: {
                        headers: request.headers,
                        url: request.url
                    },
                    response: {
                        statusCode: 200,
                        payload: result
                    }
                })
                var headers = {}
                switch (typeof result) {
                case 'function':
                    result(response)
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
                response.writeHead(200, 'OK', headers)
                response.end(body)
            }
        })
    }
}

function raise (code, message, headers) {
    interrupt.panic(new Error, message, { code: code, headers: headers || {} })
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
