const assert=require('node:assert/strict');
const {run}=require('./lib/replay-fixture')(417);
const copy=code=>JSON.parse(run(`JSON.stringify(${code})`));
function setup(loop=1,zone=0) {
    run(`game=mergeDefaults({season:${loop},currentZoneId:${zone},maxZoneId:39,heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',
        settings:{pauseGameOnOverlay:false},combatTimeMs:10000});game.moveTimer=0;game.combatHalted=false;
        game.playerHp=getPlayerStats().maxHp;startEncounterRun(true);window.r=game.actExploration;window.m=actExplorationMap.forRun(r);r.mode='manual';`);
}
function find(kind,loop) {
    for(let i=0;i<100;i++){setup(loop);if(run(`r.objects.entries.some(e=>e.kind==='${kind}')`))break;}
    run(`window.o=r.objects.entries.find(e=>e.kind==='${kind}');if(!o)throw Error('fixture object missing');
        Object.assign(game.gridPlayer,{gx:o.gx,gy:o.gy});actExplorationState.discover(r,game.gridPlayer);`);
}
let total=0,chests=0,events=0;
for(let zone=0;zone<10;zone++) {
    setup(15,zone);
    const rows=copy(`Array.from({length:100},(_,i)=>{
        const config={seed:Math.imul(i+1,2654435761)>>>0,loop:15,allowEvent:true,excludedRooms:[],quantity:1,rarity:0};
        const objects=actExplorationState.objects.create(r,config),again=actExplorationState.objects.create(r,config);
        actExplorationState.objects.validate({...r,objects});
        const important=objects.entries.filter(e=>!['pot','crate'].includes(e.kind));
        return {count:objects.entries.length,chests:objects.entries.filter(e=>e.kind==='chest').length,
            events:objects.entries.filter(actExplorationState.objects.isEvent).length,same:JSON.stringify(objects)===JSON.stringify(again),
            spaced:important.every((a,ai)=>important.slice(ai+1).every(b=>actExplorationMap.route(m,a,b).length>=6)),
            reachable:objects.entries.every(e=>actExplorationMap.route(m,m.entry,e,new Set([actExplorationMap.index(m,m.gate)])).length>0),
            unoccupied:objects.entries.every(e=>!r.packs.flatMap(p=>p.waiting).some(p=>p.gx===e.gx&&p.gy===e.gy))};
    })`);
    for(const row of rows){assert.ok(row.count<=16&&row.chests<=2&&row.events<=1);assert.ok(row.same&&row.spaced&&row.reachable&&row.unoccupied);total++;chests+=row.chests;events+=row.events;}
}
assert.ok(chests/total>.7&&chests/total<1.1);assert.ok(events/total>.28&&events/total<.42);
// 2026-10-05: events gathered in loops 2-5 (data/maps.js EXPLORATION_EVENT_LOOPS): sealed 2, ambush 4, nest 5, flat after 5.
for(const [loop,allowed] of [[1,[]],[2,['sealed']],[3,['sealed']],[4,['sealed','ambush']],[5,['sealed','ambush','nest']],[15,['sealed','ambush','nest']]]) {
    const observed=copy(`Array.from(new Set(Array.from({length:100},(_,i)=>actExplorationState.objects.eventKind(${loop},i/100)).filter(Boolean)))`);
    assert.deepEqual(observed.sort(),allowed.sort(),`loop ${loop} unlocks`);
    const share=copy(`Array.from({length:1000},(_,i)=>actExplorationState.objects.eventKind(${loop},i/1000)).filter(Boolean).length/1000`);
    assert.equal(share,{1:0,2:.1,3:.1,4:.2}[loop]??.35,`loop ${loop}: one draw, at most one event`);
}
setup();run('delete r.objects;game=mergeDefaults(JSON.parse(JSON.stringify(game)));');
assert.equal(run('game.actExploration.objects'),undefined,'legacy maps remain empty');
find('chest',1);const wallet=copy('game.currencies');
for(const mutation of ["objects.seed=-1","objects.entries[0].gx=-1","objects.entries[0].phase='broken'","objects.pendingId='missing'","objects.entries.push({...objects.entries[0]})"]) {
    assert.throws(()=>run(`(()=>{const raw=JSON.parse(JSON.stringify(game));raw.actExploration.${mutation};mergeDefaults(raw);})()`));
}
assert.deepEqual(copy('game.currencies'),wallet);
run('for(let i=0;i<100;i++)actExplorationProgress.objects.step(r,20);');assert.equal(run('o.phase'),'ready','no automatic opening');
assert.equal(run('actExplorationProgress.objects.request(o.id)'),true);assert.equal(run('o.phase'),'spent');
const chestCurrency = Object.entries(copy('game.currencies')).filter(([key, value]) => value > (wallet[key] || 0));
assert.ok(chestCurrency.length, 'chest pays currency for this fixture');
for (const [key, value] of chestCurrency) {
    assert.equal(run(`battleFx.filter(fx=>fx.loot?.currency==='${key}').at(-1)?.loot.count`), value - (wallet[key] || 0),
        'chest currency receipt has the count required by ground-drop presentation and sound');
}
const once=copy('({items:game.inventory,currency:game.currencies})');
assert.equal(run('actExplorationProgress.objects.request(o.id)'),false);assert.deepEqual(copy('({items:game.inventory,currency:game.currencies})'),once);
run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));r=game.actExploration;');
assert.equal(run("r.objects.entries.find(e=>e.kind==='chest').phase"),'spent');
find('chest',1);run('r.discovered=[];');assert.equal(run('actExplorationProgress.objects.request(o.id)'),false);
run('r.discovered=m.tiles.map((_,i)=>i);Object.assign(game.gridPlayer,m.entry);');assert.equal(run('actExplorationProgress.objects.request(o.id)'),true);
assert.equal(run('r.objects.pendingId'),run('o.id'));run('actExplorationState.selectDestination(r,m.entry)');assert.equal(run('r.objects.pendingId'),null);
run("actExplorationProgress.objects.request(o.id);window.prop=r.objects.entries.find(e=>['pot','crate'].includes(e.kind));actExplorationProgress.objects.area([prop]);");
assert.equal(run('r.objects.pendingId'),run('o.id'),'collateral damage preserves the explicit chest command');
run('game.isBackgroundCalculation=true;actExplorationProgress.objects.step(r,20);');
assert.equal(run('r.objects.pendingId'),null,'offline replay cancels pending manual interactions');
assert.equal(run('r.destination'),null);assert.equal(run('o.phase'),'ready');
run('delete game.isBackgroundCalculation;');
find('chest',1);
run(`r.mode='full';window.untouched=JSON.stringify(r.objects.entries);for(let i=0;i<300;i++){game.playerHp=getPlayerStats().maxHp;coreLoop(getCombatTime()+100);}`);
assert.equal(run('JSON.stringify(r.objects.entries)'),run('untouched'),'30 seconds of real basic-attack auto combat never targets or opens objects');
find('pot',1);run('window.kills=game.loopKills;window.elites=actExplorationState.remainingElites(r);actExplorationProgress.objects.area(r.objects.entries)');
assert.equal(run('o.phase'),'spent');assert.equal(run("r.objects.entries.filter(e=>e.kind==='chest').every(e=>e.phase==='ready')"),true);
assert.equal(run('game.loopKills'),run('kills'));assert.equal(run('actExplorationState.remainingElites(r)'),run('elites'));
find('crate',1);run("applySkillGemCommand({type:'hit',targets:[],splashCells:[{gx:o.gx,gy:o.gy}]},getPlayerStats());");assert.equal(run('o.phase'),'spent');
find('pot',1);
run(`window.cast=skillGemCasts.createState();window.enemy={id:900001,hp:100,gx:o.gx,gy:o.gy};
    window.stats=getPlayerStats();stats.sSkill={...SKILL_DB['폭발 혼합물'],nativeCastId:47};
    skillGemCasts.start(cast,{id:47,name:'폭발 혼합물',stats,source:{gx:o.gx-1,gy:o.gy},enemies:[enemy],now:10000,visuals:false});
    skillGemCasts.update(cast,{source:game.gridPlayer,enemies:[],now:14000}).forEach(c=>applySkillGemCommand(c,stats));`);
assert.equal(run('o.phase'),'spent','empty-target native explosion has actual contact geometry');
for(const [name,expected] of [['기본 공격','ready'],['유성 낙화','spent'],['원소 포션 투척','spent']]) {
    find('pot',1);
    run(`{game.activeSkill='${name}';window.stats=getPlayerStats();window.enemy={id:900002,hp:100,gx:o.gx,gy:o.gy};
        const stages=buildSkillHitSequence(game.activeSkill,stats.sSkill,[{enemy,mult:1}]);
        queuePendingSkillStageHits(stages,stats,{skillName:game.activeSkill,baseDelayMs:500});processPendingSkillStageHits();}`);
    assert.equal(run('o.phase'),'ready','no break on windup');
    run('game.combatTimeMs+=10000;processPendingSkillStageHits();');
    assert.equal(run('o.phase'),expected,`${name}: only area hits may break a prop at a dead monster location`);
}
find('pot',1);
run(`{const origin=[[1,1],[1,-1],[-1,1],[-1,-1]].map(([x,y])=>({gx:o.gx+x,gy:o.gy+y})).find(c=>actExplorationMap.walkable(m,c,true));
    if(!origin)throw Error('wave fixture needs a walkable diagonal');Object.assign(game.gridPlayer,origin);
    game.activeSkill='불멸의 진동';window.stats=getPlayerStats();window.enemy={id:900003,hp:100,gx:o.gx,gy:o.gy};
    queuePendingSkillStageHits(buildSkillHitSequence(game.activeSkill,stats.sSkill,[{enemy,mult:1}]),stats,{skillName:game.activeSkill,baseDelayMs:500});
    game.combatTimeMs+=650;processPendingSkillStageHits();}`);
assert.equal(run('o.phase'),'ready','diamond wave has not yet reached the diagonal at distance two');
run('game.combatTimeMs+=200;processPendingSkillStageHits();');assert.equal(run('o.phase'),'spent');
for(const [kind,loop,waves] of [['sealed',5,1],['nest',15,2]]) {
    find(kind,loop);const elite=run('actExplorationState.remainingElites(r)');
    run('actExplorationProgress.objects.step(r,100);');assert.equal(run('o.phase'),'ready');
    assert.equal(run('actExplorationProgress.objects.request(o.id)'),true);assert.equal(run('o.phase'),'warning');
    run(`game=mergeDefaults(JSON.parse(serializeSaveState(game)));r=game.actExploration;o=r.objects.entries.find(e=>e.kind==='${kind}');`);
    for(let wave=1;wave<=waves;wave++) {
        run('actExplorationProgress.objects.step(r,1200);');assert.equal(run('o.phase'),'active');assert.equal(run('o.wave'),wave);
        assert.equal(run('actExplorationState.remainingElites(r)'),elite);run('actExplorationState.validate(r,game.enemies);');
        assert.throws(()=>run(`(()=>{const raw=JSON.parse(JSON.stringify(game));raw.actExploration.packs=raw.actExploration.packs.filter(p=>!p.objectId);raw.enemies=[];mergeDefaults(raw);})()`));
        run(`for(const enemy of [...game.enemies].filter(e=>e.explorationPack.startsWith(o.id+':')&&e.hp>0)){enemy.hp=0;handleEnemyDeath(enemy,getPlayerStats());}`);
    }
    assert.equal(run('o.phase'),'spent');run('actExplorationState.validate(r,game.enemies);');
}
find('ambush',10);run('actExplorationProgress.objects.step(r,20);');assert.equal(run('o.phase'),'warning');assert.equal(run('game.enemies.length'),0);
run('actExplorationProgress.objects.step(r,1200);');assert.equal(run('o.phase'),'active');
setup(15,29);
run(`game.chaosRealm.unlocked=true;game.loopProgressCurrent.chaos20Cleared=true;
    game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(n=>n.id);contentProgression.sync();atlas.sync(game);
    game.atlas.completed=atlas.nodes.filter(n=>n.tier<=3).map(n=>n.id);
    for(const id of ['l_r','l_a1','l_a2','l_aN','l_b1','l_b2','l_bN'])if(atlasPassives.allocate(game,id))throw Error('passive fixture');
    game.atlas.stash.push({...atlasMaps.create('roots_0',1,'normal'),uid:game.atlas.nextUid++});
    if(atlasRun.open(game.atlas.stash.at(-1).uid))throw Error('atlas open');startEncounterRun(true);game.moveTimer=0;
    r=game.actExploration;m=actExplorationMap.forRun(r);o=r.objects.entries.find(e=>e.kind==='chest')||r.objects.entries[0];
    Object.assign(game.gridPlayer,{gx:o.gx,gy:o.gy});actExplorationState.discover(r,game.gridPlayer);actExplorationProgress.objects.request(o.id);
    window.id=o.id;game=mergeDefaults(JSON.parse(serializeSaveState(game)));startEncounterRun(true);r=game.actExploration;`);
assert.ok(run('r.objects.quantity')>1);assert.ok(run('r.objects.rarity')>0);
assert.equal(run('r.objects.entries.find(e=>e.id===id).phase'),'spent');
assert.equal(run('r.objects.entries.some(actExplorationState.objects.isEvent)'),false,'no duplicate atlas event lottery');
console.log(`objects: ${total} placements; mean chests ${(chests/total).toFixed(2)}, events ${(events/total).toFixed(2)}; clicks, areas, waves, saves, atlas portals: OK`);
