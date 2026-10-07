// 접두 보존, 접미 보존(2026-10-08, 드랍 풀 2단계 C, data/items.js AFFIX_KEEP_RULES)과 화석 태그 가중치(FOSSIL_TAG_WEIGHT).
// 보존은 다음 재굴림 한 번(재화, 홀씨 재굴림, 화석)이 그 종류 줄을 그대로 두고 남은 자리만 굴리며, 그 재굴림에 쓰인다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);
const json = source => JSON.parse(run(`JSON.stringify(${source})`));
run(`game.contentProgression.inherited = ['craft']; contentProgression.sync(); game.season = Math.max(3, game.season || 1); game.inventory = [];
    window.kinds = item => equipmentCrafting.affixCounts(item);
    window.makeRare = slot => { const item = createItemFromBase(BASE_ITEM_DB.find(row => row.slot === slot), 'rare', 10);
        item.stats = pickRandomMods(getAvailableMods(item), 6, { prefix: 3, suffix: 3 }).map(mod => rollAffixValue(mod, 10));
        item.chaosInfusion = null; item.corrupted = false; game.inventory.push(item); return item; };
    window.ofKind = (item, kind) => item.stats.filter(stat => equipmentCrafting.storedAffixKind(item, stat) === kind).map(stat => stat.id + ':' + stat.val);
    addLog = () => {};`);

// 1. 걸 수 있는 장비: 마법과 희귀, 그 종류 줄이 있을 때, 하나만.
assert.equal(run(`equipmentCrafting.getAffixKeepReason(makeRare('무기'), 'prefix')`), '');
assert.match(run(`(() => { const item = makeRare('무기'); item.rarity = 'unique'; return equipmentCrafting.getAffixKeepReason(item, 'prefix'); })()`), /마법이나 희귀/);
assert.match(run(`(() => { const item = makeRare('무기'); item.corrupted = true; return equipmentCrafting.getAffixKeepReason(item, 'suffix'); })()`), /바꿀 수 없습니다/);
assert.match(run(`(() => { const item = makeRare('반지'); item.stats = item.stats.filter(stat => equipmentCrafting.storedAffixKind(item, stat) === 'suffix');
    return equipmentCrafting.getAffixKeepReason(item, 'prefix'); })()`), /접두 옵션이 없습니다/);
assert.match(run(`(() => { const item = makeRare('무기'); item.affixKeep = 'suffix'; return equipmentCrafting.getAffixKeepReason(item, 'prefix'); })()`), /이미 접미 보존/);

// 2. 재화 재굴림(형체 없는 이슬): 접두 셋은 그대로, 접미만 다시, 보존은 쓰인다. 몇 번을 해도 같다.
const reroll = json(`(() => {
    const rows = [];
    for (let i = 0; i < 40; i++) {
        const item = makeRare(['무기', '갑옷', '반지', '장갑'][i % 4]);
        const before = ofKind(item, 'prefix');
        item.affixKeep = 'prefix';
        rerollExplicitMods(item, 'rare', 10);
        const after = ofKind(item, 'prefix');
        // 접두가 셋이 안 되던 장비(갑옷 베이스는 접두 후보가 적다)는 빈 접두 자리도 새로 굴린다.
        rows.push({ kept: before.every((line, index) => after[index] === line), lines: item.stats.length, keptCount: before.length, keep: item.affixKeep || '' });
    }
    return rows;
})()`);
assert(reroll.every(row => row.kept), 'kept prefixes stay exactly, in place');
assert(reroll.every(row => row.lines >= Math.max(4, row.keptCount) && row.lines <= Math.max(5, row.keptCount)), 'the open places fill to 4 or 5 lines');
assert(reroll.every(row => row.keep === ''), 'the keep is used by that reroll');

// 3. 실제 제작: 홀씨를 함께 쓴 재굴림은 보장 줄을 남은 종류에서 고르고, 화석은 보존 종류를 남긴 채 다시 굴린다.
const spore = json(`(() => {
    const item = makeRare('무기');
    const prefixes = ofKind(item, 'prefix');
    item.affixKeep = 'prefix';
    selectForCrafting(item.id, false);
    Object.assign(game.currencies, { formlessDew: 5, sporeFire: 50 });
    game.sporeCraftModes = { formlessDew: 'fire' };
    useCurrency('formlessDew');
    const sporeLine = item.stats.find(stat => stat.craftSource === 'spore');
    return { kept: JSON.stringify(ofKind(item, 'prefix')) === JSON.stringify(prefixes), sporeKind: sporeLine && equipmentCrafting.storedAffixKind(item, sporeLine), keep: item.affixKeep || '' };
})()`);
assert.deepEqual(spore, { kept: true, sporeKind: 'suffix', keep: '' }, 'a fire spore reroll keeps the prefixes and guarantees a fire suffix');
const fossil = json(`(() => {
    const item = makeRare('무기');
    const suffixes = ofKind(item, 'suffix');
    item.affixKeep = 'suffix';
    selectForCrafting(item.id, false);
    game.currencies.fossilJagged = 3;
    applyFossilChaosCraft('fossilJagged');
    const fossilLine = item.stats.find(stat => stat.craftSource === 'fossil');
    return { kept: JSON.stringify(ofKind(item, 'suffix')) === JSON.stringify(suffixes), fossilKind: fossilLine && equipmentCrafting.storedAffixKind(item, fossilLine), keep: item.affixKeep || '' };
})()`);
assert.deepEqual(fossil, { kept: true, fossilKind: 'prefix', keep: '' }, 'a jagged fossil keeps the suffixes and guarantees a physical prefix');
// 보존된 줄에 홀씨 줄이 있으면 홀씨 재굴림은 막힌다(홀씨 줄은 장비에 하나).
assert.match(run(`(() => { const item = makeRare('무기'); const stat = item.stats.find(row => equipmentCrafting.storedAffixKind(item, row) === 'suffix');
    stat.craftSource = 'spore'; item.affixKeep = 'suffix'; return equipmentCrafting.getSporeBlockReason(item, 'chaos', 'fire') || ''; })()`), /잠긴 홀씨 옵션/);
// 옵션을 모두 지우면(마름병 포자) 보존도 사라진다.
assert.equal(run(`(() => { const item = makeRare('무기'); item.affixKeep = 'prefix'; selectForCrafting(item.id, false); game.currencies.blightSpore = 1;
    useCurrency('blightSpore'); return item.affixKeep || ''; })()`), '');

// 4. 화석 태그 가중치: 확정 줄 밖의 나머지 줄은 화석 태그가 맞는 옵션이 FOSSIL_TAG_WEIGHT배. 태그 없는 화석은 그대로.
const weights = json(`(() => {
    const item = makeRare('무기'); item.stats = [];
    const pool = getAvailableMods(item), weighed = weighFossilTagMods(pool, 'fossilJagged');
    const rule = AFFIX_TAG_LISTS.fossil.fossilJagged;
    const themed = mod => matchesAffixTags(getAffixTags(mod), rule);
    const share = rows => rows.filter(themed).reduce((sum, mod) => sum + (Number(mod.weight) || 1), 0) / rows.reduce((sum, mod) => sum + (Number(mod.weight) || 1), 0);
    return { ratioOk: weighed.every((mod, i) => (Number(mod.weight) || 1) === (Number(pool[i].weight) || 1) * (themed(pool[i]) ? FOSSIL_TAG_WEIGHT : 1)),
        before: share(pool), after: share(weighed), old: weighFossilTagMods(pool, 'fossilOld') === pool, bulwark: weighFossilTagMods(pool, 'fossilBulwark') === pool };
})()`);
assert(weights.ratioOk, 'themed rows weigh FOSSIL_TAG_WEIGHT times');
assert(weights.after > weights.before * 1.5, 'the fill leans to the fossil theme');
assert(weights.old && weights.bulwark, 'fossils without tags keep the plain pool');
console.log(`affix keep: kept kind survives currency, spore and fossil rerolls once; fossil theme share ${(weights.before * 100).toFixed(0)}% -> ${(weights.after * 100).toFixed(0)}%: OK`);
