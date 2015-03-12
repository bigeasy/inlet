require('../proof')(2, prove)

function prove (assert) {
    var logging = require('../../monitor/logger')
    logging.hush = false
    logging.level = 'info'
    var logger = logging('monitor.levels')
    logger.trace('foo', { bar: 'baz' })
    assert(logging.queue.entries.length, 0, 'caught by level')
    logger.info('foo', { bar: 'baz' })
    assert(logging.queue.entries.length, 1, 'allowed by level')
}
