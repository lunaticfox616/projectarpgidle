const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime(), run = source => vm.runInContext(source, runtime);
const json = source => JSON.parse(run(`JSON.stringify(${source})`));
run('game=mergeDefaults({});window.game=game;Math.random=()=>0.5;');

// Actual generated enemies: repeatable bosses ease mitigation; normal/elite defenses remain intact.
const defenses = json(`(() => {
    const zone=getZone(29), marker={at:50,boss:true};
    const row=zone=>{const e=createEnemy(zone,marker,0);return [e.dr,e.resF,e.maxHp,e.armor,e.evasion];};
    return { farm:row(zone),fixed:row({...zone,fixedSeason:1}),exempt:row({...zone,loopScaleExempt:true}),
        pinnacle:row({...zone,milestonePinnacle:true}),benchmark:row({...zone,difficultyBenchmark:'rival31'}),
        start:row(getZone(0)),normal:createEnemy(zone,{at:50},0),elite:createEnemy(zone,{at:50,elite:true},0) };
})()`);
assert.deepEqual(defenses.farm.slice(0, 2), [60, 65]);
for (const key of ['fixed', 'exempt', 'pinnacle', 'benchmark']) assert.deepEqual(defenses[key].slice(0, 2), [75, 80]);
assert.deepEqual(defenses.farm.slice(2), defenses.fixed.slice(2), 'identical effective loop preserves HP, armor and evasion');
assert.deepEqual(defenses.start.slice(0, 2), [10, 15], 'first boss mitigation is unchanged');
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

// Conditional rarity distribution, including exact unique boundaries. Quantity is a separate roll.
const rarity = (enemy, roll) => runtime.getEquipmentDropRarity(enemy, roll);
assert.equal(rarity({ isBoss: true }, .039999), 'unique');
assert.equal(rarity({ isBoss: true }, .04), 'rare');
assert.equal(rarity({ isBoss: true }, .499999), 'rare');
assert.equal(rarity({ isBoss: true }, .5), 'magic');
assert.equal(rarity({ isBoss: true }, .999999), 'magic');
assert.equal(rarity({ isElite: true }, .019999), 'unique');
assert.equal(rarity({ isElite: true }, .02), 'rare');
assert.equal(rarity({ isElite: true }, .30), 'magic');
assert.equal(rarity({ isElite: true }, .80), 'normal');
assert.equal(rarity({}, .30), 'normal');
console.log('Loop balance: real boss defenses, fixed-content exclusions, rising loop HP, separate recovery loot and rarity boundaries passed');
