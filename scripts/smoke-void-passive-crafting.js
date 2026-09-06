const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const voidNode = Object.values(context.PASSIVE_TREE.nodes).find(node => node && node.kind === 'void');
assert.ok(voidNode, 'the passive tree must contain a void passive');

// Normalization must preserve valid rolls and reject foreign/stale ids without caching the tree.
context.testVoidId = voidNode.id;
vm.runInContext(`
    game.voidPassives = { invalid: {stats:[{id:'flatHp',val:1000}]} };
    game.voidPassives[testVoidId] = {stats:[{id:'flatHp',val:'12'},{id:'missing',val:9}],transcendent:{id:'missing'}};
    ensureVoidPassiveState();
`, context);
assert.deepStrictEqual(JSON.parse(vm.runInContext('JSON.stringify(game.voidPassives)', context)), {
    [voidNode.id]: { rarity:'magic', stats:[{id:'flatHp',val:12}], transcendent:null }
});
vm.runInContext('PASSIVE_TREE.nodes[testVoidId].kind="normal";ensureVoidPassiveState();', context);
assert.strictEqual(vm.runInContext('Object.keys(game.voidPassives).length', context), 0);
vm.runInContext('PASSIVE_TREE.nodes[testVoidId].kind="void";', context);

vm.runInContext(`
    game.passives = ['n0', '${voidNode.id}'];
    game.currencies.magicBud = 3;
    game.voidPassives['${voidNode.id}'] = {
        rarity: 'magic',
        stats: [{ id: 'flatHp', val: 999 }, { id: 'crit', val: 999 }],
        transcendent: null
    };
`, context);

const originalRandom = Math.random;
try {
    context.__voidCraftRandom = [0.99, 0, 0, 0, 0];
    vm.runInContext('Math.random = () => __voidCraftRandom.shift() ?? 0;', context);
    vm.runInContext(`applyVoidPassiveCurrency('${voidNode.id}', 'magicBud')`, context);

    const firstRoll = JSON.parse(vm.runInContext(`JSON.stringify(game.voidPassives['${voidNode.id}'])`, context));
    assert.strictEqual(firstRoll.stats.length, 2, 'magic bud must be able to reroll two void-passive lines');
    assert.strictEqual(new Set(firstRoll.stats.map(line => line.id)).size, 2, 'rerolled void-passive lines must not duplicate a stat');
    assert.ok(firstRoll.stats.every(line => line.val !== 999), 'the previous lines must be replaced instead of preserved');
    assert.strictEqual(vm.runInContext('game.currencies.magicBud', context), 2, 'one magic bud must be consumed');

    context.__voidCraftRandom = [0, 0.99, 0.5];
    vm.runInContext(`applyVoidPassiveCurrency('${voidNode.id}', 'magicBud')`, context);
    const secondRoll = JSON.parse(vm.runInContext(`JSON.stringify(game.voidPassives['${voidNode.id}'])`, context));
    assert.strictEqual(secondRoll.stats.length, 1, 'a full two-line void passive must remain eligible for a one-line reroll');
    assert.notDeepStrictEqual(secondRoll.stats, firstRoll.stats, 'repeated use must replace the full previous roll');
    assert.strictEqual(secondRoll.rarity, 'magic', 'a successful reroll must preserve magic rarity');
    assert.strictEqual(vm.runInContext('game.currencies.magicBud', context), 1, 'repeated rerolls must keep consuming exactly one bud');
} finally {
    Math.random = originalRandom;
}

let renderedOverlay = null;
context.document.createElement = () => ({
    id: '', style: {}, dataset: {}, innerHTML: '', onclick: null,
    remove() {}, querySelector: () => null, querySelectorAll: () => []
});
context.document.body.appendChild = element => { renderedOverlay = element; };
vm.runInContext(`openVoidPassiveCraftOverlay('${voidNode.id}')`, context);
assert.ok(renderedOverlay, 'the void-passive crafting overlay must render');
assert.ok(renderedOverlay.innerHTML.includes('마법의 새싹은 현재 옵션을 지우고 공허 옵션 1~2줄을 다시 굴립니다.'), 'the overlay must explain replacement reroll semantics');
const magicBudButtonStart = renderedOverlay.innerHTML.indexOf(`onclick="craftVoidPassiveFromOverlay('${voidNode.id}','magicBud')"`);
assert.ok(magicBudButtonStart >= 0, 'the magic-bud action must render');
const magicBudButton = renderedOverlay.innerHTML.slice(magicBudButtonStart, renderedOverlay.innerHTML.indexOf('>', magicBudButtonStart));
assert.ok(!magicBudButton.includes('disabled'), 'the magic-bud action must stay enabled after a full two-line roll');

// Sweep every normal option through actual random selection, then verify equipped contribution.
const pool = JSON.parse(vm.runInContext('JSON.stringify(VOID_PASSIVE_OPTION_POOL)',context));
assert(pool.length >= 30);
for(let index=0;index<pool.length;index++) {
    context.__voidRoll = [(index+0.1)/pool.length,0.999];
    vm.runInContext('Math.random=()=>__voidRoll.shift() ?? 0',context);
    const roll=JSON.parse(vm.runInContext('JSON.stringify(rollVoidPassiveOption([]))',context));
    assert.equal(roll.id,pool[index].id);
    assert.equal(roll.val,pool[index].max);
    context.__existing=[roll];
    const second=vm.runInContext('rollVoidPassiveOption(__existing)',context);
    assert.notEqual(second.id,roll.id);
}
vm.runInContext('game.voidPassives[testVoidId]={stats:[]};game.passives=[testVoidId]',context);
const beforeAttributes=vm.runInContext('getPlayerStats().strength',context);
vm.runInContext("game.voidPassives[testVoidId].stats=[{id:'strength',val:16}]",context);
assert.equal(vm.runInContext('getPlayerStats().strength',context)-beforeAttributes,16);
assert(pool.find(row=>row.id==='pctDmg').min>=5);
assert(pool.find(row=>row.id==='resPen').max>=4);
console.log('smoke-void-passive-crafting passed');
