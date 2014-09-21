var __slice = [].slice
var number = 0
var base = 0
var out = process.stdout

function pad (number) { return ('000000' + number).substring(-7) }

function log (out, context, level, vargs) {
    if (module.exports.hush) return
    if (number == 0) {
        base = Date.now()
    }
    var object = {}
    object.context = context
    object.timestamp = new Date().toISOString()
    object.id = base + '/' + pad(number++)
    object.name = vargs.shift()
    var tags = []
    TAGS: while (vargs.length) {
        switch (typeof vargs[0]) {
        case 'string':
            tags.push.apply(tags, vargs[0].split(/\s*,\s*/))
            break
        case 'object':
            if (!Array.isArray(vargs[0])) break TAGS
            tags.push.apply(tags, vargs[0])
            break
        }
        vargs.shift()
    }
    object.tags = tags
    while (vargs.length) {
        var properties = vargs.shift()
        if (typeof properties == 'object') {
            for (var key in properties) {
                object[key] = properties[key]
            }
        }
    }
    out.write(JSON.stringify(object, function (key, value) {
        if (key == 'tls') return true
        return value
    }) + '\n')
}

module.exports = function (context, stdout) {
    context = context.split(/\./)
    var object = {}
    'fatal error warn info debug trace'.split(/\s+/).forEach(function (level) {
        object[level] = function () { log(stdout || out, context, level, __slice.call(arguments)) }
    })
    return object
}
