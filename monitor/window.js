var Tree = require('bintrees').RBTree

function Window (duration, clock) {
    this.clock = clock || function () { return Date.now() }
    this.duration = duration
    this.count = 0
    this.sum = 0
    this.head = { head: true, value: null }
    this.head.next = this.head.previous = this.head
    this.tree = new Tree(function (a, b) { return a.value - b.value })
}

Window.prototype.sample = function (value) {

    this.count++
    this.sum += value
    var node = {
        when: this.clock(),
        value: value,
        next: this.head.next,
        previous: this.head
    }

    this.head.next = node
    node.next.previous = node

    node = { value: value, count: 1 }

    var found = this.tree.find(node)
    if (found) {
        found.count++
    } else {
        this.tree.insert(node)
    }
}

Window.prototype.__defineGetter__('stats', function () {
    while (this.clock() - this.head.previous.when > this.duration) {
        value = this.head.previous.value
        this.head.previous = this.head.previous.previous
        this.head.previous.next = this.head
        this.count--
        this.sum -= value

        var found = this.tree.find({ value: value })
        if (found.count == 1) this.tree.remove(found)
        else found.count--
    }

    if (this.count == 0) {
        return null
    } else {
        return {
            average: this.sum / this.count,
            min: this.tree.min().value,
            max: this.tree.max().value
        }
    }
})

module.exports = Window
