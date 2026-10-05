// 탐험 오브젝트 보완(2026-10-05): 서 있는 오브젝트(상자 · 항아리 · 목재 상자 · 알집)는 칸을 차지해 영웅도 몬스터도 올라서지 않고,
// 배치가 방 · 대기 무리 · 보스 관문으로 가는 길을 끊지 않으며, 열린 상자의 전리품은 상자 옆 빈칸에 떨어진다. 자동 사냥은 봉인된
// 보물함만 찾아가 열고 일반 상자 · 항아리 · 목재 상자는 그대로 둔다. 사건이 처음 열리는 루프(2 · 4 · 5)에 한 줄 안내가 뜬다.
// 실제 걸음(coreLoop)과 실제 배치(create)로 확인한다. 난수는 replay fixture의 고정 시드(경계)다.
const assert = require('node:assert/strict');
const { run } = require('./lib/replay-fixture')(611);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));
function setup(loop = 1, zone = 0) {
    run(`game=mergeDefaults({season:${loop},currentZoneId:${zone},maxZoneId:39,heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',
        settings:{pauseGameOnOverlay:false},combatTimeMs:10000});game.moveTimer=0;game.combatHalted=false;
        game.playerHp=getPlayerStats().maxHp;startEncounterRun(true);window.r=game.actExploration;window.m=actExplorationMap.forRun(r);r.mode='manual';
        game.enemies.forEach(e=>{e.hp=0;});game.enemies=[];r.packs.forEach(p=>{p.waiting=[];p.aliveIds=[];});`);
}
function find(kind, loop = 1) {
    for (let i = 0; i < 100; i++) { setup(loop); if (run(`r.objects.entries.some(e=>e.kind==='${kind}')`)) break; }
    run(`window.o=r.objects.entries.find(e=>e.kind==='${kind}');if(!o)throw Error('fixture object missing');
        window.side=actExplorationMap.neighbors(m,o).find(c=>!actExplorationState.objects.solidCells(r).has(c.gx+','+c.gy));
        Object.assign(game.gridPlayer,side);actExplorationState.discover(r,side);`);
}
const walk = (steps = 60) => run(`for(let i=0;i<${steps};i++){game.playerHp=getPlayerStats().maxHp;coreLoop(getCombatTime()+100);}`);

// Placement never cuts the way: every room centre, waiting pack and the boss gate stay reachable around standing objects.
for (let zone = 0; zone < 10; zone++) {
    setup(5, zone);
    const broken = copy(`Array.from({length:60},(_,i)=>{
        const fresh={...r,packs:JSON.parse(JSON.stringify(r.packs))};
        const objects=actExplorationState.objects.create(fresh,{seed:Math.imul(i+7,2654435761)>>>0,loop:5,allowEvent:true,excludedRooms:[],quantity:1,rarity:0});
        const blocked=new Set(objects.entries.filter(actExplorationState.objects.solid).map(e=>actExplorationMap.index(m,e)));
        const targets=[m.gate,...m.rooms];
        return targets.filter(t=>!(t.gx===m.entry.gx&&t.gy===m.entry.gy)&&!actExplorationMap.route(m,m.entry,t,blocked).length).length;
    }).reduce((a,b)=>a+b,0)`);
    assert.equal(broken, 0, `act ${zone + 1}: standing objects never cut a room or the gate off`);
}

// A standing pot takes its cell: a command onto it is refused, walking past it never enters it; once broken it is floor.
find('pot');
assert.equal(run('actExplorationState.selectDestination(r,{gx:o.gx,gy:o.gy})'), false, 'a move command onto a standing pot is refused');
const far = copy(`(()=>{const q=[side],seen=new Set([side.gx+','+side.gy]),solid=actExplorationState.objects.solidCells(r);
    for(let i=0;i<q.length;i++)for(const n of actExplorationMap.neighbors(m,q[i])){const k=n.gx+','+n.gy;if(seen.has(k)||solid.has(k))continue;seen.add(k);q.push(n);}
    return q.find(c=>Math.abs(c.gx-o.gx)+Math.abs(c.gy-o.gy)===2&&(c.gx===o.gx||c.gy===o.gy))||null;})()`);
if (far) {
    run(`actExplorationState.selectDestination(r,${JSON.stringify(far)});window.trail=[];`);
    run(`for(let i=0;i<80;i++){coreLoop(getCombatTime()+100);trail.push(game.gridPlayer.gx+','+game.gridPlayer.gy);}`);
    assert.equal(run(`trail.includes(o.gx+','+o.gy)`), false, 'walking past a pot goes around it');
}
run('actExplorationProgress.objects.request(o.id);'); walk(30);
assert.equal(run('o.phase'), 'spent', 'a click from two cells away walks up and breaks the pot');
assert.equal(run('actExplorationState.selectDestination(r,{gx:o.gx,gy:o.gy})'), true, 'a broken pot is floor');

// An opened chest keeps standing; its loot falls on a free neighbour, not under it.
find('chest');
run('window.before=battleFx.filter(fx=>fx.loot).length;actExplorationProgress.objects.request(o.id);');
assert.equal(run('o.phase'), 'spent');
assert.equal(run(`actExplorationState.objects.solidCells(r).has(o.gx+','+o.gy)`), true, 'an opened chest still takes its cell');
const cells = copy('battleFx.filter(fx=>fx.loot).slice(before).map(fx=>fx.loot.sourceCell)');
assert.ok(cells.length > 0, 'the chest dropped loot');
assert.ok(cells.every(c => c && !(c.gx === copy('o.gx') && c.gy === copy('o.gy'))), 'no loot lies under the chest');
assert.ok(cells.every(c => Math.max(Math.abs(c.gx - copy('o.gx')), Math.abs(c.gy - copy('o.gy'))) === 1), 'the loot lies beside it');

// Automatic exploration walks to a discovered sealed chest and opens it; an ordinary chest stays shut. Manual mode waits.
find('sealed', 5);
run(`r.mode='manual';Object.assign(game.gridPlayer,side);`); walk(30);
assert.equal(run('o.phase'), 'ready', '직접 이동 never opens the sealed chest');
run(`r.mode='full';const away=actExplorationMap.neighbors(m,side).find(c=>!(c.gx===o.gx&&c.gy===o.gy)&&!actExplorationState.objects.solidCells(r).has(c.gx+','+c.gy));
    if(away)Object.assign(game.gridPlayer,away);`); walk(40);
assert.notEqual(run('o.phase'), 'ready', 'auto exploration opened the sealed chest');
const ordinary = copy(`r.objects.entries.filter(e=>['chest','pot','crate'].includes(e.kind)).map(e=>e.phase)`);
assert.ok(ordinary.every(phase => phase === 'ready'), 'ordinary chests, pots and crates wait for a click');
assert.ok(copy(`game.enemies.filter(e=>e.hp>0).every(e=>!actExplorationState.objects.solidCells(r).has(e.gx+','+e.gy))`), 'event monsters never stand on objects');

// The first loop of each event names it once.
for (const [loop, key] of [[2, 'exploration_event_sealed'], [4, 'exploration_event_ambush'], [5, 'exploration_event_nest']]) {
    run(`game=mergeDefaults({season:${loop - 1},heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',settings:{pauseGameOnOverlay:false}});
        tutorialQueue.length=0;game.seenTutorials=[];`);
    run(`game.season=${loop};Object.entries(EXPLORATION_EVENT_NOTICES).forEach(([kind,n])=>{if(game.season===n.loop)queueTutorialNotice('exploration_event_'+kind,n.title,n.body);});`);
    assert.equal(copy(`tutorialQueue.filter(t=>t.key==='${key}').length`), 1, `loop ${loop} announces its event`);
}
console.log('exploration objects: standing cells, open ways, loot beside chests, sealed chests on auto, loop notices: OK');
