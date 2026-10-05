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

// The boss card and entrance banner name a boss's standout defenses with their live values; early bosses show none.
const shown = json(`(() => {
    const boss=id=>createEnemy(getZone(id),{at:50,boss:true},0);
    const late=boss(29),early=boss(0),elite=createEnemy(getZone(29),{at:50,elite:true},0);
    return {late:getEnemyDefenseHighlights(late),lateTags:getEnemyTraitSummary(late),early:getEnemyDefenseHighlights(early),
        elite:getEnemyDefenseHighlights(elite),caps:getBossDefenseCaps(getZone(29),late.ele),values:[late.dr,late.resF,late.resC,late.resL]};
})()`);
assert.ok(shown.late.length >= 1, `a chaos 20 boss names its specialties: ${shown.values}`);
assert.ok(shown.late.every(tag => shown.lateTags.includes(tag)), 'the boss card tags carry them');
assert.ok(shown.late.every(tag => /^(물리 피해 감소|화염 저항|냉기 저항|번개 저항) \d+%$/.test(tag)));
assert.deepEqual(shown.early, [], 'the first act boss shows no standout defense');
assert.deepEqual(shown.elite, [], 'elites keep their tags as before');

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

// Expected equipment count (2026-10-05 user decision): above 1 a kill drops the whole part for sure and the fraction as one
// more roll; the drought guarantee lifts only the first item; below 1 nothing changes (one roll, strict boundary).
const counts2 = json(`(() => {
    game=mergeDefaults({});window.game=game;game.level=1;game.maxZoneId=0;game.settings.autoEquipEmptySlots=false;
    const zone=getZone(0),enemy={isElite:true,id:9};game.equipmentDropProgress=0;
    const roll=(chance,r)=>{Math.random=()=>r;const out=rollEquipmentDrop(zone,enemy,chance);Math.random=()=>0.5;return out.count;};
    const rows={below:[roll(0.3,0.29),roll(0.3,0.3)],whole:[roll(1,0.99),roll(2,0.99)],over:[roll(2.4,0.39),roll(2.4,0.4)]};
    game.inventory=[];game.equipmentDropProgress=0;const kept=rollEquipmentLoot({isBoss:true,id:10,gx:1,gy:1},zone,2.4);
    rows.kill={kept:!!kept,items:game.inventory.length};
    game.equipmentDropProgress=EQUIPMENT_DROUGHT_RULES.threshold;rows.drought=rollEquipmentDrop(zone,enemy,0);
    rows.firstBoss=getEquipmentDropChances(zone,{isBoss:true,id:11}).equipment;
    return rows;
})()`);
assert.deepEqual(counts2.below, [1, 0], 'below one item the roll keeps its strict boundary');
assert.deepEqual(counts2.whole, [1, 2], 'whole expected counts drop exactly that many');
assert.deepEqual(counts2.over, [3, 2], 'the fraction above a whole count is one more roll');
assert.equal(counts2.kill.kept, true);
assert.ok(counts2.kill.items >= 2, `a 2.4 kill grants at least two items (${counts2.kill.items})`);
assert.equal(counts2.drought.count, 1, 'the drought guarantee lifts the first item only');
assert.equal(counts2.drought.minimumRarity, 'rare');
assert.equal(counts2.firstBoss, 1, 'the first act boss of a loop still drops exactly one guaranteed item');
// Item level (2026-10-05 user decision): an elite's equipment rolls area level +1~2, a boss's +3~4. Monster level (experience,
// penalties) keeps +1 / +2, and ordinary monsters' items stay at the area level.
const levels = json(`(() => {
    const zone=getZone(14),area=levelProgression.areaLevel(zone),lv=(enemy,r)=>levelProgression.itemLevel(zone,enemy,()=>r)-area;
    const boss={isBoss:true},elite={isElite:true};
    const drops=Array.from({length:60},()=>generateEquipmentDrop({isBoss:true},{zone}).itemLevel-area);
    return {boss:[lv(boss,0),lv(boss,0.99)],elite:[lv(elite,0),lv(elite,0.99)],regular:lv({},0.99),
        monster:[levelProgression.monsterLevel(zone,boss)-area,levelProgression.monsterLevel(zone,elite)-area],
        drops:[Math.min(...drops),Math.max(...drops)]};
})()`);
assert.deepEqual(levels.boss, [3, 4]);
assert.deepEqual(levels.elite, [1, 2]);
assert.equal(levels.regular, 0);
assert.deepEqual(levels.monster, [2, 1], 'monster level keeps its own bonus');
assert.ok(levels.drops[0] >= 3 && levels.drops[1] <= 4, `boss equipment item levels ${levels.drops}`);
console.log('Loop balance: boss defense specialties, fixed-content exclusions, rising loop HP, separate recovery loot, rarity boundaries, expected-count drops and item levels passed');
