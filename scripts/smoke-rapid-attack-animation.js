const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/canvas-battlefield.js', 'utf8');

function readFunctionSource(name) {
    const start = source.indexOf(`function ${name}(`);
    assert(start >= 0, `${name} must exist`);
    let depth = 0;
    for (let index = source.indexOf('{', start); index < source.length; index++) {
        if (source[index] === '{') depth += 1;
        if (source[index] !== '}') continue;
        depth -= 1;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`${name} source boundary not found`);
}

const context = { Number, Math };
vm.createContext(context);
vm.runInContext(readFunctionSource('selectPlayerSwingEffects'), context, { filename: 'rapid-attack-animation.js' });

const rapid = context.selectPlayerSwingEffects([
    { id: 'expired', type: 'playerSwing', start: 400, duration: 400 },
    { id: 'older-active', type: 'playerSwing', start: 700, duration: 400 },
    { id: 'unrelated', type: 'hit', start: 900, duration: 400 },
    { id: 'newest-active', type: 'playerSwing', start: 950, duration: 400 },
    { id: 'future', type: 'playerSwing', start: 1100, duration: 400 }
], 1000);

assert.strictEqual(rapid.latest.id, 'newest-active', 'combat event handling must keep using the newest active swing');
assert.strictEqual(rapid.frame.id, 'older-active', 'overlapping rapid attacks must render the swing closest to its ending frame');

const single = context.selectPlayerSwingEffects([
    { id: 'single', type: 'playerSwing', start: 900, duration: 400 }
], 1000);
assert.strictEqual(single.latest.id, 'single', 'a normal non-overlapping attack must remain the active event');
assert.strictEqual(single.frame.id, 'single', 'a normal non-overlapping attack must preserve its own animation progress');

const slowedVisual = context.selectPlayerSwingEffects([
    { id: 'elementalist', type: 'playerSwing', start: 1000, duration: 400 }
], 1450, 1.4);
assert.strictEqual(slowedVisual.frame.id, 'elementalist', 'a slower hero visual must retain its follow-through without delaying combat damage');

const empty = context.selectPlayerSwingEffects([], 1000);
assert.strictEqual(empty.latest, null, 'no swing must produce no latest combat event');
assert.strictEqual(empty.frame, null, 'no swing must produce no animation frame source');

console.log('smoke-rapid-attack-animation passed');
