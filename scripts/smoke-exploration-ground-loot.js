// Exploration floor loot (2026-10-05 user request): equipment waits on its cell, the hero picks it up by walking over it (auto-move
// walks there after a fight), a click picks a pile up at once, and leaving the map never loses what is left. Also: a boss rises
// the same distance from its gate whichever way the map faces, and the cleared map holds five seconds before the next.
const assert = require('node:assert/strict');
const { run } = require('./lib/replay-fixture')(611);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));

function setup(mode = 'direct', rotation) {
    run(`window.rollExplorationFacing=()=>${rotation === undefined ? 0 : rotation};
        game=mergeDefaults({currentZoneId:0,maxZoneId:39,heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',
        settings:{pauseGameOnOverlay:false,autoSalvageEnabled:false},combatTimeMs:10000});game.moveTimer=0;game.combatHalted=false;
        game.playerHp=getPlayerStats().maxHp;startEncounterRun(true);window.r=game.actExploration;window.m=actExplorationMap.forRun(r);
        r.mode='${mode}';r.objects&&(r.objects.entries=[]);
        r.packs.filter(p=>p.stage===null).forEach(p=>{p.waiting=[];p.aliveIds=[];p.eliteIds=[];});
        window.hero=game.gridPlayer;window.near=[[2,0],[0,2],[-2,0],[0,-2],[2,2],[-2,-2],[3,0],[0,3]]
            .map(([x,y])=>({gx:hero.gx+x,gy:hero.gy+y})).filter(c=>actExplorationMap.walkable(m,c,true));
        window.drop=(cell,rarity='rare')=>{const item=generateEquipmentDrop({isBoss:true,level:10},{zone:getZone(0),minimumRarity:rarity});
            return [keepEquipmentDrop({id:0,isBoss:false,isElite:false,...cell},item),item.id];};
        window.owned=id=>game.inventory.concat(Object.values(game.equipment)).filter(Boolean).filter(item=>item.id===id).length;
        window.steps=n=>{for(let i=0;i<n;i++){game.combatTimeMs+=20;actExplorationProgress.advance(getPlayerStats());}};`);
}

// A kill on a map leaves the item on its cell: not owned yet.
setup();
const [where, firstId] = copy('drop(near[0])');
assert.equal(where, 'floor', 'an exploration drop the pickup would keep lands on the floor');
assert.equal(run(`owned(${firstId})`), 0, 'the floor item is not picked up on the kill');
assert.equal(run('r.groundLoot.length'), 1);
// Auto-move walks to it once nothing fights and picks it up on its cell, exactly once.
run('for(let i=0;i<400&&r.groundLoot.length;i++)steps(1)');
assert.equal(run('r.groundLoot.length'), 0, 'auto-move walks to the pile and picks it up');
assert.deepEqual(copy('[hero.gx,hero.gy]'), copy('[near[0].gx,near[0].gy]'), 'the hero stands on the pile cell when it picks it up');
run('steps(200)');
assert.equal(run(`owned(${firstId})`), 1, 'the item reaches the hero once');

// 직접 이동 (manual): the hero does not walk; a click picks the whole pile up at once, wherever the hero stands.
setup('manual');
const pile = copy('[drop(near[0])[1],drop(near[0],"magic")[1],drop(near[1])[1]]');
run('steps(200)');
assert.equal(run('r.groundLoot.length'), 3, 'manual mode leaves the floor alone');
assert.equal(run('actExplorationProgress.collectPile(near[0])'), 2, 'a click picks up every item of that pile');
assert.deepEqual(pile.map(id => run(`owned(${id})`)), [1, 1, 0]);
assert.equal(run('actExplorationProgress.collectPile(near[0])'), 0, 'a second click on the emptied cell grants nothing');

// The floor survives a save; malformed rows are rejected; a save from before the field gets an empty floor.
run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));window.r=game.actExploration;');
assert.equal(run('r.groundLoot.length'), 1, 'floor items are saved with the run');
assert.equal(run(`r.groundLoot[0].item.id===${pile[2]}`), true);
for (const broken of ['{gx:-1,gy:0,item:r.groundLoot[0].item,highlight:false,guaranteed:false}', '{...r.groundLoot[0],item:{id:1}}',
    '{...r.groundLoot[0],highlight:"yes"}', 'r.groundLoot[0]']) {
    assert.throws(() => run(`mergeDefaults({...JSON.parse(serializeSaveState(game)),actExploration:{...JSON.parse(JSON.stringify(r)),groundLoot:[r.groundLoot[0],${broken}].slice(${broken === 'r.groundLoot[0]' ? 0 : 1})}})`),
        /바닥 아이템/, `rejects ${broken}`);
}
run('window.legacy=JSON.parse(serializeSaveState(game));delete legacy.actExploration.groundLoot;window.loaded=mergeDefaults(legacy);');
assert.deepEqual(copy('loaded.actExploration.groundLoot'), [], 'a save without floor items loads an empty floor');
// Item ids on the floor stay reserved: a new drop never reuses one.
run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));window.r=game.actExploration;');
assert.notEqual(copy('drop(near[1])[1]'), pile[2], 'a new item never takes a floor item id');

// Leaving the map settles everything left on the floor into the inventory, once.
const left = copy('r.groundLoot.map(row=>row.item.id)');
run('actExplorationProgress.depart(game)');
assert.deepEqual(left.map(id => run(`owned(${id})`)), left.map(() => 1), 'nothing on the floor is lost when the map closes');
// A save that drops a stale run on load keeps its floor items too.
setup('manual');
const stale = copy('drop(near[0])[1]');
run('window.raw=JSON.parse(serializeSaveState(game));raw.currentZoneId=1;window.loaded=mergeDefaults(raw);');
assert.equal(run(`loaded.inventory.filter(item=>item.id===${stale}).length`), 1, 'a dropped stale run hands its floor items to the inventory');

// Offline replay walks no detours: drops are picked up at once.
setup();
run('game.isBackgroundCalculation=true;');
assert.equal(copy('drop(near[0])[0]'), 'kept', 'offline drops are picked up on the kill');
run('game.isBackgroundCalculation=false;');
// A drop the pickup filter would refuse never litters the floor.
run(`game.settings.autoSalvageEnabled=true;game.settings.autoSalvageRarities={normal:true,magic:true,rare:true};`);
assert.notEqual(copy('drop(near[0],"magic")[0]'), 'floor', 'an auto-salvaged drop is resolved on the kill (salvaged or equipped), not left on the floor');
assert.equal(run('r.groundLoot.length'), 0);

// After the last boss falls, auto-move picks up the floor before completing; the cleared map then holds five seconds.
setup();
run(`drop(near[0]);r.packs.filter(p=>p.stage!==null).forEach(p=>{p.waiting=[];p.aliveIds=[];});r.status='cleared';`);
assert.equal(run('actExplorationProgress.canFinish()'), false, 'the map waits while auto-move collects its floor');
run('steps(400)');
assert.equal(run('r.groundLoot.length'), 0);
assert.equal(run('actExplorationProgress.canFinish()'), true);
run('finishEncounterRun()');
assert.equal(run('game.actExploration.departure.remainingMs'), 5000, 'the cleared map stays five seconds before the next');
setup('manual');
run(`drop(near[0]);r.packs.filter(p=>p.stage!==null).forEach(p=>{p.waiting=[];p.aliveIds=[];});r.status='cleared';`);
assert.equal(run('actExplorationProgress.canFinish()'), true, 'manual mode completes at once; the floor settles on departure');

// Currency waits on the floor too (2026-10-06): one row per currency and cell, granted once when picked up, never lost.
setup('manual');
run("window.wallet=game.currencies.magicBud||0;");
assert.deepEqual(copy("[keepCurrencyDrop({id:0,...near[0]},'magicBud',2),keepCurrencyDrop({id:0,...near[0]},'magicBud',1)]"),
    [{ gain: 2, floor: true }, { gain: 1, floor: true }], 'a currency drop on a map lands on the floor');
assert.equal(run('game.currencies.magicBud||0'), run('wallet'), 'floor currency is not owned yet');
assert.deepEqual(copy("r.groundLoot.filter(row=>row.currency).map(({currency,count})=>[currency,count])"), [['magicBud', 3]],
    'the same currency on one cell is one row');
run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));window.r=game.actExploration;');
assert.equal(run("r.groundLoot.find(row=>row.currency).count"), 3, 'floor currency is saved with the run');
for (const broken of ["{...r.groundLoot[0],count:0}", "{...r.groundLoot[0],currency:'notACurrency'}", "{...r.groundLoot[0],count:1.5}", "r.groundLoot[0]"]) {
    assert.throws(() => run(`mergeDefaults({...JSON.parse(serializeSaveState(game)),actExploration:{...JSON.parse(JSON.stringify(r)),groundLoot:[r.groundLoot[0],${broken}]}})`),
        /바닥 아이템/, `rejects currency row ${broken}`);
}
assert.equal(run('actExplorationProgress.collectPile(near[0])'), 1);
assert.equal(run('game.currencies.magicBud'), run('wallet') + 3, 'picking the pile up grants the floor count once');
assert.equal(run('actExplorationProgress.collectPile(near[0])'), 0);
assert.equal(run('game.currencies.magicBud'), run('wallet') + 3);
// Leaving the map and a dropped stale run on load settle floor currency into the wallet.
run("keepCurrencyDrop({id:0,...near[1]},'magicBud',4);actExplorationProgress.depart(game);");
assert.equal(run('game.currencies.magicBud'), run('wallet') + 7, 'leaving the map collects floor currency');
setup('manual');
run("window.wallet=game.currencies.magicBud||0;keepCurrencyDrop({id:0,...near[0]},'magicBud',5);window.raw=JSON.parse(serializeSaveState(game));raw.currentZoneId=1;window.loaded=mergeDefaults(raw);");
assert.equal(run('loaded.currencies.magicBud||0'), run('wallet') + 5, 'a dropped stale run hands its floor currency to the wallet');
// A still-locked currency drops nothing; offline replay commits at once.
run("window.lockedKey=Object.keys(ORB_DB).find(key=>!contentProgression.canDropCurrency(key));");
if (run('!!lockedKey')) assert.deepEqual(copy("keepCurrencyDrop({id:0,...near[0]},lockedKey,3)"), { gain: 0, floor: false }, 'a locked currency drops nothing');
run("game.isBackgroundCalculation=true;window.before=game.currencies.magicBud||0;window.offline=keepCurrencyDrop({id:0,...near[0]},'magicBud',2);game.isBackgroundCalculation=false;");
assert.deepEqual(copy('offline'), { gain: 2, floor: false }, 'offline drops are committed at once');
assert.equal(run('game.currencies.magicBud'), run('before') + 2);

// The boss rises on its room centre, its 2x2 body reaching away from the gate: the same gap from the gate in every facing.
const gaps = [0, 1, 2, 3].map(rotation => {
    setup('direct', rotation);
    return copy(`(()=>{const boss=r.packs.find(p=>p.stage===0).waiting[0];const g=m.gate,cells=getGridUnitCells(boss);
        return Math.min(...cells.map(c=>Math.max(Math.abs(c.gx-g.gx),Math.abs(c.gy-g.gy))));})()`);
});
assert.equal(new Set(gaps).size, 1, `boss gap from the gate is the same in every facing: ${gaps}`);
console.log('Exploration floor loot (equipment and currency): walk-over pickup, click pickup, saves, settlement, offline, filters, boss placement and 5 s hold OK');
