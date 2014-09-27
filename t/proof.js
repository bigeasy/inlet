module.exports = require('proof')(function (step) {
    require('../monitor/logger').hush = true
    var exec = require('child_process').exec
    step(function () {
        exec('make -C t/fixtures/certs', step())
    }, function () {
        return {}
    })
})
