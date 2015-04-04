var cadence = require('cadence/redux')
var url = require('url')
var ok = require('assert').ok
var assert = require('assert')
var logger = require('../monitor/logger')('http.ua')
var Binder = require('../net/binder')
var typer = require('media-typer')
var accum = require('accum')
var Window = require('../monitor/window')
var __slice = [].slice

require('cadence/ee')

function UserAgent (log) {
    this._log = arguments.length == 0 ? true : log
    this._tokens = {}
}

UserAgent.durations = {
    1: new Window(60000),
    5: new Window(300000),
    15: new Window(900000)
}

function collectAverages (time) {
    for (var key in UserAgent.durations) {
       UserAgent.durations[key].sample(time)
    }
}

UserAgent.prototype.fetch = cadence(function (async) {
    var request = {
        options: { headers: {} }
    }

    function override (object) {
        if (Array.isArray(object)) {
            object.forEach(override)
        } else {
            if (object instanceof Binder) {
                object = {
                    url: object.location,
                    ca: object.options.ca,
                    cert: object.options.cert,
                    key: object.options.key
                }
            }
            for (var key in object) {
                if (key == 'url') {
                    if (request.options.url) {
                        request.options.url = url.resolve(request.options.url, object.url)
                    } else {
                        request.options[key] = object[key]
                        request.baseUrl = url.parse(object.url)
                    }
                } else if (key == 'headers') {
                    for (var header in object.headers) {
                        request.options.headers[header.toLowerCase()] = object.headers[header]
                    }
                } else if (/^(context|payload|grant|token|timeout)$/.test(key)) {
                    request[key] = object[key]
                } else {
                    request.options[key] = object[key]
                }
            }
        }
    }

    function log (name, object) {
        if (this._log) {
            logger.debug(name, object, request.context || {})
        }
    }

    __slice.call(arguments, 1).forEach(override)
    if (!request.options.method) {
        request.options.method = request.payload ? 'POST' : 'GET'
    }
    if (request.options.method == 'POST' && !request.options.headers['content-type']) {
        request.options.headers['content-type'] = 'application/json'
    }
    request.options.headers['accept'] = 'application/json'
    request.url = url.parse(request.options.url)

    request.options.hostname = request.url.hostname
    request.options.port = request.url.port
    request.options.path = url.format({
        pathname: request.url.pathname,
        search: request.url.search,
        hash: request.url.hash
    })

    request.key = request.url.hostname + ':' + request.url.port

    if (request.grant == 'cc') {
        request.token = this._tokens[request.key]
    }

    async(function () {
        if (request.grant == 'cc' && !request.token) {
            assert.ok(request.baseUrl.auth)
            async(function () {
                this.fetch({
                    url: url.format(request.url),
                    ca: request.options.ca
                }, {
                    url: '/token',
                    headers: {
                        authorization: 'Basic ' + new Buffer(request.baseUrl.auth).toString('base64')
                    },
                    payload: {
                        grant_type: 'client_credentials'
                    }
                }, async())
            }, function (body, response) {
                if (body.token_type == 'Bearer' && body.access_token) {
                    request.token = this._tokens[request.key] = body.access_token
                }
            })
        } else {
            return [ null, { statusCode: 200 } ]
        }
    }, function (body, response) {
        if (Math.floor(response.statusCode / 100) != 2) return
        var http, options = {}
        if (request.token) {
            request.options.headers.authorization = 'Bearer ' + request.token
        }
        for (var key in request.options) {
            if (key == 'ca') {
                options[key] = true
            } else {
                options[key] = request.options[key]
            }
        }
        log.call(this, 'request', {
            url: request.url,
            options: options,
            sent: request.payload
        })
        if (request.url.protocol == 'https:') {
            http = require('https')
        } else {
            http = require('http')
        }
        http.globalAgent.maxSockets = 5000
        var payload = request.payload
        if (payload && !Buffer.isBuffer(payload)) {
            payload = new Buffer(JSON.stringify(payload))
        }
        if (payload) {
            request.options.headers['content-length'] = payload.length
        }

        var stopwatch = Date.now()
        var fetch = async([function () {
            var client = http.request(request.options)
            async.ee(client).end('response').error()
            if (payload) {
                client.write(payload)
            }
            if (request.timeout) {
                client.setTimeout(request.timeout, function () {
                    client.abort()
                })
            }
            client.end()
        }, function (error) {
            collectAverages(Date.now() - stopwatch)
            var body = new Buffer(JSON.stringify({ message: error.message, errno: error.code }))
            var response = {
                statusCode: 599,
                errno: error.code,
                okay: false,
                headers: {
                    'content-length': body.length,
                    'content-type': 'application/json'
                }
            }
            log.call(this, 'response', {
                status: 'exceptional',
                options: options,
                sent: request.payload,
                received: JSON.parse(body.toString()),
                statusCode: response.statusCode,
                headers: response.headers
            })
            return [ fetch, JSON.parse(body.toString()), response, body ]
        }], function (response) {
            var chunks = []
            async(function () {
                async.ee(response)
                     .on('data', function (chunk) {
                        chunks.push(chunk)
                      })
                     .end('end')
                     .error()
            }, function () {
                var body = Buffer.concat(chunks)
                collectAverages(Date.now() - stopwatch)
                var parsed = body
                var display = null
                var type = typer.parse(response.headers['content-type'] || 'application/octet-stream')
                switch (type.type + '/' + type.subtype) {
                case 'application/json':
                    try {
                        display = parsed = JSON.parse(body.toString())
                    } catch (e) {
                        display = parsed = body.toString()
                        log.call(this, 'unparsable', { toString: display })
                    }
                    break
                case 'text/html':
                case 'text/plain':
                    display = body.toString()
                    break
                }
                response.okay = Math.floor(response.statusCode / 100) == 2
                log.call(this, 'response', {
                    status: 'responded',
                    options: options,
                    sent: request.payload,
                    received: display,
                    statusCode: response.statusCode,
                    headers: response.headers
                })
                if (request.grant == 'cc' && response.statusCode == 401) {
                    delete this._tokens[request.key]
                }
                return [ fetch, parsed, response, body ]
            })
        })()
    })
})

module.exports = UserAgent
