const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
vm.runInContext('this.ledger = craftingResultLedger;', context);

const item = {
    id: 71001,
    name: '희귀한 검',
    baseName: '검',
    rarity: 'rare',
    slot: '무기',
    quality: 0,
    stats: [{ id: 'flatDmg', statName: '물리 피해', val: 10, tier: 5 }],
    baseStats: [{ id: 'flatDmg', statName: '기본 피해', val: 5 }]
};
const token = context.ledger.begin(item, { currencyKey: 'deepWhetstone', actionKey: 'deepWhetstone' });
item.quality = 1;
item.stats[0].val = 12;
item.stats.push({ id: 'crit', statName: '치명타 확률', val: 3, tier: 7 });
const result = context.ledger.commit(token, item);

assert.strictEqual(result.before.quality, 0, 'before snapshot must remain immutable after crafting');
assert.strictEqual(result.before.stats[0].val, 10, 'before affix value must not follow the live item mutation');
assert.strictEqual(result.after.quality, 1, 'after snapshot must capture the completed craft');
assert.strictEqual(result.after.stats.length, 2, 'after snapshot must include newly added affixes');
assert.strictEqual(context.ledger.getForItem(item), result, 'the current crafted item should expose its latest result');
assert.strictEqual(context.ledger.getForItem({ ...item }), null, 'a different item object must not inherit another item result');

item.quality = 2;
assert.strictEqual(context.ledger.getForItem(item), null, 'a later unrecorded mutation must invalidate stale comparison data');
context.ledger.clear();
assert.strictEqual(context.ledger.getForItem(item), null, 'clearing the runtime ledger must discard the last result');

Object.assign(item, JSON.parse(JSON.stringify(result.before)));
const uiToken = context.ledger.begin(item, { currencyKey: 'deepWhetstone', actionKey: 'deepWhetstone' });
Object.assign(item, JSON.parse(JSON.stringify(result.after)));
context.ledger.commit(uiToken, item);
context.testItem = item;
vm.runInContext(`game.inventory=[testItem]; game.currencies.deepWhetstone=1;
    game.contentProgression.inherited=['craft']; selectForCrafting(testItem.id,false);`, context);

const html = context.craftingResultUi.getLedgerHtml(item);
assert(html.includes('품질 0% → 1%'), 'result UI must show the exact before/after quality change');
assert(html.includes('물리 피해 +10 T5') && html.includes('물리 피해 +12 T5'), 'changed affix values must show both sides');
assert(html.includes('치명타 확률 +3 T7'), 'new affixes must be visible in the result UI');
assert(html.includes('심층 숫돌 다시 사용 · 1'), 'repeat action must name the actual currency and remaining amount');

Promise.resolve(context.craftingResultUi.repeat()).then(() => {
    assert.strictEqual(vm.runInContext('game.currencies.deepWhetstone',context), 0, 'repeat consumes the actual crafting currency');
    assert.strictEqual(item.quality, 2, 'repeat performs the actual quality craft');
    console.log('smoke-crafting-result-ledger passed');
}).catch(error => {
    console.error(error);
    process.exitCode = 1;
});
