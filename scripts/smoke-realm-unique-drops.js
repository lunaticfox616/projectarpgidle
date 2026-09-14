const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);
context.showGameToast = () => {};
run(`game = mergeDefaults({}); window.game=game; game.settings.autoEquipEmptySlots = false;
    game.seenTutorials = ['tutorial_battle_basics', 'unlock_growth_board'];`);

// Only the random boundary is controlled; zone construction, rewards and inventory are real.
function withRolls(values, action) {
    const original = context.Math.random;
    let index = 0;
    context.Math.random = () => index < values.length ? values[index++] : 0.5;
    try { return action(); } finally { context.Math.random = original; }
}

function enterRealm(id, galaxy = 1) {
    context.__zoneId = id;
    context.__galaxy = galaxy;
    return run(`game.currentZoneId = __zoneId; window.game=game;
        game.cosmosAtlas.activeChallenge = { name:'검증 행성', tier:80, galaxy:__galaxy };
        game.level = 1; getZone(game.currentZoneId);`);
}

const boss = { id: 100, isBoss: true, gx: 3, gy: 3, dropMul: 1 };
context.__boss = boss;
assert.strictEqual(context.UNIQUE_DB.filter(row => row.realm).length, 98);
for (const id of ['chaos_realm', 'underworld_core', 'cosmos_challenge']) {
    const zone = enterRealm(id);
    context.__zone = zone;
    assert.strictEqual(withRolls([0.03], () => context.generateRealmBossUniqueDrop(zone, boss)), null,
        '3% boundary is a miss, independent of underworld ordinary loot reduction');
    assert.strictEqual(withRolls([0], () => context.generateRealmBossUniqueDrop(zone, {isElite:true})), null);
    const before = JSON.stringify(context.game);
    const item = withRolls([0.02999, 0.5, 0.5], () => context.generateRealmBossUniqueDrop(zone, boss));
    assert(item, `${id} boss can award its realm unique without ordinary equipment/rarity rolls`);
    assert.strictEqual(JSON.stringify(context.game), before, 'generation must not grant or mutate progress');
    assert.strictEqual(context.UNIQUE_DB.find(row => row.name === item.name).dropOnly.type, zone.type);
    assert.strictEqual(item.itemLevel, run('levelProgression.monsterLevel(__zone, __boss)'));
    const progress = context.game.equipmentDropProgress;
    const granted = withRolls([0.02999, 0.5, 0.5], () => run('grantRealmBossUniqueLoot(__boss, __zone)'));
    assert(granted);
    assert(context.game.inventory.some(row => row.id === granted.id));
    assert(context.game.uniqueCodex[`${granted.slot}|${granted.name}`]);
    assert.strictEqual(context.game.equipmentDropProgress, progress, 'bonus loot does not reset ordinary drought credit');
    context.game.level = 200;
    assert.strictEqual(withRolls([0.02], () => context.generateRealmBossUniqueDrop(zone, boss)), null,
        'outleveling a realm still reduces the bonus drop chance');
}
assert.strictEqual(withRolls([0], () => context.generateRealmBossUniqueDrop(context.getZone(0), boss)), null);

for (const [id, names] of [
    ['chaos_realm', ['폭풍의 눈', '만화경']],
    ['underworld_core', ['대지의 태동', '무한한 허기']]
]) {
    const zone = enterRealm(id);
    const cap = context.getRealmEquipmentHiddenTierCap(zone);
    names.forEach((name, index) => {
        const definition = context.UNIQUE_DB.find(row => row.name === name);
        const pool = context.UNIQUE_DB.filter(row => row.ultraRare && row.slots.includes(definition.slots[0])
            && (!row.dropOnly || row.dropOnly.type === zone.type)
            && (row.dropOnly?.minTier || row.reqTier) <= cap);
        const ordinary = withRolls([0, (pool.indexOf(definition) + 0.1) / pool.length],
            () => context.generateUniqueItem(cap, definition.slots[0]));
        assert.strictEqual(ordinary.name, name, 'previously impossible unique is reachable in ordinary unique rolls');
        const bonus = withRolls([0, 0.00999, index / names.length],
            () => context.generateRealmBossUniqueDrop(zone, boss));
        assert.strictEqual(bonus.name, name, '1% of successful bonus rolls use the ultra-rare pool');
        assert.strictEqual(bonus.baseId, run(`UNIQUE_EQUIPMENT_RULES[${JSON.stringify(name)}].baseId`));
    });
}

// Every normal cosmos identity is available by G5, while G1 retains its own tier gate.
for (const galaxy of [1, 5]) {
    const zone = enterRealm('cosmos_challenge', galaxy);
    const cap = context.getRealmEquipmentHiddenTierCap(zone);
    const expected = context.UNIQUE_DB.filter(row => row.dropOnly?.type === 'cosmos'
        && !row.ultraRare && (row.dropOnly.minTier || row.reqTier) <= cap);
    expected.forEach((definition, index) => {
        const rolls = galaxy === 1 ? [0, (index + 0.1) / expected.length]
            : [0, 0.5, (index + 0.1) / expected.length];
        const item = withRolls(rolls,
            () => context.generateRealmBossUniqueDrop(zone, boss));
        assert.strictEqual(item.name, definition.name);
    });
    assert.strictEqual(expected.filter(row => row.realmCodexOnly).length, galaxy === 1 ? 10 : 50);
}

// Real enemy loot path (also used by background combat), with auto-salvage on.
enterRealm('chaos_realm');
run(`game.inventory=[];game.uniqueCodex={};game.settings.autoSalvageEnabled=true;
    game.settings.autoSalvageRarities.unique=true;game.isBackgroundCalculation=true;`);
const random = context.Math.random;
try { context.Math.random = () => 0.02; context.rollLootForEnemy(boss); }
finally { context.Math.random = random; }
const kept = context.game.inventory.filter(item => context.UNIQUE_DB.find(row => row.name === item.name)?.realm);
assert(kept.length > 0, 'bonus unique survives automated salvage in the actual loot path');
kept.forEach(item => assert(context.game.uniqueCodex[`${item.slot}|${item.name}`]));
run('game.isBackgroundCalculation=false;');

// Existing cosmos items lose the misleading realm-only prefix without rerolling options.
for (const definition of context.UNIQUE_DB.filter(row => row.realm === 'cosmos' && row.realmCodexOnly)) {
    const item = context.generateUniqueItem(20, null, definition.name);
    context.normalizeItem(item);
    const stats = JSON.stringify(item.stats);
    const id = item.id;
    item.uniqueEffect = `우주계 전용 효과 #1: ${definition.uniqueEffect}`;
    context.normalizeItem(item);
    assert.strictEqual(item.uniqueEffect, definition.uniqueEffect);
    assert.strictEqual(JSON.stringify(item.stats), stats);
    assert.strictEqual(item.id, id);
}

// Representative on-hit, summon and boss effects enter combat stats outside cosmos.
run(`game=mergeDefaults({});window.game=game;game.level=100;
    game.actRewardBonuses=['strength','dexterity','intelligence'].map(stat=>({stat,value:1000}));`);
for (const [name, field, expected] of [
    ['잿불의 인장', 'uniqueAllResDownOnHit', {perHit:3,max:4,duration:5}],
    ['군세의 부름', 'summonCap', 4],
    ['태초의 대폭발', 'cosmosBossDamageMorePct', 25]
]) {
    const item = context.generateUniqueItem(30, null, name);
    context.__testItem = item;
    run(`game.equipment=cloneDefaultGame().equipment;
        game.equipment[['반지','장갑'].includes(__testItem.slot)?__testItem.slot+'1':__testItem.slot]=__testItem;`);
    for (const id of [0, 'cosmos_challenge']) {
        context.game.currentZoneId = id;
        context.game.cosmosAtlas.activeChallenge = {tier:80,galaxy:1};
        assert.deepStrictEqual(JSON.parse(JSON.stringify(context.getPlayerStats()[field])), expected, name);
    }
}

context.__astraZone = context.getZone('cosmos_astra');
assert.strictEqual(run('rollCosmosAstraUniqueDrop(__astraZone, () => 0.08)'), null);
const astraItem = run('rollCosmosAstraUniqueDrop(__astraZone, () => 0.0799)');
assert.strictEqual(astraItem.name, '아스트라의 파편');
assert(context.game.uniqueCodex[`${astraItem.slot}|${astraItem.name}`]);
console.log('smoke-realm-unique-drops passed');
