const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime(), run = source => vm.runInContext(source, runtime);
const json = source => JSON.parse(run(`JSON.stringify(${source})`));
run('game=mergeDefaults({});window.game=game;Math.random=()=>0.5;');

// Actual generated enemies (2026-10-05 user decision): a repeatable boss is strong in one or two of physical reduction and the
// fire, cold and lightning resistances; the rest stay low. Everything climbs the tier curve; fixed content keeps the full caps.
const defenses = json(`(() => {
    const zone=getZone(29), marker={at:50,boss:true};
    const row=zone=>{const e=createEnemy(zone,marker,0);return [e.dr,e.resF,e.resC,e.resL,e.resChaos,e.maxHp,e.armor,e.evasion,e.ele];};
    return { farm:row(zone),fixed:row({...zone,fixedSeason:1}),exempt:row({...zone,loopScaleExempt:true}),
        pinnacle:row({...zone,milestonePinnacle:true}),benchmark:row({...zone,difficultyBenchmark:'rival31'}),
        start:row(getZone(0)),mid:row(getZone(19)),normal:createEnemy(zone,{at:50},0),elite:createEnemy(zone,{at:50,elite:true},0),
        profiles:Array.from({length:40},(_,id)=>{const z=getZone(id);return ['phys','fire','cold','light','chaos'].map(ele=>getBossDefenseCaps(z,ele));}) };
})()`);
const variance = run('getZoneDefenseVariance(getZone(29))');
const ramp = Math.min(1, Math.max(0, 1 + variance));
const reach = (floor, cap) => floor + Math.floor((cap - floor) * ramp);
const farm = defenses.farm, caps = json(`getBossDefenseCaps(getZone(29), ${JSON.stringify(farm[8])})`);
const stats = ['dr', 'resF', 'resC', 'resL'], special = stats.filter(stat => caps[stat] === (stat === 'dr' ? 75 : 80));
assert.ok(special.length >= 1 && special.length <= 2, `one or two specialties: ${JSON.stringify(caps)}`);
assert.deepEqual(stats.filter(stat => !special.includes(stat)).map(stat => caps[stat]), stats.filter(stat => !special.includes(stat)).map(stat => stat === 'dr' ? 40 : 45));
assert.equal(caps.resChaos, 45, 'chaos resistance is never a specialty');
const byElement = { phys: 'dr', fire: 'resF', cold: 'resC', light: 'resL' };
if (byElement[farm[8]]) assert.ok(special.includes(byElement[farm[8]]), 'the boss element is its first specialty');
// The live boss: physical reduction is exactly its curve value; resistances reach at least theirs (zone wards may add more),
// and the strongest resistance belongs to a specialty when one is a resistance.
assert.equal(farm[0], reach(10, caps.dr));
stats.slice(1).forEach((stat, i) => assert.ok(farm[i + 1] >= reach(15, caps[stat]), `${stat} reaches its curve`));
const specialRes = special.filter(stat => stat !== 'dr');
if (specialRes.length) assert.ok(Math.max(...specialRes.map(stat => farm[stats.indexOf(stat)])) > Math.max(...stats.slice(1).filter(stat => !special.includes(stat)).map(stat => farm[stats.indexOf(stat)])), 'a resistance specialty stands out');
for (const key of ['fixed', 'exempt', 'pinnacle', 'benchmark']) {
    assert.equal(defenses[key][0], reach(10, 75), `${key} keeps the full physical cap`);
    defenses[key].slice(1, 5).forEach(value => assert.ok(value >= reach(15, 80), `${key} keeps every full resistance cap`));
}
assert.deepEqual(defenses.farm.slice(5, 8), defenses.fixed.slice(5, 8), 'identical effective loop preserves HP, armor and evasion');
assert.deepEqual(defenses.start.slice(0, 2), [10, 15], 'first boss mitigation is unchanged');
assert.ok(Math.max(...defenses.mid.slice(0, 4)) < 75, 'chaos 10 is still climbing toward the cap');
const counts = defenses.profiles.flat().map(caps => [caps.dr === 75, caps.resF === 80, caps.resC === 80, caps.resL === 80].filter(Boolean).length);
assert.ok(counts.every(n => n >= 1 && n <= 2), 'every act and chaos boss has one or two specialties');
assert.ok(counts.some(n => n === 2) && counts.some(n => n === 1), 'some bosses have one, some two');
assert.equal(defenses.normal.dr, 20); assert.equal(defenses.elite.dr, 45);
assert.equal(defenses.normal.resF, 25); assert.equal(defenses.elite.resF, 60);

// Effective HP rises through the loop milestones; the act cap and atlas fixed loop remain meaningful.
const curves = json(`(() => {
    const rows=[];
    for(const loop of [1,3,5,10,20,21,30,50,100]) {
        game.season=loop;game.loopCount=loop-1;
        const hp=zone=>createEnemy(zone,{boss:true,at:50},0).maxHp;
        rows.push({loop,act:hp(getZone(9)),chaos:hp(getZone(29)),
            fixed:hp({type:'atlasMap',id:'fixed_test',name:'fixed',tier:20,fixedSeason:10,equivalentDepth:20,
                atlasEnemyMods:[],atlasLootQuantity:0,atlasLootRarity:0,atlasBossRarity:0})});
    }
    return rows;
})()`);
curves.slice(1).forEach((row, i) => {
    assert.ok(row.chaos > curves[i].chaos, 'endless boss HP still increases');
    assert.ok(row.act >= curves[i].act, 'act HP does not reverse');
    assert.equal(row.fixed, curves[0].fixed, 'fixed-season map HP does not follow player loop');
});
assert.equal(curves.at(-1).act, curves.find(row => row.loop === 21).act);

// Recovery gear gets a gentler level-gap decay; currency/talismans/XP never inherit it.
run('game=mergeDefaults({});window.game=game;game.maxZoneId=2;');
for (const gap of [0, 10, 20, 30, 80]) {
    runtime.gap = gap;
    const row = json(`(() => {
        const zone=getZone(1),enemy={level:10,dropMul:1};game.level=10+gap;
        return {chances:getEquipmentDropChances(zone,enemy),roll:rollEquipmentDrop(zone,enemy,0),
            currency:levelProgression.rewardMultiplier(zone,enemy,game.level),
            xp:levelProgression.rewardMultiplier(zone,enemy,game.level,'experience')};
    })()`);
    const gear = Math.exp(-Math.max(0, gap - 10) * .06), other = Math.exp(-Math.max(0, gap - 10) * .085);
    assert.ok(Math.abs(row.chances.equipment / .00765 - gear) < 1e-10);
    assert.ok(Math.abs(row.chances.talisman / .003 - other) < 1e-10);
    assert.ok(Math.abs(row.roll.nextProgress - gear) < 1e-10);
    assert.equal(row.currency, other);
    assert.equal(row.xp, Math.exp(-Math.max(0, gap - 5) * .1));
}

// Conditional rarity distribution is the original one (2026-10-05 user decision); quantity is a separate roll.
const rarity = (enemy, roll) => runtime.getEquipmentDropRarity(enemy, roll);
assert.equal(rarity({ isBoss: true }, .039999), 'unique');
assert.equal(rarity({ isBoss: true }, .04), 'rare');
assert.equal(rarity({ isBoss: true }, .359999), 'rare');
assert.equal(rarity({ isBoss: true }, .36), 'magic');
assert.equal(rarity({ isBoss: true }, .80), 'normal');
assert.equal(rarity({ isElite: true }, .019999), 'unique');
assert.equal(rarity({ isElite: true }, .02), 'rare');
assert.equal(rarity({ isElite: true }, .24), 'magic');
assert.equal(rarity({ isElite: true }, .62), 'normal');
assert.equal(rarity({}, .30), 'normal');

// Diablo-style picks: elites and bosses roll the equipment chance once more. Only the first pick touches the drought progress and
// the first-act boss guarantee; an extra pick that drops still grants a real item.
const picks = json(`(() => {
    game=mergeDefaults({});window.game=game;game.level=1;game.maxZoneId=0;game.settings.autoEquipEmptySlots=false;
    const zone=getZone(0),chances=e=>getEquipmentDropChances(zone,e);
    const first=chances({isBoss:true,id:1}),elite=chances({isElite:true,id:2}),regular=chances({id:3});
    game.equipmentDropProgress=5;game.inventory=[];
    const kept=rollEquipmentLoot({isElite:true,id:4,gx:1,gy:1},zone,0,[1]);
    return {first,elite,regular,kept:!!kept,items:game.inventory.length,progress:game.equipmentDropProgress};
})()`);
assert.equal(picks.first.equipment, 1, 'the first act boss of a loop still guarantees its first pick');
assert.equal(picks.first.extraEquipment.length, 1);
assert.ok(picks.first.extraEquipment[0] < 1, "the boss's extra pick rolls the ordinary chance");
assert.deepEqual(picks.elite.extraEquipment, [picks.elite.equipment], 'an elite gets one more pick at its own chance');
assert.deepEqual(picks.regular.extraEquipment, [], 'ordinary monsters roll once');
assert.equal(picks.kept, true, 'an extra pick that drops grants an item');
assert.ok(picks.items >= 1);
assert.ok(picks.progress > 5, 'a missed first pick still builds drought progress; the extra pick never resets it');
console.log('Loop balance: boss defense specialties, fixed-content exclusions, rising loop HP, separate recovery loot, rarity boundaries and extra picks passed');
