const EventEmitter = require('events');

class TestEmitter extends EventEmitter {}

const e = new TestEmitter();
console.log('Has .once:', typeof e.once);
console.log('once result:', e.once('test', () => {}));
