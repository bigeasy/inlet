require('proof')(module, require('cadence')(harness))

function harness (async, body, assert) {
    var exec = require('child_process').exec
    async(function () {
        exec('make -C t/fixtures/certs', async())
    }, function () {
        body(assert, async())
    })
}
