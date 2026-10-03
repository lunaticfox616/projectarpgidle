// 코어(장비창 왼쪽 위 코어 칸, 예전 코어 큐브): 굴림 · 정규화 · 능력치 · 장착 교체 · 버리기 · 루프 초기화 · 코어 칸 표시.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const nodes = [];
const context = buildGameRuntime({}, null, {
    getElementById: id => nodes.find(node => node.id === id && !node.removed) || null,
    body: { append(node) { node.remove = () => { node.removed = true; }; nodes.push(node); } }
});
const run = source => vm.runInContext(source, context);
const plain = source => JSON.parse(run(`JSON.stringify(${source})`));

// Rolls: four distinct known lines, values inside their ranges, fresh unique ids.
const pool = plain('CORE_OPTION_POOL');
for (let i = 0; i < 200; i++) {
    const core = plain('coreItems.roll()');
    assert.strictEqual(core.lines.length, 4);
    assert.strictEqual(new Set(core.lines.map(line => line.id)).size, 4, 'lines are distinct');
    for (const line of core.lines) {
        const def = pool.find(row => row.id === line.id);
        assert(def && line.value >= def.min && line.value <= def.max, `${line.id} ${line.value} inside its range`);
        if (def.extraMin) assert(line.extraValue >= def.extraMin && line.extraValue <= def.extraMax);
    }
    assert.deepStrictEqual(plain(`coreItems.normalizeCore(${JSON.stringify(core)})`), core, 'a rolled core is already normalized');
}
const ids = plain('[coreItems.roll().id, coreItems.roll().id]');
assert.notStrictEqual(ids[0], ids[1], 'every core gets a new id');

// Stats: only the equipped core counts; paired lines add both stats.
run(`game.cores = { equipped: null, owned: [
    { id: 9001, name: 'x', lines: [{ id: 'pct_dmg', value: 20 }, { id: 'summon_crit', value: 5 }] },
    { id: 9002, name: 'y', lines: [{ id: 'life_pct', value: 10 }] }] };
    game.cores = coreItems.normalize(game.cores);`);
assert.deepStrictEqual(plain('coreItems.stats()'), [], 'stored cores add nothing');
assert(run('coreItems.equip(9001)'));
assert.deepStrictEqual(plain('coreItems.stats()').map(row => [row.id, row.val]), [['pctDmg', 20], ['summonCrit', 5], ['summonCritDmg', 20]]);
assert(run('coreItems.equip(9002)'), 'equipping swaps the worn core back into the store');
assert.deepStrictEqual(plain('game.cores.owned.map(core => core.id)'), [9001]);
assert.strictEqual(run('coreItems.equip(1234)'), false, 'unknown ids change nothing');
assert(run('coreItems.unequip()'));
assert.strictEqual(run('game.cores.equipped'), null);
assert(run('coreItems.discard(9002)'));
assert.deepStrictEqual(plain('game.cores.owned.map(core => core.id)'), [9001]);

// Normalization is idempotent and drops duplicates, unknown lines and junk.
const messy = { equipped: { id: 7, lines: [{ id: 'crit', value: 99 }, { id: 'crit', value: 3 }] },
    owned: [{ id: 7, lines: [{ id: 'crit', value: 3 }] }, { id: 8, lines: [] }, 'junk', { id: 9, lines: [{ id: 'dot', value: '12' }] }] };
const once = plain(`coreItems.normalize(${JSON.stringify(messy)})`);
assert.deepStrictEqual(once.equipped.lines, [{ id: 'crit', value: 7 }]);
assert.deepStrictEqual(once.owned.map(core => core.id), [9], 'duplicate ids and empty cores are dropped');
assert.deepStrictEqual(plain(`coreItems.normalize(${JSON.stringify(once)})`), once);

// The loop transition empties the core slot and store.
run('coreItems.resetForLoop()');
assert.deepStrictEqual(plain('game.cores'), { equipped: null, owned: [] });

// Paperdoll card: hidden before the unlock, then the top-left core slot opens the store dialog.
assert.strictEqual(run('coreItemsUi.slotHtml()'), '');
run(`game.contentProgression.inherited.push('cube'); contentProgression.sync(game);
    game.cores.owned.push(coreItems.roll()); coreItems.equip(game.cores.owned[0].id);`);
const card = run('coreItemsUi.slotHtml()');
assert(card.includes('slot-코어') && card.includes('의 코어') && card.includes('보관 0/12'), 'the card shows the worn core and store count');
run('coreItemsUi.open()');
const dialog = nodes.find(node => node.id === 'core-item-overlay' && !node.removed);
assert(dialog && dialog.innerHTML.includes('장착 중') && dialog.innerHTML.includes('coreItemsUi.unequip()'), 'the dialog lists the worn core');
console.log('core items: rolls, normalization, stats, swaps, loop reset and core slot: OK');
