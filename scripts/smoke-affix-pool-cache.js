// 옵션 후보 목록 캐시(2026-10-07, js/passives.js getAvailableMods): 아이템 종류마다 한 번 만든 목록에서 아이템에 이미 있는 줄만
// 뺀다. 캐시를 거친 결과가 새로 만든 목록과 같고, MOD_DB 순서이며, 방어 형태 순서가 다른 베이스는 다른 목록을 받는다.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

const report = json(`(() => {
    const shape = mods => mods.map(mod => mod.id + ':' + (mod.weight ?? 1) + ':' + (mod.compound || []).map(part => part.statId).join('+'));
    const order = new Map(MOD_DB.map((mod, index) => [mod.id, index]));
    let bases = 0, mismatch = [], unordered = [];
    for (const base of BASE_ITEM_DB.filter(row => row && row.slot)) {
        const item = createItemFromBase(base, 'normal', 10);
        item.rarity = 'rare';
        const cached = getAvailableMods(item), again = getAvailableMods(item), fresh = buildAvailableModPool(item).map(row => row.mod);
        if (JSON.stringify(shape(cached)) !== JSON.stringify(shape(fresh)) || JSON.stringify(shape(again)) !== JSON.stringify(shape(fresh))) mismatch.push(base.id);
        if (cached.some((mod, index) => index && order.get(mod.id) < order.get(cached[index - 1].id))) unordered.push(base.id);
        bases++;
    }
    return { bases, mismatch, unordered };
})()`);
assert(report.bases > 250, 'every base is checked');
assert.deepStrictEqual(report.mismatch, [], 'the cached pool equals a freshly built one');
assert.deepStrictEqual(report.unordered, [], 'pools keep MOD_DB order');

// 아이템에 이미 있는 능력치는 빠진다. 복합 줄은 딸린 능력치가 이미 있어도 빠진다.
const taken = json(`(() => {
    const base = BASE_ITEM_DB.find(row => row && row.slot === '갑옷' && (row.baseStats || []).some(stat => stat.id === 'armor'));
    const item = createItemFromBase(base, 'normal', 10);
    item.rarity = 'rare';
    const before = getAvailableMods(item).map(mod => mod.id);
    item.stats = [{ id: 'armorPct', val: 10, tier: 3, sourceModId: 'armorPct' }];
    const after = getAvailableMods(item).map(mod => mod.id);
    item.stats = [];
    return { before, after, cleared: getAvailableMods(item).map(mod => mod.id) };
})()`);
assert(taken.before.includes('armorPct') && taken.before.includes('compoundArmor'), 'an armour base can take armour lines');
assert(!taken.after.includes('armorPct') && !taken.after.includes('compoundArmor'), 'an occupied stat removes plain and compound rows');
assert.deepStrictEqual(taken.cleared, taken.before, 'the shared pool is not changed by one item');

// 방어 형태 순서가 다른 두 베이스(앞 형태가 주 형태)는 서로 다른 목록을 받는다. 데이터에 뒤집힌 베이스가 없어 기본 능력치 순서를 바꿔 본다.
const dual = json(`(() => {
    const base = BASE_ITEM_DB.find(row => row && row.slot === '갑옷'
        && (row.baseStats || []).filter(stat => stat.id === 'armor' || stat.id === 'evasion').length === 2);
    const pool = flip => {
        const item = createItemFromBase(base, 'normal', 10);
        item.rarity = 'rare';
        if (flip) item.baseStats = item.baseStats.slice().reverse();
        return getAvailableMods(item).map(mod => mod.id + ':' + (mod.compound || []).map(part => part.statId).join('+'));
    };
    return { armorFirst: pool(false), evasionFirst: pool(true) };
})()`);
assert(dual.armorFirst.includes('armor:evasion') && !dual.armorFirst.some(row => row.startsWith('evasion:')), 'armour-first base rolls armour rows with an evasion part');
assert(dual.evasionFirst.includes('evasion:armor') && !dual.evasionFirst.some(row => row.startsWith('armor:')), 'evasion-first base rolls evasion rows with an armour part');
console.log(`affix pool cache: ${report.bases} bases match fresh pools in MOD_DB order, occupied stats leave the shared pool alone, dual defence order kept apart: OK`);
