const assert=require('node:assert/strict');
const {run}=require('./lib/replay-fixture')(29);
// These checks walk the drawn map's fixed coordinates; the run's facing is random since 2026-10-04 (js/combat.js rollExplorationFacing).
run('rollExplorationFacing=()=>undefined;');
const copy=code=>JSON.parse(run(`JSON.stringify(${code})`));

// Every authored map, all ordinary/deep chaos depths, several loops: same bounded density and safe spawns.
for(const loop of [1,10,30])for(let zoneId=0;zoneId<40;zoneId++) {
    run(`game=mergeDefaults({season:${loop},currentZoneId:${zoneId},maxZoneId:39});
        window.zone=getZone(${zoneId});window.plan=getZoneExplorationPlan(zone);
        window.map=actExplorationMap.forRun(plan);window.packs=createExplorationPacks(zone,map,plan.bossStages);`);
    const counts=copy(`(()=>{
        const ordinary=packs.filter(pack=>pack.stage===null),roomPacks=ordinary.filter(pack=>!pack.anchor);
        return {base:roomPacks.length*Math.min(9,3+(zone.packExtra||0)),total:ordinary.reduce((n,p)=>n+p.aliveIds.length,0),
            sizes:roomPacks.map(p=>p.aliveIds.length),elites:ordinary.reduce((n,p)=>n+p.eliteIds.length,0),
            expectedElites:map.rooms.filter(room=>room.role==='elite').length,bosses:packs.filter(p=>p.stage!==null).length,
            expectedBosses:plan.bossStages,patrol:packs.filter(p=>p.anchor).map(p=>({count:p.waiting.length,anchor:p.anchor}))};
    })()`);
    assert.ok(counts.total/counts.base>=1.25 && counts.total/counts.base<=1.31, `zone ${zoneId} loop ${loop}: bounded increase`);
    assert.ok(counts.sizes.every(n=>n>=3 && n<=9),'room formations stay within the nine-monster cap');
    assert.equal(counts.elites,counts.expectedElites,'extra enemies are ordinary, not additional elites');
    assert.equal(counts.bosses,counts.expectedBosses,'boss stage count is unchanged');
    assert.ok(counts.patrol.length<=1 && counts.patrol.every(p=>p.count===3),'at most one small road group');
    assert.equal(run(`packs.every(pack=>new Set(pack.waiting.map(e=>e.gx+','+e.gy)).size===pack.waiting.length)`),true,'no overlapping spawn cells within a formation');
    assert.equal(run(`packs.every(pack=>pack.waiting.every(enemy=>actExplorationMap.walkable(map,enemy)))`),true,'all monsters stand on walkable tiles');
    run(`window.freshRun=actExplorationState.create(plan,packs,getCombatTime());actExplorationState.validate(freshRun,[]);`);
}

// Existing atlas pack-size and encounter rules remain authored; an arena still contains bosses only.
run(`game=mergeDefaults({season:10,currentZoneId:29,maxZoneId:29});
    game.chaosRealm.unlocked=true;game.loopProgressCurrent.chaos20Cleared=true;
    game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();atlas.sync(game);
    game.atlas.stash.push(Object.assign(atlasMaps.create('roots_0',1,'normal'),{uid:game.atlas.nextUid++}));
    if(atlasRun.open(game.atlas.stash.at(-1).uid)!=='')throw Error('atlas fixture failed to open');
    window.atlasZone={...getZone(game.currentZoneId),packExtra:2};
    window.atlasPacks=createExplorationPacks(atlasZone,actExplorationMap.layout(1),1);`);
assert.equal(run('atlasPacks.filter(p=>p.anchor).length'),0);
// Encounter rooms (breach and the like) bring their own authored formations; ordinary atlas rooms hold five.
assert.equal(run('atlasPacks.filter(p=>p.stage===null&&!p.encounter).every(p=>p.waiting.length===5)'),true);
run(`window.arena=actExplorationMap.generated({style:'act',act:1,seed:'population-test',arena:true});
    window.arenaPacks=createExplorationPacks(getZone(0),arena,1);`);
assert.equal(run('arenaPacks.length'),1);
assert.equal(run('arenaPacks[0].waiting.length'),1);

// Loading the old three-monster room format must never inject the new extras halfway through a map.
run(`game=mergeDefaults({level:20,exp:333,currentZoneId:0});
    window.legacyMap=actExplorationMap.layout(1);
    window.legacyPacks=legacyMap.rooms.filter(r=>r.role!=='entry').map(room=>createActExplorationPack(getZone(0),room,room.role==='boss'?0:null));
    game.actExploration=actExplorationState.create({act:1},legacyPacks,getCombatTime());
    game.enemies=[];game.gridPlayer={gx:legacyMap.entry.gx,gy:legacyMap.entry.gy,gridMoveTimer:0};`);
const legacy=copy('game.actExploration.packs');
run('game=mergeDefaults(JSON.parse(serializeSaveState(game)))');
assert.deepEqual(copy('game.actExploration.packs'),legacy);
assert.deepEqual(copy('[game.level,game.exp]'),[20,333],'earned levels and XP are preserved, not rescaled');

run(`game=mergeDefaults({currentZoneId:6,maxZoneId:6});startEncounterRun(true);`);
const dense=copy('game.actExploration.packs');
run('game=mergeDefaults(JSON.parse(serializeSaveState(game)))');
assert.deepEqual(copy('game.actExploration.packs'),dense,'new patrols also restore without rerolling or duplication');
for(const mutation of [
    'pack.anchor={gx:-1,gy:0}',
    'pack.anchor=null',
    'pack.stage=0',
    'pack.eliteIds=[pack.aliveIds[0]]',
    'bad.actExploration.packs.push(JSON.parse(JSON.stringify(pack)))'
]) {
    run(`window.bad=JSON.parse(serializeSaveState(game));window.pack=bad.actExploration.packs.find(row=>row.anchor);${mutation}`);
    assert.throws(()=>run('mergeDefaults(bad)'),/탐험/,'corrupt patrol saves are rejected');
    assert.deepEqual(copy('game.actExploration.packs'),dense,'failed load leaves live enemies untouched');
}
console.log('120 act/chaos populations: bounded density, unchanged elites/bosses, valid terrain, old/new saves and patrol corruption: OK');
