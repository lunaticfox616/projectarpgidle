const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/growth-ui.js', 'utf8');

function readFunctionSource(name) {
    const start = source.indexOf(`function ${name}(`);
    assert(start >= 0, `${name} must exist`);
    const bodyStart = source.indexOf('{', source.indexOf(')', start));
    let depth = 0;
    for (let index = bodyStart; index < source.length; index += 1) {
        if (source[index] === '{') depth += 1;
        if (source[index] !== '}') continue;
        depth -= 1;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`${name} must have a closing brace`);
}

const listeners = {};
const details = [
    { open: true, dataset: { growthDisclosure: 'craft-bench' }, addEventListener(type, fn) { listeners[type] = fn; } },
    { open: false, dataset: { growthDisclosure: 'unlock-guide' }, addEventListener() {} }
];
const host = { querySelectorAll() { return details; } };
const context = { Object, growthDisclosureState: {} };
vm.createContext(context);
vm.runInContext([
    'growthDisclosureState = {};',
    readFunctionSource('captureGrowthDisclosureState'),
    readFunctionSource('isGrowthDisclosureOpen'),
    readFunctionSource('bindGrowthDisclosureState')
].join('\n'), context, { filename: 'growth-disclosure-state.js' });

context.captureGrowthDisclosureState(host);
assert.strictEqual(context.isGrowthDisclosureOpen('craft-bench'), true,
    '아이템 획득 전 열려 있던 제작대 상태를 기억해야 한다');
assert.strictEqual(context.isGrowthDisclosureOpen('unlock-guide'), false,
    '사용자가 접은 안내도 임의로 다시 열면 안 된다');
context.bindGrowthDisclosureState(host);
details[0].open = false;
listeners.toggle();
assert.strictEqual(context.isGrowthDisclosureOpen('craft-bench'), false,
    '사용자가 직접 접은 뒤의 상태도 다음 렌더에 유지해야 한다');

console.log('smoke-growth-disclosure-state passed');
