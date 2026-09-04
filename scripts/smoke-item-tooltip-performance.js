const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const scheduled = new Map();
const idleWork = new Map();
let nextHandle = 1;
let statCalls = 0;

runtime.setTimeout = (callback, delay) => {
    const handle = nextHandle++;
    scheduled.set(handle, { callback, delay });
    return handle;
};
runtime.clearTimeout = handle => scheduled.delete(handle);
runtime.requestIdleCallback = callback => {
    const handle = nextHandle++;
    idleWork.set(handle, callback);
    return handle;
};
runtime.cancelIdleCallback = handle => idleWork.delete(handle);

const classNames = new Set();
const tooltip = {
    style: { display: 'none' },
    innerHTML: '',
    classList: {
        toggle(name, active) {
            if (active) classNames.add(name);
            else classNames.delete(name);
        }
    },
    getBoundingClientRect: () => ({ width: 320, height: 360 })
};
runtime.document.getElementById = id => id === 'item-tooltip-box' ? tooltip : null;

const leftRing = { id: 801, slot: '반지', baseName: '왼쪽 반지', name: '왼쪽 반지', rarity: 'rare', baseStats: [], stats: [] };
const rightRing = { id: 802, slot: '반지', baseName: '오른쪽 반지', name: '오른쪽 반지', rarity: 'rare', baseStats: [], stats: [] };
const candidate = { id: 901, slot: '반지', baseName: '후보 반지', name: '후보 반지', rarity: 'rare', hiddenTier: 3, baseStats: [], stats: [] };
runtime.game.equipment = { 반지1: leftRing, 반지2: rightRing };
runtime.game.inventory = [candidate];
runtime.game.cosmosTwinKeystones = ['stable'];
vm.runInContext('cachedTooltipStats = normalizeUiPlayerStats({ maxHp: 100, dps: 10 })', runtime);

runtime.getPlayerStats = () => {
    statCalls += 1;
    runtime.game.cosmosTwinKeystones = ['preview-mutated'];
    let hp = runtime.game.equipment['반지1'] === candidate ? 130
        : (runtime.game.equipment['반지2'] === candidate ? 120 : 100);
    return { maxHp: hp, dps: 10 };
};

function runScheduledDelay(delay) {
    const entry = Array.from(scheduled.entries()).find(([, value]) => value.delay === delay);
    assert(entry, `expected a ${delay}ms scheduled task`);
    scheduled.delete(entry[0]);
    entry[1].callback();
}

function runNextIdleTask() {
    const entry = idleWork.entries().next().value;
    assert(entry, 'expected queued idle comparison work');
    idleWork.delete(entry[0]);
    entry[1]({ didTimeout: false, timeRemaining: () => 12 });
}

runtime.showItemTooltip({ clientX: 40, clientY: 50 }, 0, false);
assert.strictEqual(statCalls, 0, 'opening an item tooltip must not synchronously recalculate player stats');
assert(!tooltip.innerHTML.includes('착용 시 변화'), 'the immediate tooltip should show item details before comparison work');

runScheduledDelay(100);
assert.strictEqual(statCalls, 0, 'the hover delay must only queue comparison work for an idle slice');
runNextIdleTask();
assert.strictEqual(statCalls, 1, 'each idle slice must evaluate at most one candidate slot');
assert(!tooltip.innerHTML.includes('착용 시 변화'), 'multi-slot comparison should render only after every slot is evaluated');
runNextIdleTask();
assert.strictEqual(statCalls, 2, 'the second ring slot should be evaluated in a separate idle slice');
assert(tooltip.innerHTML.includes('왼쪽 반지 기준 착용 시 변화'));
assert(tooltip.innerHTML.includes('오른쪽 반지 기준 착용 시 변화'));
assert.deepStrictEqual(runtime.game.cosmosTwinKeystones, ['stable'], 'stat previews must restore derived cosmos state');
assert.strictEqual(runtime.game.equipment['반지1'], leftRing, 'the left equipment slot must be restored after preview');
assert.strictEqual(runtime.game.equipment['반지2'], rightRing, 'the right equipment slot must be restored after preview');

runtime.dismissItemTooltipNow();
runtime.showItemTooltip({ clientX: 60, clientY: 70 }, 0, false);
assert.strictEqual(statCalls, 2, 'revisiting the same item and build should reuse the exact cached comparison');
assert(tooltip.innerHTML.includes('왼쪽 반지 기준 착용 시 변화'), 'cached comparison should be visible immediately');

runtime.dismissItemTooltipNow();
const helmet = { id: 902, slot: '투구', baseName: '후보 투구', name: '후보 투구', rarity: 'normal', hiddenTier: 1, baseStats: [], stats: [] };
runtime.game.inventory.push(helmet);
runtime.showItemTooltip({ clientX: 80, clientY: 90 }, 1, false);
runtime.dismissItemTooltipNow();
assert.strictEqual(scheduled.size, 0, 'leaving before the hover delay must cancel pending comparison work');
assert.strictEqual(idleWork.size, 0, 'dismissed tooltips must not leave idle stat work queued');
assert.strictEqual(statCalls, 2, 'a quickly skipped item must never run the expensive stat calculation');

runtime.getPlayerStats = () => {
    statCalls += 1;
    runtime.game.cosmosTwinKeystones = ['preview-mutated'];
    throw new Error('preview failure');
};
runtime.showItemTooltip({ clientX: 100, clientY: 110 }, 1, false);
runScheduledDelay(100);
runNextIdleTask();
assert(tooltip.innerHTML.includes('장비 비교를 표시하지 못했습니다.'), 'comparison failures should remain visible without breaking the item tooltip');
assert.strictEqual(runtime.game.equipment['투구'], undefined, 'a failed preview must remove a temporary empty-slot assignment');
assert.deepStrictEqual(runtime.game.cosmosTwinKeystones, ['stable'], 'a failed preview must also restore derived cosmos state');

console.log('smoke-item-tooltip-performance passed');
