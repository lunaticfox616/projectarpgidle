// 세계수 기운(12번 루프 27, 2026-10-08, docs/loop-content-12-plan-20261008.md, data/region-affixes.js): 루프 27부터 아틀라스 지도에서
// 떨어진 장비는 그 지역을 기억하고(item.dropRegion), 그 지역 전용 줄(MOD_DB regions)만 그 장비의 옵션 풀에 들어간다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

// 1. 어느 장비가 지역을 기억하나: 아틀라스 지도, 루프 27부터, 알려진 지역만.
run(`game = mergeDefaults({}); window.game = game;
    window.atlasZone = region => ({ type: 'atlasMap', atlasRegion: region });
    window.atLoop = loop => { game.season = loop; game.contentProgression.highestLoop = loop; };`);
run('atLoop(26);');
assert.equal(run(`getEquipmentDropRegion(atlasZone('roots'))`), null, 'not before loop 27');
run('atLoop(27);');
assert.equal(run(`getEquipmentDropRegion(atlasZone('roots'))`), 'roots', 'an atlas map drop remembers its region');
assert.equal(run(`getEquipmentDropRegion({ type: 'abyss', atlasRegion: 'roots' })`), null, 'only atlas maps');
assert.equal(run(`getEquipmentDropRegion(atlasZone('bogus'))`), null, 'only known regions');
assert.deepEqual(json(`ATLAS.regions.map(row => row.id)`), ['roots', 'trunk', 'canopy', 'garden', 'sanctum']);

// 2. 저장 경계: 알려진 지역만 남는다.
const stored = json(`(() => {
    const base = BASE_ITEM_DB.find(row => row.slot === '반지');
    const keep = normalizeItem(JSON.parse(JSON.stringify(createItemFromBase(base, 'rare', 18, { dropRegion: 'garden' }))));
    const bogus = normalizeItem({ ...JSON.parse(JSON.stringify(keep)), dropRegion: 'nowhere' });
    return [keep.dropRegion, bogus.dropRegion, createItemFromBase(base, 'rare', 18).dropRegion];
})()`);
assert.deepEqual(stored, ['garden', null, null], 'a known region survives a load, an unknown one and a plain drop have none');

// 3. 옵션 풀: 지역 줄은 그 지역 장비에만(검사용 줄을 잠시 더해 본다), 풀 캐시는 지역마다 따로.
const pools = json(`(() => {
    MOD_DB.push({ id: 'testRootsLine', statId: 'pctHp', type: 'suffix', statName: '시험', slots: ['반지'], regions: ['roots'], tierValues: [[1, 1]] });
    availableModPools.clear();
    const base = BASE_ITEM_DB.find(row => row.slot === '반지');
    const has = region => getAvailableMods({ ...createItemFromBase(base, 'normal', 18), dropRegion: region }).some(mod => mod.id === 'testRootsLine');
    const out = { roots: has('roots'), trunk: has('trunk'), none: has(null) };
    MOD_DB.pop();
    availableModPools.clear();
    return out;
})()`);
assert.deepEqual(pools, { roots: true, trunk: false, none: false }, 'a region line only joins its own region\'s pool');

// 4. 줄 20개: 지역마다 4줄, 지역 장비의 풀에만, 독벌침도 그 지역 무기만.
const rows = json(`REGION_AFFIX_MODS.map(row => [row.id, row.regions[0], row.type, row.slots.length, row.tierValues.length, MOD_DB.includes(row)])`);
assert.equal(rows.length, 20, 'twenty region lines');
for (const region of ['roots', 'trunk', 'canopy', 'garden', 'sanctum']) assert.equal(rows.filter(row => row[1] === region).length, 4, `${region}: four lines`);
assert(rows.every(row => row[4] === 20 && row[5] && row[3] >= 3), 'twenty tiers each, all in MOD_DB, three slots or more');
assert.deepEqual(json(`(() => {
    const base = BASE_ITEM_DB.find(row => row.slot === '무기');
    const lines = region => getVenomStingerMods({ ...createItemFromBase(base, 'rare', 18), stats: [], dropRegion: region }).map(mod => mod.id).filter(id => id.startsWith('region'));
    return { none: lines(null), garden: lines('garden').every(id => REGION_AFFIX_MODS.find(row => row.id === id).regions[0] === 'garden') };
})()`), { none: [], garden: true }, 'venom stingers add region lines only to that region\'s weapons');

// 5. 효과: 적과 pStats를 직접 만들어 하나씩 본다(칸은 체비쇼프 거리).
run(`window.foe = (id, gx, extra = {}) => ({ id, gx, gy: 0, hp: 1000, maxHp: 1000, resF: 0, resC: 0, resL: 0, resChaos: 0, ailments: [], ...extra });
    window.ail = (type, extra = {}) => ({ type, time: 3, duration: 3, power: 0.9, stacks: 1, sourceHitDamage: 100, ailmentDotScore: 100, ...extra });
    window.stats = values => ({ regionAffix: regionAffixEffects.collect(id => values[id] || 0), maxHp: 1000, energyShield: 0, armor: 5000, rawResChaos: 105,
        maxResChaos: 75, sSkill: { tags: ['attack'] }, passiveKeystoneFlags: {} });
    game.currentZoneId = 0; game.playerHp = 1000;`);
assert.equal(run(`Object.keys(regionAffixEffects.collect(() => 1)).length`), 20, 'collect gives every region stat');
// 적중: 저항 무시와 감소, 조건부 피해.
assert.equal(run(`regionAffixEffects.resistanceShred(stats({ regionShockedLightPen: 12 }), foe(1, 0, { ailments: [ail('shock')] }), 'light')`), 12);
assert.equal(run(`regionAffixEffects.resistanceShred(stats({ regionShockedLightPen: 12 }), foe(1, 0), 'light')`), 0, 'only shocked targets');
const multipliers = json(`(() => {
    const p = stats({ regionBleedingDamage: 50, regionIgnitedDamage: 40, regionFrozenCritDamage: 100, regionArmorToPhys: 2, regionChaosOvercap: 1, regionFullLifeFire: 30 });
    const m = (enemy, element, crit) => Math.round(regionAffixEffects.damageMultiplier(p, enemy, element, crit) * 1000) / 1000;
    const plain = foe(1, 0), bleeding = foe(2, 0, { ailments: [ail('bleed')] }), frozen = foe(3, 0, { ailments: [ail('freeze')] });
    const full = m(plain, 'fire', false); game.playerHp = 500; const hurt = m(plain, 'fire', false); game.playerHp = 1000;
    return { phys: m(plain, 'phys', false), bleedPhys: m(bleeding, 'phys', false), chaos: m(plain, 'chaos', false), full, hurt,
        frozenCrit: m(frozen, 'cold', true), frozenNoCrit: m(frozen, 'cold', false), ignited: m(foe(4, 0, { ailments: [ail('ignite')] }), 'light', false) };
})()`);
assert.deepEqual(multipliers, { phys: 1.1, bleedPhys: 1.65, chaos: 1.3, full: 1.3, hurt: 1, frozenCrit: 2, frozenNoCrit: 1, ignited: 1.4 },
    'armor 5000 → +10% physical, bleeding +50%, chaos 30% over the cap → +30%, fire at full life only, frozen crits only, ignited targets');
// 적중 뒤: 카오스 감소 5중첩, 번개 튐(가까운 적, 거리 3까지), 치명타 이동, 중독된 적 흡수.
const afterHit = json(`(() => {
    const realRandom = Math.random; Math.random = () => 0;
    const source = foe(1, 0, { ailments: [ail('shock')] }), near = foe(2, 2, { hp: 2000, maxHp: 2000 }), far = foe(3, 9);
    game.enemies = [source, near, far];
    const p = stats({ regionChaosShred: 2, regionShockChain: 40, regionCritMove: 15, regionPoisonedLeech: 1 });
    for (let i = 0; i < 7; i++) regionAffixEffects.afterHit(p, source, { crit: true, damage: 500 });
    const shred = source.ailments.find(a => a.type === 'regionChaosShred');
    const poisoned = foe(4, 0, { ailments: [ail('poison')] }); game.playerLeechInstances = [];
    regionAffixEffects.afterHit(p, poisoned, { crit: false, damage: 1000 });
    Math.random = realRandom;
    return { stacks: shred.stacks, shredRes: regionAffixEffects.resistanceShred(p, source, 'chaos'), nearHp: near.hp, farHp: far.hp,
        move: regionAffixEffects.moveBonus(getCombatTime()), later: regionAffixEffects.moveBonus(getCombatTime() + 5000),
        leech: Math.round(game.playerLeechInstances.reduce((sum, row) => sum + row.remaining, 0)) };
})()`);
assert.deepEqual(afterHit, { stacks: 5, shredRes: 10, nearHp: 2000 - 7 * 200, farHp: 1000, move: 15, later: 0, leech: 10 },
    'five chaos shred stacks (2% each), bolts of 40% on the target 2 cells away only, 2 s of crit move speed, 1% leech off a poisoned target');
assert.deepEqual(json(`regionAffixEffects.extraAilmentChances(stats({ regionChillOnHit: 12 }))`), { chill: 0.12 }, 'chill on any hit');
assert.equal(run(`regionAffixEffects.ailmentDurationMultiplier(stats({ regionIgniteDuration: 50 }), 'ignite')`), 1.5);
assert.equal(run(`regionAffixEffects.ailmentDurationMultiplier(stats({ regionIgniteDuration: 50 }), 'poison')`), 1);
// 처치: 번짐은 거리 2 안에만 그 몫, 동결된 적은 얼음 파편(냉기 저항 적용).
const death = json(`(() => {
    const dead = foe(1, 0, { hp: 0, ailments: [ail('poison', { sourceHitDamage: 200, ailmentDotScore: 400 }), ail('shock', { power: 0.8 }), ail('freeze')] });
    const near = foe(2, 1, { resC: 50 }), edge = foe(3, 2), far = foe(4, 3);
    game.enemies = [near, edge, far];
    regionAffixEffects.onEnemyDeath(dead, stats({ regionPoisonSpread: 50, regionShockSpread: 100, regionShatter: 20 }));
    const poison = enemy => enemy.ailments.find(a => a.type === 'poison');
    return { nearPoison: [poison(near).sourceHitDamage, poison(near).ailmentDotScore], edgeShock: edge.ailments.find(a => a.type === 'shock').power,
        far: far.ailments.length, nearHp: near.hp, edgeHp: edge.hp, farHp: far.hp };
})()`);
assert.deepEqual(death, { nearPoison: [100, 200], edgeShock: 0.8, far: 0, nearHp: 900, edgeHp: 800, farHp: 1000 },
    'half the poison and all the shock reach cells 1 and 2, not 3; shards of 20% of 1000 life, halved by 50% cold resistance');
// 막기 뒤 다음 공격 한 번, 받는 피해(생명력 절반 이하, 냉각된 공격자, 함께 상한 60%).
assert.deepEqual(json(`(() => {
    const p = stats({ regionBlockEmpower: 80, regionLowLifeDR: 40, regionChilledAttackerDR: 30 });
    regionAffixEffects.onBlock(p, 1000);
    const first = regionAffixEffects.consumeBlockEmpower(1500), second = regionAffixEffects.consumeBlockEmpower(1600);
    regionAffixEffects.onBlock(p, 1000); const late = regionAffixEffects.consumeBlockEmpower(5000);
    const chilled = foe(1, 0, { ailments: [ail('chill')] });
    const full = regionAffixEffects.takenDamageMultiplier(p, chilled); game.playerHp = 400;
    const low = regionAffixEffects.takenDamageMultiplier(p, foe(2, 0)), both = regionAffixEffects.takenDamageMultiplier(p, chilled); game.playerHp = 1000;
    return [first, second, late, Math.round(full * 100) / 100, Math.round(low * 100) / 100, Math.round(both * 100) / 100];
})()`), [1.8, 1, 1, 0.7, 0.6, 0.4], 'the next attack after a block once (within 3 s); 30% from a chilled attacker, 40% at half life, together capped at 60%');

// 6. 전투 연결: 장착한 지역 줄이 pStats로 모이고, 적중, 처치, 피격 자리의 함수가 지역 효과를 쓴다.
const wired = json(`(() => {
    game = mergeDefaults({ heroSelectionInitialized: true, selectedHeroId: 'hero1', selectedClassId: 'warrior' }); window.game = game;
    const base = BASE_ITEM_DB.find(row => row.slot === '반지');
    const ring = createItemFromBase(base, 'rare', 18, { dropRegion: 'garden' });
    ring.stats = [{ id: 'regionIgnitedDamage', val: 60, tier: 10, sourceModId: 'regionIgnitedDamage', affixBalanceVersion: 2 }];
    game.equipment['반지1'] = ring; game.level = 99;
    const p = getPlayerStats();
    const ignited = { id: 9, hp: 100, maxHp: 100, ailments: [{ type: 'ignite', time: 2 }] };
    return { stat: p.regionAffix.regionIgnitedDamage, hit: applyAilingTargetDamage(p, ignited, 'fire', false, [100, 50]),
        plain: applyAilingTargetDamage(p, { ailments: [] }, 'fire', false, [100, 50]) };
})()`);
assert.deepEqual(wired, { stat: 60, hit: [160, 80], plain: [100, 50] }, 'an equipped garden ring adds 60% damage against ignited targets in the hit path');
console.log('region affixes: atlas drops remember their region from loop 27, saves keep known regions, region lines join only their pool, '
    + 'twenty lines in five regions, every effect (shreds, conditional damage, bolts, spreads, shards, block, taken damage) and the hit path: OK');
