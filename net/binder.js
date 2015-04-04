var url = require('url')

function Binder (location, options) {
    var parsed = url.parse(location)
    this.location = location
    for (var key in parsed) {
        this[key] = parsed[key]
    }
    this.port = +(this.port)
    this.options = options || {}
}

module.exports = Binder
