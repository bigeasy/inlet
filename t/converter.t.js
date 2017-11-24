require('proof')(3, prove)

function prove (okay) {
    var Converter = require('../converter')
    var json = Converter(true)
    okay(json('{'), { okay: false, type: 'text', line: '{' }, 'bad json')
    okay(json('{}'), { okay: true, type: 'json', line: {} }, 'json')
    var text = Converter(false)
    okay(text('{}'), { okay: true, type: 'text', line: '{}' }, 'text')
}
