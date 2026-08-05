const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
    console,
    window: {},
    globalThis: null
};
context.globalThis = context;
context.window.window = context.window;
context.window.globalThis = context.window;
context.window.__runtimeFallbackQueues = {};
context.window.safeExposeGlobals = map => Object.assign(context.window, map);
context.safeExposeGlobals = context.window.safeExposeGlobals;
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/utils.js', 'utf8'), context, { filename: 'js/utils.js' });

const first = context.window.createEmptyStatBucket();
const second = context.window.createEmptyStatBucket();
context.window.addStatToBucket(first, 'maxResAll', 5);
context.window.addStatToBucket(first, 'maxResF', 2);
context.window.addStatToBucket(second, 'maxResAll', 1);

assert.strictEqual(first.maxResAll, 5, 'shared maximum resistance must have a finite dedicated bucket');
assert.strictEqual(first.maxResF, 2, 'shared maximum resistance must not be copied into element-specific storage');
assert.strictEqual(first.maxResC, 0);
assert.strictEqual(first.maxResL, 0);

const buckets = [first, second];
const shared = buckets.reduce((sum, bucket) => sum + bucket.maxResAll, 0);
const fire = 75 + shared + buckets.reduce((sum, bucket) => sum + bucket.maxResF, 0);
const cold = 75 + shared + buckets.reduce((sum, bucket) => sum + bucket.maxResC, 0);
const lightning = 75 + shared + buckets.reduce((sum, bucket) => sum + bucket.maxResL, 0);

assert.strictEqual(fire, 83);
assert.strictEqual(cold, 81);
assert.strictEqual(lightning, 81);
assert.ok([shared, fire, cold, lightning].every(Number.isFinite), 'maximum resistance totals must stay finite');

console.log('smoke-max-resistance-stats passed');
