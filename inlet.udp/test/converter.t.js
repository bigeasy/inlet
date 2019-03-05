require('proof')(3, prove)

function prove (okay) {
    var Converter = require('../converter')
    var f = Converter(false)
    okay(f(Buffer.from('x')), { okay: true, type: 'text', line: 'x' }, 'text')
    var f = Converter(true)
    okay(f(Buffer.from('x')), { okay: false, type: 'text', line: 'x' }, 'json bad')
    okay(f(Buffer.from('"x"')), { okay: true, type: 'json', line: 'x' }, 'json good')
}
