require('../proof')(3, prove)

function prove (assert) {
    var Window = require('../../monitor/window')
    var time = 1
    var metric = new Window(6000, function () { return time ++ })
    assert(metric.stats,  null , 'stats')
    metric.sample(1)
    metric.sample(2)
    metric.sample(3)
    assert(metric.stats, { average: 2 }, 'stats')
    time = 6002
    metric.sample(4)
    assert(metric.stats, { average: 4 }, 'stats')
}
