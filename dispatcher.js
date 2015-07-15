var dispatch = require('dispatch')
var Interrupt = require('interrupt'),
    interrupt = new Interrupt
var slice = [].slice

function HTTPError (code, message, headers) {
    this.code = code
    this.message = message
    this.headers = headers || {}
}

function Dispatcher (service, logger) {
    this._dispatch = {}
    this._service = service
    this._logger = logger || { info: function () {} }
}

Dispatcher.prototype.dispatch = function (pattern, method) {
    this._dispatch[pattern] = handle(this._service, method).bind(this)
}

Dispatcher.prototype.createDispatcher = function () {
    return dispatch(this._dispatch)
}

module.exports = Dispatcher

function handle (object, method) {
    return function () {
        var vargs = slice.call(arguments)
        var request = vargs.shift(),
            response = vargs.shift(),
            next = vargs.shift(),
            logger = this._logger

        request.raise = function (code, message, headers) {
            interrupt.panic(new Error, message, { code: code, headers: headers })
        }

        object[method](request, function (error, result) {
            var body
            if (error) {
                // if (!!newrelic) newrelic.noticeError(error, {})
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
                        error.headers['content-length'] = body.length
                        response.writeHead(error.code, error.message, error.headers)
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
                switch (typeof result) {
                case 'function':
                    result(response)
                    return
                case 'string':
                    body = new Buffer(result)
                    break
                default:
                    body = new Buffer(JSON.stringify(result))
                    break
                }
                response.writeHead(200, 'OK', { 'content-length': body.length })
                response.end(body)
            }
        })
    }
}
