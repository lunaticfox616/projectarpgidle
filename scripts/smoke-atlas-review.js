// Atlas review fixes (2026-09-30, docs/atlas-endgame-20260930.md 사용자 결정 반영): each case failed before its fix.
// Seeded low-tier drops, guardian drops by the map's tier, fragments on maps without rooms, order-free content rolls, cancel
// refunds, rooms kept empty across portals, the settlement pause (save, portals, result), closed-map recovery, 귀환 젬 on the last
// portal, save-boundary caps, loadout trim, wide-map void rifts, wallet-only currency names.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { run } = fixture(77);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));
let tick = 0;
const advance = (count = 1) => { for (let n = 0; n < count; n++) run(`coreLoop(${1800000000000 + (++tick) * 100})`); };
const until = (condition, limit, label) => {
    for (let n = 0; n < limit && !run(condition); n++) advance();
    assert.ok(run(condition), label);
};

run(`
    game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',level:100,
        combatTimeMs:1800000000000,settings:{pauseGameOnOverlay:false,mapCompleteAction:'nextZone',showDeathNotice:false}});
    game.season=10;game.maxZoneId=29;game.currentZoneId=29;game.chaosRealm.unlocked=true;
    game.equipment['무기']={id:90001,slot:'무기',name:'검사',rarity:'rare',baseStats:[{id:'flatDmg',val:1000000},{id:'flatHp',val:1000000}],stats:[]};
    game.playerHp=getPlayerStats().maxHp;game.loopProgressCurrent.chaos20Cleared=true;atlasRun.onChaos20();
    var constant = value => () => value;
    var stamp = (node, tier = atlas.effectiveTier(game, atlas.node(node))) => { const map = atlasMaps.create(node, tier); map.uid = game.atlas.nextUid++; game.atlas.stash.unshift(map); return map; };
`);

// ---------------------------------------------------------------- drops with seeds
run('game.atlas.seeds=2;game.atlas.stash=[];');
const outside = copy(`atlas.dropFromKill(game, { type: 'abyss', depth: 25 }, { isBoss: true }, constant(0.001))`);
assert.equal(outside.length, 1, 'with seeds the way back in still drops a map (it used to find no tier 1~3 node)');
assert.equal(outside[0].tier, 5, 'the lowest reachable tier: 1 + 2 seeds × 2');
const node7 = copy(`atlas.nodes.find(node => node.region === 'roots' && node.kind === 'map' && node.tier >= 7 && node.tier < 13).id`);
run(`game.atlas.seeds=3;game.atlas.completed=['roots_7'];atlas.begin(game, stamp('${node7}').uid, 29, constant(0.5));`);
assert.ok(run('game.atlas.run.map.tier') >= 13, 'three seeds lift the node to 13+');
const bossDrops = copy(`atlas.dropFromKill(game, atlas.zone(game), { isBoss: true }, constant(0.001)).map(map => map.node)`);
assert.ok(bossDrops.includes('roots_g'), 'a guardian map drops by the map tier shown (seeds count), not the base node tier');
run('atlas.cancel(game);game.atlas.seeds=0;game.atlas.stash=[];');

// ---------------------------------------------------------------- fragments, rooms and cancel
run(`game.atlas.fragments={breach:1,maps:1};game.atlas.loadout=['breach','maps'];atlas.begin(game, stamp('roots_g').uid, 29, constant(0.5));`);
const arena = copy('{ fragments: game.atlas.run.fragments, encounters: game.atlas.run.encounters, stock: game.atlas.fragments }');
assert.deepEqual(arena.fragments, ['maps'], 'a guardian arena has no ordinary room: the breach fragment is not used');
assert.deepEqual(arena.encounters, [], 'and no content room is listed');
assert.deepEqual(arena.stock, { breach: 1, maps: 0 });
run('atlas.cancel(game);');
assert.deepEqual(copy('game.atlas.fragments'), { breach: 1, maps: 1 }, 'cancel refunds what was spent');
run(`game.atlas.completed=['roots_0','roots_1','roots_2','roots_3','roots_4','roots_5'];game.atlas.passives=['b_r','b_c1','b_c2','b_cN'];
    atlas.begin(game, stamp('roots_0').uid, 29, constant(0.1));`);
assert.deepEqual(copy('game.atlas.fragments'), { breach: 1, maps: 1 }, 'the keep passive saved both (roll 0.1 < 36%)');
run('atlas.cancel(game);');
assert.deepEqual(copy('game.atlas.fragments'), { breach: 1, maps: 1 }, 'and cancel does not refund what never left the stock');
run('game.atlas.passives=[];game.atlas.stash=[];game.atlas.fragments={};game.atlas.loadout=[];');

const shares = copy(`(() => {
    const bonus = { encounterExtra: 0 }, counts = {};
    for (const type of atlasEncounters.types) { bonus[type] = 40 - ATLAS.encounters[type].chance; counts[type] = 0; }
    let seed = 5; const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000);
    for (let i = 0; i < 20000; i++) for (const type of atlasEncounters.roll(bonus, [], random)) counts[type]++;
    return Object.values(counts);
})()`);
const mean = shares.reduce((a, b) => a + b) / shares.length;
assert.ok(shares.every(count => Math.abs(count - mean) < mean * 0.08), 'equal chances give equal rooms, whatever the list order: ' + shares);

// ---------------------------------------------------------------- a real map: rooms stay empty across a portal
const mapA = copy(`stamp('roots_0', 1).uid`);
assert.equal(run(`atlasRun.open(${mapA})`), '');
until('game.atlas.run && game.atlas.run.cleared.length >= 2', 3000, 'rooms are emptied in the real combat loop');
const emptied = copy('game.atlas.run.cleared');
assert.equal(copy('mergeDefaults(JSON.parse(serializeSaveState(game))).atlas.run.cleared').join(), emptied.join(), 'the emptied rooms are saved');
run(`handlePlayerDefeat(getZone(game.currentZoneId),getPlayerStats(),'test',{noToast:true});`);
assert.equal(run('game.atlas.run.portals'), 2);
until(`game.actExploration && game.actExploration.zoneId === 'atlas_map' && game.moveTimer <= 0`, 400, 'the hero re-enters the same map');
const packsBack = copy('game.actExploration.packs.map(pack => [pack.roomId, pack.aliveIds.length])');
const refilled = packsBack.filter(([room, alive]) => emptied.includes(room) && alive > 0);
assert.deepEqual(refilled, [], 'rooms emptied before the portal stay empty (no second full clear)');
assert.ok(packsBack.some(([, alive]) => alive > 0), 'the rest of the map is still there');

// ---------------------------------------------------------------- the settlement pause of an auto-map chain
run(`game.atlas.autoMap=true;stamp('roots_1', 1);`);
until(`!!game.atlas.run && game.atlas.run.map.uid !== ${mapA}`, 6000, 'the map is cleared and auto-map opens the next');
assert.equal(run('!!(game.actExploration && game.actExploration.departure)'), true, 'the cleared map stays through the settlement pause');
assert.equal(run('game.actExploration.departure.zoneId'), 'atlas_map');
const pauseSave = copy(`(() => { const loaded = mergeDefaults(JSON.parse(serializeSaveState(game))); return { zone: loaded.actExploration.departure.zoneId, run: !!loaded.atlas.run }; })()`);
assert.deepEqual(pauseSave, { zone: 'atlas_map', run: true }, 'a save taken in the pause loads (it used to be marked corrupt)');
const result = copy('game.atlas.lastResult');
assert.equal(result.outcome, 'complete', 'the finished map\'s result stays while the next map runs');
assert.ok(result.loot && typeof result.loot.currencies === 'object', 'with its own loot receipt');
const portals = run('game.atlas.run.portals');
run(`atlasRun.leave('마을 귀환');`);
assert.equal(run('game.atlas.run.portals'), portals, 'leaving during the pause spends no portal of a map never entered');
for (let n = 0; n < 200 && run('!!(game.actExploration && game.actExploration.departure)'); n++) advance();
run('game.atlas.autoMap=false;');

// ---------------------------------------------------------------- 마을 귀환 규칙(예전 귀환 젬), a closed map, the defeat order
until(`game.currentZoneId === 'atlas_map' && game.moveTimer <= 0`, 400, 'in the next map');
run('game.atlas.run.portals=1;returnToTownByRule();');
assert.equal(run('game.atlas.run && game.atlas.run.portals'), 1, 'the return rule never spends the last portal (it would close the map)');
run('game.atlas.run.portals=2;returnToTownByRule();');
assert.equal(run('game.atlas.run.portals'), 1, 'with more left it returns as before');
run(`game.atlas.run.portals=1;handlePlayerDefeat(getZone(game.currentZoneId),getPlayerStats(),'test',{noToast:true});`);
assert.equal(run('game.atlas.run'), null, 'the last portal closes the map');
assert.equal(run('game.currentZoneId'), 29, 'and the defeat lays out the return zone');
run(`game.currentZoneId='atlas_map';`);
advance();
assert.equal(run('game.currentZoneId'), 29, 'a return into a closed map (a content coming back) recovers to the frontier');

// ---------------------------------------------------------------- save boundary and loadout
const bounded = copy(`(() => {
    const raw = JSON.parse(serializeSaveState(game));
    raw.atlas.nextUid = 1e300;
    raw.atlas.stash = [{ uid: 5, node: 'roots_0', tier: 1, rarity: 'constructor', mods: [] }, { uid: 6, node: 'roots_0', tier: 1, rarity: 'rare', mods: [] }];
    raw.atlas.run = { map: { uid: 7, node: 'roots_1', tier: 1, rarity: 'normal', mods: [] }, portals: 2, drops: [], found: Array(60).fill('maps'),
        fragments: ['packs', 'elites', 'maps', 'boss'], spent: ['packs', 'nope'], cleared: ['a', 7, 'a'], encounters: ['constructor', 'breach'], bonus: {} };
    raw.atlas.lastResult = { nodeId: 'roots_0', tier: 1, outcome: 'complete', loot: { currencies: { magicBud: 3.7, toString: 5, bogus: 2 }, equipmentCount: -3 } };
    const atlasState = mergeDefaults(raw).atlas;
    return { next: atlasState.nextUid, stash: atlasState.stash.map(map => map.uid), found: atlasState.run.found.length, fragments: atlasState.run.fragments,
        spent: atlasState.run.spent, cleared: atlasState.run.cleared, encounters: atlasState.run.encounters, loot: atlasState.lastResult.loot };
})()`);
assert.equal(bounded.next, 8, 'an unsafe nextUid falls back past the saved uids');
assert.deepEqual(bounded.stash, [6], 'an inherited-key rarity is not a rarity');
assert.equal(bounded.found, 50);
assert.deepEqual(bounded.fragments, ['packs', 'elites', 'maps', 'boss'], 'four slots of fragments survive a reload');
assert.deepEqual([bounded.spent, bounded.cleared, bounded.encounters], [['packs'], ['a'], ['breach']]);
assert.deepEqual(bounded.loot, { currencies: { magicBud: 3 }, equipmentCount: 0 });
run(`game.atlas.run=null;game.atlas.seeds=4;game.atlas.completed=['roots_0','roots_1','roots_2','roots_3','roots_4','roots_5'];
    game.atlas.passives=['b_r','b_a1','b_a2','b_aN','b_k1'];game.atlas.fragments={packs:1,elites:1,maps:1};atlas.setLoadout(game,['packs','elites','maps']);`);
assert.equal(run('game.atlas.loadout.length'), 3, 'the third slot passive holds three');
assert.equal(run('atlasEpoch.rebirth(game)'), '');
assert.equal(run('game.atlas.loadout.length'), run('atlas.slots(game)'), 'a rebirth trims the loadout to the slots left');

// ---------------------------------------------------------------- wide maps: void rifts and wallet-only currencies
assert.equal(run(`isMapProgressHeld({ type: 'abyss' }, { active: true })`), false, 'a wide map is never held by a void rift (its walk pauses in fights)');
assert.equal(run(`(() => { const saved = game.actExploration; game.actExploration = null; const held = isMapProgressHeld({ type: 'abyss' }, { active: true }); game.actExploration = saved; return held; })()`),
    true, 'the 9×8 board still holds its plan');
run(`game.currentZoneId=getAbyssZoneIdForDepth(6);startMoving(false);`);
until('!!(game.actExploration && game.actExploration.motion)', 600, 'the hero walks a chaos map');
run('game.actExploration.status="cleared";');
until('!game.actExploration.motion', 60, 'a cleared map finishes the step it was taking (it used to freeze mid-step)');
advance(20);
assert.equal(run('!!game.actExploration.motion'), false, 'and starts no new walk');
const spawned = copy(`(() => { const rift = { pendingWave: true, spawnedCount: 0, totalToSpawn: 2, spawnTick: 3 };
    spawnVoidBreachReinforcement(getZone(game.currentZoneId), rift); const enemy = game.enemies[game.enemies.length - 1];
    return { rift: !!enemy.fromVoidRift, cell: hasGridCell(enemy) }; })()`);
assert.deepEqual(spawned, { rift: true, cell: true }, 'a reinforcement has its cell the tick it spawns (a save then stays valid)');
const rows = copy(`actExplorationUi.collectLootRows({ equipment: [], growthItems: [], jewels: [], cores: [], currencies: { colonyTrace: 2, astralCore: 1 }, flasks: [], gems: [] })
    .map(row => row.name)`);
assert.deepEqual(rows, ['군락지 흔적', '성핵 조각'], 'escrowed wallet-only counters are named (the loot list used to throw every frame)');
console.log('atlas review fixes: seeded drops, guardian tier, arena fragments, fair rooms, cancel, portals keep rooms, pause save/portal/result, 귀환 젬, recovery, save caps, loadout trim, void rift steps, currency names: OK');
