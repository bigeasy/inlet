require('proof')(1, require('cadence')(prove))

function prove (async, assert) {
    var bin = require('..')
    async(function () {
        bin([ 'test', 'a' ], {}, async())
    }, function (code) {
        assert(code, 0, 'code')
    })
}
