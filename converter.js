module.exports = function (json) {
    if (json) {
        return function (buffer) {
            var line = buffer.toString()
            try {
                 return { okay: true, type: 'json', line: JSON.parse(line) }
            } catch (e) {
                 return { okay: false, type: 'text', line: line }
            }
        }
    }
    return function (buffer) {
        return { okay: true, type: 'text', line: buffer.toString() }
    }
}
