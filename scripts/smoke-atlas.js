// 세계수 아틀라스 (data/atlas.js · js/atlas-maps.js · js/atlas.js · js/atlas-run.js, docs/atlas-endgame-20260930.md 3절):
// the node graph is whole, map items follow their rarity rules and crafting roles, a tier is exactly as hard as its chaos depth
// at that depth's loop, and a map opened from the device is fought through the real combat loop to completion, auto-map,
// portals, save round trips and the loop reset.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { runtime, run } = fixture(41);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));

// ---------------------------------------------------------------- the graph
const graph = copy(`(() => {
    const maps = atlas.nodes.filter(node => node.kind === 'map'), ids = atlas.nodes.map(node => node.id), open = new Set(maps.filter(node => node.tier === 1).map(node => node.id));
    for (let grew = true; grew;) { grew = false; for (const [a, b] of atlas.links) for (const [x, y] of [[a, b], [b, a]]) if (open.has(x) && !open.has(y)) { open.add(y); grew = true; } }
    const positions = atlas.nodes.map(node => atlas.position(node));
    return { count: maps.length, unique: new Set(ids).size, all: ids.length, reached: open.size, guardians: atlas.nodes.filter(node => node.kind === 'guardian').length,
        tiers: [...new Set(maps.map(node => node.tier))].sort((a, b) => a - b),
        linksValid: atlas.links.every(([a, b]) => ids.includes(a) && ids.includes(b) && a !== b),
        inside: positions.every(({ x, y }) => x > 3 && x < 97 && y > 3 && y < 97),
        regions: ATLAS.regions.map(region => maps.filter(node => node.region === region.id).length) };
})()`);
assert.equal(graph.count, 45);
assert.equal(graph.unique, graph.all, 'unique ids');
assert.equal(graph.all, 45 + 5 + 1, '45 maps, 5 guardians, the pinnacle');
assert.equal(graph.guardians, 5);
assert.deepEqual(graph.regions, [9, 9, 9, 9, 9], 'five regions of nine nodes');
assert.deepEqual(graph.tiers, Array.from({ length: 16 }, (_, i) => i + 1), 'every tier 1..16 exists');
assert.ok(graph.linksValid && graph.inside);
assert.equal(graph.reached, 50, 'completing nodes outward from tier 1 opens every map and guardian (the pinnacle opens with tickets)');

// ---------------------------------------------------------------- map items and crafting
run(`
    var seeded = (seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; })(99);
    var kinds = map => map.mods.map(entry => atlasMaps.mod(entry.id).kind);
    var count = (list, kind) => list.filter(value => value === kind).length;
`);
const rolls = copy(`(() => {
    const out = [];
    for (let i = 0; i < 300; i++) {
        const rarity = ['normal', 'magic', 'rare'][i % 3], map = atlasMaps.create('roots_0', 1, rarity, seeded), k = kinds(map);
        out.push({ rarity, mods: map.mods.length, prefix: count(k, 'prefix'), suffix: count(k, 'suffix'), unique: new Set(map.mods.map(entry => entry.id)).size });
    }
    return out;
})()`);
assert.ok(rolls.filter(row => row.rarity === 'normal').every(row => row.mods === 0));
assert.ok(rolls.filter(row => row.rarity === 'magic').every(row => row.mods >= 1 && row.mods <= 2 && row.prefix <= 1 && row.suffix <= 1));
assert.ok(rolls.filter(row => row.rarity === 'rare').every(row => row.mods >= 4 && row.mods <= 6 && row.prefix <= 3 && row.suffix <= 3));
assert.ok(rolls.every(row => row.unique === row.mods), 'a mod never appears twice');

const crafted = copy(`(() => {
    const map = atlasMaps.create('roots_0', 1, 'normal', seeded), steps = {};
    steps.alchemyOnNormal = atlasMaps.craft(map, 'formlessDew', seeded) === '' && map.rarity === 'rare' && map.mods.length >= 4;
    steps.scour = atlasMaps.craft(map, 'blightSpore', seeded) === '' && map.rarity === 'normal' && map.mods.length === 0;
    steps.transmute = atlasMaps.craft(map, 'magicBud', seeded) === '' && map.rarity === 'magic' && map.mods.length >= 1;
    steps.alchemyOnMagicRefused = atlasMaps.craft(map, 'formlessDew', seeded) !== '' && map.rarity === 'magic';
    const before = map.mods.length;
    steps.regal = atlasMaps.craft(map, 'sapBud', seeded) === '' && map.rarity === 'rare' && map.mods.length === before + 1;
    const rollsBefore = map.mods.map(entry => entry.roll).join();
    steps.divine = atlasMaps.craft(map, 'goldenRule', seeded) === '' && map.mods.map(entry => entry.roll).join() !== rollsBefore;
    const annulFrom = map.mods.length;
    steps.annul = atlasMaps.craft(map, 'pruningShears', seeded) === '' && map.mods.length === annulFrom - 1;
    for (let i = 0; i < 6; i++) atlasMaps.craft(map, 'deepWhetstone', seeded);
    steps.qualityCap = map.quality === ATLAS.quality.max;
    steps.qualityCounts = atlasMaps.effects(map).quantity >= ATLAS.quality.max;
    atlasMaps.craft(map, 'emberBranch', seeded);
    steps.corruptLocks = map.corrupted && atlasMaps.craft(map, 'blightSpore', seeded) !== '' && map.rarity !== 'normal';
    steps.unknownRefused = atlasMaps.craft(map, 'hiveKey', seeded) !== '';
    return steps;
})()`);
assert.deepEqual(Object.entries(crafted).filter(([, ok]) => !ok).map(([key]) => key), [], 'every currency keeps its crafting role on maps');

const outcomes = copy(`(() => {
    const seen = {};
    for (let i = 0; i < 400; i++) seen[atlasMaps.corrupt(atlasMaps.create('roots_4', 7, 'magic', seeded), seeded)] = true;
    const top = atlasMaps.create('trunk_8', ATLAS.tierCap, 'normal', seeded);
    for (let i = 0; i < 50; i++) { top.corrupted = false; atlasMaps.corrupt(top, seeded); }
    return { seen: Object.keys(seen).sort(), capped: top.tier === ATLAS.tierCap };
})()`);
assert.deepEqual(outcomes.seen, ['extra', 'none', 'reforge', 'tier'], 'corruption can do nothing, raise the tier, add a mod past the limit or reforge');
assert.ok(outcomes.capped, 'a corrupted map never goes past the top tier');

const enemyMods = copy(`(() => {
    const map = { uid: 1, node: 'garden_3', tier: 6, rarity: 'rare', quality: 0, corrupted: false,
        mods: [{ id: 'monsterResist', roll: 1 }, { id: 'packSize', roll: 1 }, { id: 'monsterLife', roll: 0 }, { id: 'burningGround', roll: 0.5 }] };
    const zone = atlas.preview(game, map), enemy = createEnemy(zone, { at: 0, count: 1 }, 0), plain = createEnemy(atlas.preview(game, { ...map, mods: [] }), { at: 0, count: 1 }, 0);
    return { resist: enemy.resF - plain.resF, pack: zone.packExtra, hp: zone.mapHpMul, hazard: !!zone.trialHazard, quantity: zone.atlasLootQuantity,
        drop: enemy.dropMul / plain.dropMul, rarityMul: enemy.lootRarityMul };
})()`);
assert.equal(enemyMods.pack, 2, 'pack size adds monsters to every room pack');
assert.ok(Math.abs(enemyMods.hp - 1.2) < 1e-9, 'monster life at roll 0 is its minimum');
assert.ok(enemyMods.resist > 0 && enemyMods.hazard, 'enemy mods and floor hazards reach combat');
assert.ok(enemyMods.quantity > 20 && Math.abs(enemyMods.drop - (1 + enemyMods.quantity / 100)) < 1e-9 && enemyMods.rarityMul > 1, 'map quantity/rarity reach loot');

// ---------------------------------------------------------------- difficulty = chaos depth at its loop
const difficulty = copy(`[1, 16].map(tier => {
    const zone = atlas.preview(game, atlasMaps.create(atlas.nodes.find(node => node.tier === tier).id, tier, 'normal'));
    const saved = { season: game.season, endless: game.abyssEndlessDepth, loops: game.loopCount };
    const boss = createEnemy(zone, { at: 0, count: 1, boss: true, storyStage: 0 }, 0);
    Object.assign(game, { season: zone.fixedSeason, abyssEndlessDepth: zone.equivalentDepth, loopCount: zone.fixedSeason - 1 });
    const reference = createEnemy(getZone(getAbyssZoneIdForDepth(zone.equivalentDepth)), { at: 0, count: 1, boss: true }, 0);
    Object.assign(game, { season: saved.season, abyssEndlessDepth: saved.endless, loopCount: saved.loops });
    return { depth: zone.equivalentDepth, season: zone.fixedSeason, boss: boss.maxHp, reference: reference.maxHp, loot: getRealmEquipmentHiddenTierCap(zone) };
})`);
assert.deepEqual(difficulty.map(row => [row.depth, row.season]), [[20, 10], [50, 40]], '1등급 = 루프 10 혼돈 20, 16등급 = 루프 40 심화 50');
assert.ok(difficulty.every(row => row.boss === row.reference), 'a node boss is exactly the chaos boss of its depth at that loop');
assert.deepEqual(difficulty.map(row => row.loot), [15, 20], 'equipment tier rises with the map tier');
assert.equal(copy(`[1, 30].map(season => { game.season = season; const hp = createEnemy(atlas.preview(game, atlasMaps.create('roots_0', 1)), { at: 0, count: 1, boss: true }, 0).maxHp; game.season = 1; return hp; })`)
    .reduce((a, b) => a === b), true, 'the loop count never inflates an atlas map');

// ---------------------------------------------------------------- a full stash must not swallow the guardian route
const stashSafety = copy(`(() => {
    const state = mergeDefaults({ season: 10 });
    state.loopProgressCurrent.chaos20Cleared = true;
    state.atlas.unlocked = true;
    state.atlas.completed = atlas.nodes.filter(node => node.kind === 'map').map(node => node.id);
    state.atlas.stash = Array.from({ length: ATLAS.stashCap }, (_, i) => ({ ...atlasMaps.create('roots_8', 15), uid: i + 1 }));
    state.atlas.nextUid = ATLAS.stashCap + 1;
    const original = JSON.stringify(state.atlas.stash.slice(1));
    atlas.begin(state, 1, 29, () => .5);
    const activeBefore = JSON.stringify(state.atlas), activeReason = atlas.discard(state, 2);
    const activeSafe = activeBefore === JSON.stringify(state.atlas);
    // Even if normal maps already filled the held-drop limit, the boss's guardian remains eligible for the one free slot.
    state.atlas.run.drops = Array.from({ length: ATLAS.stashCap }, () => ({ ...atlasMaps.create('roots_0', 1), uid: state.atlas.nextUid++ }));
    const rolled = atlas.dropFromKill(state, atlas.zone(state), { isBoss: true }, () => 0);
    const guardian = rolled.find(map => atlas.node(map.node).kind === 'guardian');
    const heldGuardian = state.atlas.run.drops.some(map => map.uid === guardian.uid);
    const heldCount = state.atlas.run.drops.length;
    atlas.complete(state);
    const storedGuardian = state.atlas.stash.find(map => map.uid === guardian.uid);
    const existingSafe = JSON.stringify(state.atlas.stash.slice(0, ATLAS.stashCap - 1)) === original;
    const roundTrip = mergeDefaults(JSON.parse(JSON.stringify(state)));
    const restoredGuardian = roundTrip.atlas.stash.find(map => map.uid === guardian.uid);
    const missingBefore = JSON.stringify(state.atlas), missingReason = atlas.discard(state, -1);
    const missingSafe = missingBefore === JSON.stringify(state.atlas);
    const discardBefore = JSON.stringify(state.atlas.stash.filter(map => map.uid !== 2)), nextUid = state.atlas.nextUid;
    const discardReason = atlas.discard(state, 2);
    const discardedOnlySelected = JSON.stringify(state.atlas.stash) === discardBefore && state.atlas.nextUid === nextUid;
    // Unfinished guardians win over repeat guardians, without deleting any previously stored maps.
    atlas.begin(state, 3, 29, () => .5);
    state.atlas.completed.push('roots_g');
    state.atlas.stash.push({ ...atlasMaps.create('roots_0', 1), uid: state.atlas.nextUid++ });
    state.atlas.run.drops = ['roots_0', 'roots_g', 'trunk_g'].map(node => ({ ...atlasMaps.create(node, 16), uid: state.atlas.nextUid++ }));
    const unfinishedUid = state.atlas.run.drops[2].uid;
    atlas.complete(state);
    return { activeReason, activeSafe, heldGuardian, heldCount, guardian, storedGuardian, restoredGuardian, existingSafe,
        missingReason, missingSafe, discardReason, discardedOnlySelected, unfinishedKept: state.atlas.stash.some(map => map.uid === unfinishedUid),
        capped: state.atlas.stash.length === ATLAS.stashCap };
})()`);
assert.ok(stashSafety.activeReason && stashSafety.activeSafe, 'an active run blocks stash deletion without partial changes');
assert.ok(stashSafety.heldGuardian && stashSafety.heldCount === run('ATLAS.stashCap'), 'guardian map survives the held reward cap');
assert.deepEqual(stashSafety.storedGuardian, stashSafety.guardian, 'the guardian map, including its uid, wins the last free stash slot');
assert.deepEqual(stashSafety.restoredGuardian, stashSafety.guardian, 'guardian access survives a save round trip');
assert.ok(stashSafety.existingSafe && stashSafety.unfinishedKept && stashSafety.capped, 'only new rewards compete; unfinished guardians take priority');
assert.ok(stashSafety.missingReason && stashSafety.missingSafe, 'a stale uid never deletes another map');
assert.equal(stashSafety.discardReason, '');
assert.ok(stashSafety.discardedOnlySelected, 'explicit discard removes just that uid and never rewrites remaining uids');

// ---------------------------------------------------------------- unlock, starter maps, the device and a real map
let tick = 0;
const advance = (count = 1) => { for (let n = 0; n < count; n++) run(`coreLoop(${1800000000000 + (++tick) * 100})`); };
run(`
    game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',level:100,
        combatTimeMs:1800000000000,settings:{pauseGameOnOverlay:false,mapCompleteAction:'nextZone'}});
    game.season=10;game.maxZoneId=29;game.currentZoneId=29;game.chaosRealm.unlocked=true;
    game.equipment['무기']={id:90001,slot:'무기',name:'진행 검사',rarity:'rare',baseStats:[{id:'flatDmg',val:1000000},{id:'flatHp',val:1000000}],stats:[]};
    game.playerHp=getPlayerStats().maxHp;
`);
assert.match(run('atlas.lockReason(game)'), /혼돈 20/, 'locked before this loop clears chaos 20');
assert.deepEqual(copy('atlas.sync(game)'), [], 'nothing arrives before the chaos 20 clear');
run('game.loopProgressCurrent.chaos20Cleared=true;atlasRun.onChaos20();');
assert.equal(run('game.atlas.unlocked'), true);
assert.equal(run('game.atlas.stash.length'), ATLAS_STARTER(), 'the loop starts with its starter maps');
function ATLAS_STARTER() { return run('ATLAS.starter.count'); }
assert.deepEqual(copy('atlas.sync(game)'), [], 'starter maps come once per loop');
assert.ok(copy('game.atlas.stash').every(map => map.tier === 1 && run(`atlas.node('${map.node}').tier`) === 1), 'a fresh atlas starts at tier 1');

const first = copy('game.atlas.stash[0]');
assert.equal(run(`atlasRun.open(${first.uid})`), '');
const opened = copy(`{zone:game.currentZoneId,run:!!game.atlas.run,stash:game.atlas.stash.length,type:getZone(game.currentZoneId).type,
    exploration:getZone(game.currentZoneId).exploration,portals:game.atlas.run.portals,returnZone:game.atlas.run.returnZoneId}`);
assert.equal(opened.zone, 'atlas_map');
assert.equal(opened.type, 'atlasMap');
assert.equal(opened.stash, ATLAS_STARTER() - 1, 'opening consumes the map');
assert.equal(opened.portals, 3);
assert.equal(opened.returnZone, 29, 'the map remembers where it was opened');
assert.equal(opened.exploration.seed, 'atlas:' + first.uid, 'the layout is the map item: the same map keeps its layout');
assert.match(run(`atlasRun.open(${copy('game.atlas.stash[0].uid')})`), /열린 지도를 먼저/, 'one map at a time');

while (tick < 4000 && run('!!game.atlas.run')) advance();
const cleared = copy('{result:game.atlas.lastResult,completed:game.atlas.completed,zone:game.currentZoneId,stash:game.atlas.stash.length}');
assert.equal(cleared.result.outcome, 'complete', 'the node boss falls in the real combat loop');
assert.ok(cleared.result.first);
assert.deepEqual(cleared.completed, [first.node]);
assert.equal(cleared.zone, 29, 'without auto-map the hero returns to where the map was opened');
assert.equal(cleared.stash, ATLAS_STARTER() - 1 + cleared.result.drops, 'the map drops held by the run reach the stash');
assert.ok(cleared.result.drops >= 1, 'the node boss always drops a map');
const neighbours = copy(`atlas.neighbours('${first.node}').map(id => atlas.status(game, id))`);
assert.ok(neighbours.every(status => status !== 'locked'), 'completing a node opens its neighbours');
assert.equal(run(`atlas.points(game)`), 1 + Number(cleared.result.bonus));
const held = run('game.atlas.stash.length');
assert.match(run(`game.pendingLoopDecision=true;atlasRun.open(game.atlas.stash[0].uid)`), /루프 정산/, 'no map opens while the loop decision waits');
assert.equal(run('game.atlas.stash.length'), held, 'and no map is spent');
run('game.pendingLoopDecision=false;');

// Completion rewards belong to the finished map, including its guaranteed unique, material and seed receipts.
{
    const {run: settle}=fixture(731);
    const read=code=>JSON.parse(settle(`JSON.stringify(${code})`));
    settle(`game=mergeDefaults({...game,season:50});game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;
        game.settings.mapCompleteAction='stop';atlas.sync(game);
        for(const key of ATLAS.pinnacle.tickets)game.currencies[key]=1;`);
    assert.equal(settle('atlasRun.openPinnacle()'),'');
    settle('atlasRun.finish(getZone(game.currentZoneId));');
    assert.equal(settle('game.atlas.lastResult.seed'),true);
    assert.equal(settle('game.atlas.lastResult.seeds'),1);
    assert.equal(settle('game.atlas.lastResult.endgame.awakened'),true);
    for(const [key,amount] of read('ATLAS.pinnacle.rewards'))assert.equal(settle(`game.atlas.lastResult.loot.currencies['${key}']`),amount);
    settle(`for(const item of Object.values(ATLAS_ENDGAME.guardianShears))game.atlas.endgame.items[item]=1;
        game.atlas.endgame.witness=4;`);
    assert.equal(settle("atlasRun.openEndgame('apex_gardener')"),'');
    const before=read('game.currencies');
    settle('atlasRun.finish(getZone(game.currentZoneId));');
    const result=read('game.atlas.lastResult'),wallet=read('game.currencies');
    for(const [key,amount] of read("atlasEndgame.def('apex_gardener').rewards")) {
        assert.equal(wallet[key]-(before[key] || 0),amount);
        assert.equal(result.loot.currencies[key],amount,'completion currency is in this map receipt');
    }
    assert.equal(result.endgame.invite,1);
    const unique=settle("atlasEndgame.def('apex_gardener').unique");
    assert.ok(result.loot.items.some(item=>item.name===unique),'guaranteed unique appears in the actual loot receipt');
    const gear=read('game.inventory');
    assert.ok(gear.some(item=>item.name===unique));
    settle('game=mergeDefaults(JSON.parse(serializeSaveState(game)));atlasRun.finish(getZone(game.currentZoneId));');
    assert.deepEqual(read('game.atlas.lastResult'),result,'result survives save/load and repeated completion');
    assert.deepEqual(read('game.currencies'),wallet,'loading the result never pays it again');
    assert.deepEqual(read('game.inventory.map(({instanceId,...item})=>item)'),gear,'same earned equipment after identity migration');
    assert.equal(settle('atlasRun.open(game.atlas.stash[0].uid)'), '');
    const beforeVariant=read('game.currencies');
    const variantKill="recordKillProgress({isBoss:true,bossVariant:BOSS_VARIANTS.kinds[0].id,name:'변이 보스 검사'});";
    settle(variantKill);
    for(const [key,amount] of read('BOSS_VARIANTS.reward.firstKill')) {
        assert.equal(settle(`game.currencies['${key}']`)-(beforeVariant[key] || 0),amount);
        assert.equal(settle(`game.explorationLoot.currencies['${key}']`),amount,'variant first-kill gift belongs to this map receipt');
    }
    const variantWallet=read('game.currencies'),variantReceipt=read('game.explorationLoot');
    settle(variantKill);
    assert.deepEqual(read('game.currencies'),variantWallet,'repeat variant kill does not pay the first-kill gift twice');
    assert.deepEqual(read('game.explorationLoot'),variantReceipt,'repeat variant kill does not duplicate its receipt');
    settle(`game.atlas.endgame.items.shearRoots=98;game.atlas.run.endgame.items={shearRoots:5};atlasRun.finish(getZone(game.currentZoneId));`);
    assert.deepEqual(read('game.atlas.lastResult.endgame.items'),[['shearRoots',1]],'receipt counts only materials accepted under the cap');
    assert.equal(settle('game.atlas.lastResult.loot.equipmentCount'),0,'next map does not inherit the last unique');
    const old=read('game.atlas.lastResult');delete old.seed;delete old.seeds;delete old.endgame;
    settle(`game.atlas.lastResult=${JSON.stringify(old)};game=mergeDefaults(JSON.parse(serializeSaveState(game)));`);
    assert.equal(settle('game.atlas.lastResult.endgame'),null,'older result saves are still accepted');
}

// Memory progress receipts survive saves without replacing the completion event's reward contract.
{
    const {run: memoryRun,runtime: memoryRuntime}=fixture(844);
    const read=code=>JSON.parse(memoryRun(`JSON.stringify(${code})`));
    memoryRun(`game=mergeDefaults({...game,season:50});game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;atlas.sync(game);
        game.atlas.stash=[{...atlasMaps.create('roots_0',1),uid:game.atlas.nextUid++}];
        atlas.begin(game,game.atlas.stash[0].uid,29,()=>.5);`);
    memoryRuntime.Math.random=()=>0;
    memoryRun('var receiptEvent=atlas.complete(game);');
    assert.deepEqual(read('game.atlas.lastResult.memory'),{foughtTier:0,newBest:false,ticket:{node:'roots_0',tier:1}});
    assert.deepEqual(read('receiptEvent.memory.ticket'),{node:'roots_0',name:memoryRun("atlas.node('roots_0').boss"),tier:1});
    assert.equal(memoryRun('receiptEvent.memory.spoils'),null,'the event still exposes memory payouts separately from the saved receipt');
    const beforePreview=read('game'),randomBeforePreview=memoryRuntime.Math.random;
    let previewDraws=0;
    memoryRuntime.Math.random=()=>{previewDraws++;return randomBeforePreview();};
    const preview=read("memoryDungeon.preview(game,'roots_0',1)");
    memoryRun("memoryDungeon.preview(game,'roots_0',1);memoryDungeon.overview(game);");
    assert.deepEqual(read('game'),beforePreview,'reading memory preparation never spends a ticket or changes progress');
    assert.equal(previewDraws,0,'repeated preparation does not advance reward or combat randomness');
    memoryRuntime.Math.random=randomBeforePreview;
    assert.equal(memoryRun("atlas.beginMemory(game,'roots_0',1,29,()=>.5)"),'');
    assert.deepEqual(read('[game.atlas.run.map.node,game.atlas.run.map.memory,game.atlas.run.map.tier]'),
        [preview.map.node,preview.tier,preview.map.tier],'the eventual entry uses the previewed memory and difficulty');
    memoryRun('receiptEvent=atlas.complete(game);');
    assert.deepEqual(read('game.atlas.lastResult.memory'),{foughtTier:1,newBest:true,ticket:{node:'roots_0',tier:2}});
    assert.equal(memoryRun('receiptEvent.memory.spoils.tier'),1);
    assert.equal(memoryRun('receiptEvent.memory.spoils.best'),true);
    assert.ok(read('receiptEvent.memory.spoils.rewards').length,'the event retains the actual currency payout list');
    const result=read('game.atlas.lastResult'),progress=read('game.atlas.memory'),wallet=read('game.currencies');
    memoryRun('atlas.complete(game);game=mergeDefaults(JSON.parse(serializeSaveState(game)));atlas.complete(game);');
    assert.deepEqual(read('game.atlas.lastResult'),{...result,loot:null},'memory result survives restoration and repeated completion');
    assert.deepEqual(read('game.atlas.memory'),progress,'loading a progress receipt never grants another ticket or advances its best tier');
    assert.deepEqual(read('game.currencies'),wallet,'a presentation receipt never pays currencies');
    memoryRun("memoryDungeon.give(game,'roots_0',1);atlas.beginMemory(game,'roots_0',1,29,()=>.5);atlas.complete(game);");
    assert.equal(memoryRun('game.atlas.lastResult.memory.newBest'),false,'a repeated tier is not a new record');
    memoryRun("memoryDungeon.give(game,'roots_0',5);atlas.beginMemory(game,'roots_0',5,29,()=>.5);atlas.close(game,'failed');");
    const failed={foughtTier:5,newBest:false,ticket:null};
    assert.deepEqual(read('game.atlas.lastResult.memory'),failed,'failed memory fights retain their fought tier only');
    const afterFailure=read('game.atlas.memory');
    memoryRun("atlas.close(game,'failed');game=mergeDefaults(JSON.parse(serializeSaveState(game)));");
    assert.deepEqual(read('game.atlas.lastResult.memory'),failed);
    assert.deepEqual(read('game.atlas.memory'),afterFailure,'repeated failure and load never refund the spent memory');
    const base=read('game.atlas.lastResult');delete base.memory;
    memoryRun(`game.atlas.lastResult=${JSON.stringify(base)};atlas.normalize(game);`);
    assert.equal(memoryRun('game.atlas.lastResult.memory'),null,'older saves invent no memory progress');
    for(const [raw,expected] of [
        [{foughtTier:'2',newBest:true,ticket:{node:'missing',tier:1}},null],
        [{foughtTier:1.5,newBest:true,ticket:{node:'roots_0',tier:'2'}},null],
        [{foughtTier:6,newBest:true,ticket:null},null],
        [{foughtTier:2,newBest:'true',ticket:{node:'roots_0',tier:99}},{foughtTier:2,newBest:false,ticket:null}],
        [{foughtTier:0,newBest:true,ticket:{node:'roots_0',tier:5}},{foughtTier:0,newBest:false,ticket:{node:'roots_0',tier:5}}]
    ]) {
        memoryRun(`game.atlas.lastResult={...${JSON.stringify(base)},outcome:'complete',memory:${JSON.stringify(raw)}};atlas.normalize(game);`);
        assert.deepEqual(read('game.atlas.lastResult.memory'),expected,'invalid memory receipt fields are dropped, never clamped into invented progress');
    }
    memoryRun(`game.atlas.lastResult={...${JSON.stringify(base)},memory:{foughtTier:5,newBest:true,ticket:{node:'roots_0',tier:2}}};atlas.normalize(game);`);
    assert.deepEqual(read('game.atlas.lastResult.memory'),failed,'a corrupted failed result cannot claim a win or a ticket');
    memoryRun("memoryDungeon.give(game,'trunk_0',5);atlas.beginMemory(game,'trunk_0',5,29,()=>.5);atlas.complete(game);");
    assert.equal(memoryRun("memoryDungeon.count(game,'trunk_0',5)"),0,'the final held memory was spent');
    memoryRun('game=mergeDefaults(JSON.parse(serializeSaveState(game)));');
    assert.deepEqual(read("memoryDungeon.overview(game).filter(row=>row.node.id==='trunk_0').map(row=>[row.best,row.counts])"),
        [[5,[0,0,0,0,0]]],'a completed memory remains in records after its last ticket is spent and the save reloads');
}

// A completion reports only fragments actually stored under the per-kind cap, including after save/load.
for(const before of [0,98,99]) {
    const {run: fragmentRun}=fixture(845);
    const read=code=>JSON.parse(fragmentRun(`JSON.stringify(${code})`));
    fragmentRun(`game.season=10;game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;atlas.sync(game);
        atlas.begin(game,game.atlas.stash[0].uid,29,()=>.5);game.atlas.fragments[ATLAS.fragments[0].id]=${before};
        game.atlas.run.found=Array(3).fill(ATLAS.fragments[0].id);atlas.complete(game);`);
    const stored=Math.min(3,99-before),result=read('game.atlas.lastResult');
    assert.equal(fragmentRun('game.atlas.fragments[ATLAS.fragments[0].id]'),before+stored);
    assert.equal(result.fragments,stored,'completion receipt counts the stock increase');
    assert.equal(result.lostFragments,3-stored,'completion records fragments discarded at the cap');
    fragmentRun('atlas.complete(game);game=mergeDefaults(JSON.parse(serializeSaveState(game)));atlas.complete(game);');
    assert.equal(fragmentRun('game.atlas.fragments[ATLAS.fragments[0].id]'),before+stored,'repeated completion and restored receipt never pay fragments twice');
    assert.deepEqual(read('[game.atlas.lastResult.fragments,game.atlas.lastResult.lostFragments]'),[stored,3-stored]);
    fragmentRun('game.atlas.lastResult.lostFragments=999;atlas.normalize(game);');
    assert.equal(fragmentRun('game.atlas.lastResult.lostFragments'),50,'corrupt overflow quantities stay bounded by the held-fragment cap');
    fragmentRun('delete game.atlas.lastResult.lostFragments;atlas.normalize(game);');
    assert.equal(fragmentRun('game.atlas.lastResult.lostFragments'),0,'older completion receipts invent no discarded fragments');
}

// Memory rewards use the map's entry snapshot, even if the player changes passives before completion.
for(const allocatedBefore of [true,false]) {
    const {run: memoryRun,runtime: memoryRuntime}=fixture(841);
    memoryRun(`game.season=50;game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;atlas.sync(game);
        game.atlas.completed=atlas.nodes.filter(node=>node.kind==='map').slice(0,5).map(node=>node.id);`);
    const allocate="for(const id of ['f_r','f_a1','f_a2','f_aN','f_k3'])atlasPassives.allocate(game,id);";
    if(allocatedBefore)memoryRun(allocate);
    assert.equal(memoryRun('atlasRun.open(game.atlas.stash[0].uid)'), '');
    const nodeId=memoryRun('game.atlas.run.map.node');
    if(allocatedBefore)assert.equal(memoryRun("atlasPassives.refund(game,'f_k3')"),'');
    else memoryRun(allocate);
    memoryRuntime.Math.random=()=>0.04; // Between the normal map's 3% and its entry bonus's 4.5%.
    memoryRun('atlas.complete(game);atlas.complete(game);');
    assert.equal(memoryRun(`memoryDungeon.count(game,'${nodeId}',1)`),Number(allocatedBefore),'only the entry bonus applies, once');
}

// A dropped memory can fill the spent ticket's slot. Loop cancellation returns that ticket without losing it on save/load.
{
    const {run: memoryRun}=fixture(842);
    const read=code=>JSON.parse(memoryRun(`JSON.stringify(${code})`));
    memoryRun(`game.season=50;game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;atlas.sync(game);
        game.atlas.memory.tickets.apex_gardener=[0,0,MEMORY_DUNGEON.ticketCap,0,0];`);
    assert.equal(memoryRun("atlasRun.openMemory('apex_gardener',3)"),'');
    memoryRun("recordKillProgress({isBoss:true,bossVariant:BOSS_VARIANTS.kinds[0].id,name:'기억 변이 보스 검사'});");
    assert.equal(memoryRun("memoryDungeon.count(game,'apex_gardener',3)"),9);
    memoryRun(`game.loopProgressCurrent.bestAbyssDepth=getSeasonAbyssDepthCap(game.season);triggerSeasonReset({path:'chaos'});
        atlas.onLoopReset(game);game=mergeDefaults(JSON.parse(serializeSaveState(game)));`);
    assert.equal(memoryRun('game.season'),51);
    assert.equal(memoryRun("memoryDungeon.count(game,'apex_gardener',3)"),10,'one reserved refund survives load and repeated loop cleanup');
    assert.equal(memoryRun("memoryDungeon.give(game,'apex_gardener',3)"),false,'normal drops still stop at nine');
    memoryRun('game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;');
    assert.equal(memoryRun("atlasRun.openMemory('apex_gardener',3)"),'');
    assert.equal(memoryRun("memoryDungeon.count(game,'apex_gardener',3)"),9);
    memoryRun('atlas.cancel(game);atlas.cancel(game);game=mergeDefaults(JSON.parse(serializeSaveState(game)));');
    assert.equal(memoryRun("memoryDungeon.count(game,'apex_gardener',3)"),10,'reopening and cancelling cannot multiply the reserved refund');
    assert.deepEqual(read("memoryDungeon.normalize({tickets:{roots_0:[0,9,10,999,-1],unknown:[1,1,1,1,1]}}).tickets"),
        {roots_0:[0,9,10,10,0]},'older rows remain valid and corrupt counts stay bounded');
}

// ---------------------------------------------------------------- auto-map
{
    const {run: autoRun}=fixture(844);
    autoRun(`game=mergeDefaults({...game,season:50});game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;
        game.atlas.unlocked=true;game.atlas.autoMap=true;game.atlas.completed=['trunk_8'];
        game.atlas.stash=[{...atlasMaps.create('trunk_8',16),uid:1},{...atlasMaps.create('trunk_g',16),uid:2}];`);
    // 수호자 지도는 기본으로 자동에 들어간다(이전 저장도): 빠지면 뿌리 입장권이 끊겨 정점 진행이 조용히 멈춘다
    assert.equal(autoRun('game.atlas.autoGuardians'),true);
    assert.equal(autoRun('atlas.nextAuto(game,16).node'),'trunk_g','unfinished guardians still come first');
    autoRun('game.atlas.autoGuardians=false;game=mergeDefaults(JSON.parse(serializeSaveState(game)));');
    assert.equal(autoRun('atlas.nextAuto(game,16).node'),'trunk_8','turning guardians off survives save/load');
}
for(const action of ['nextZone','stop']) {
    const challenges=["memoryDungeon.give(game,'roots_0',1);atlasRun.openMemory('roots_0',1)",
        'atlasRun.openPinnacle()',"atlasRun.openEndgame('apex_gardener')",'atlasRun.openEndgame(ATLAS_ENDGAME.leagues[0].id)',
        'atlasBoard.sync(game);atlasBoard.roll(game,()=>0);atlasRun.openBoard()'];
    for(const open of challenges) {
        const {run: specialRun}=fixture(845);
        specialRun(`game=mergeDefaults({...game,season:50});game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;
            game.settings.mapCompleteAction='${action}';atlas.sync(game);game.atlas.autoMap=true;
            game.atlas.stash=[{...atlasMaps.create('roots_0',1),uid:900}];game.atlas.nextUid=901;
            game.atlas.endgame.kills.pinnacle=1;game.atlas.endgame.items=Object.fromEntries(Object.keys(ATLAS_ENDGAME.items).map(id=>[id,99]));
            for(const key of ATLAS.pinnacle.tickets)game.currencies[key]=1;`);
        assert.equal(specialRun(open),'');
        specialRun('atlasRun.finish(getZone(game.currentZoneId));');
        assert.equal(specialRun('game.atlas.run'),null,'a special challenge never opens an automatic map');
        assert.equal(specialRun('game.atlas.stash.some(map=>map.uid===900)'),true,'unchosen map stones remain in the stash');
        assert.equal(specialRun('game.currentZoneId'),29);
        assert.equal(specialRun('game.combatHalted'),action==='stop','special returns honor the completion action');
        specialRun('game=mergeDefaults(JSON.parse(serializeSaveState(game)));');
        assert.equal(specialRun('game.atlas.autoMap'),true,'special returns preserve the player auto-map setting');
    }
}
run(`game.atlas.autoMap=true;game.atlas.stash=game.atlas.stash.filter(map=>map.tier===1);`);
const autoFirst = copy('game.atlas.stash[0]');
run(`atlasRun.open(${autoFirst.uid})`);
while (tick < 9000 && run(`!!game.atlas.run && game.atlas.run.map.uid === ${autoFirst.uid}`)) advance();
const chained = copy('{run:game.atlas.run && game.atlas.run.map.uid,zone:game.currentZoneId,departure:!!(game.actExploration && game.actExploration.departure)}');
assert.ok(chained.run && chained.run !== autoFirst.uid, 'auto-map opens the next map from the stash after a completion');
assert.equal(chained.zone, 'atlas_map');
assert.ok(chained.departure, 'the cleared map stays on screen through the settlement pause');
for (let n = 0; n < 200 && run('!!(game.actExploration && game.actExploration.departure)'); n++) advance();
assert.equal(copy('game.actExploration && game.actExploration.source.seed'), 'atlas:' + chained.run, 'then the next map is laid out and walked');
advance(40);
assert.equal(copy('game.actExploration && game.actExploration.source.seed'), 'atlas:' + chained.run);

// ---------------------------------------------------------------- portals
run(`game.settings.showDeathNotice=false;game.atlas.autoMap=false;`);
const portalsBefore = run('game.atlas.run.portals');
run(`handlePlayerDefeat(getZone(game.currentZoneId),getPlayerStats(),'test',{noToast:true});`);
assert.equal(run('game.atlas.run.portals'), portalsBefore - 1, 'a death spends a portal and the map stays open');
assert.equal(run('game.currentZoneId'), 'atlas_map');
run(`handlePlayerDefeat(getZone(game.currentZoneId),getPlayerStats(),'test',{noToast:true});handlePlayerDefeat(getZone(game.currentZoneId),getPlayerStats(),'test',{noToast:true});`);
const failed = copy('{run:game.atlas.run,result:game.atlas.lastResult,zone:game.currentZoneId}');
assert.equal(failed.run, null, 'the last portal closes the map');
assert.equal(failed.result.outcome, 'failed');
assert.equal(failed.zone, 29, 'and the hero goes back');

// Failure preserves ordinary drops, loses held atlas rewards, and keeps those separate through portals and save/load.
for(const mode of ['abandon','outside-abandon','last-portal-defeat']) {
    const {run: failedRun}=fixture(843);
    const read=code=>JSON.parse(failedRun(`JSON.stringify(${code})`));
    failedRun(`game=mergeDefaults({...game,season:50});game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;
        game.settings.showDeathNotice=false;game.settings.mapCompleteAction='stop';atlas.sync(game);`);
    assert.equal(failedRun('atlasRun.open(game.atlas.stash[0].uid)'),'');
    failedRun(`combatLootReceipts.capture(game,()=>{
        awardCurrency('sapBud',2);
        actExplorationState.groundLoot.placeCurrency(game.actExploration,game.gridPlayer,'sapBud',7);
    });game.atlas.run.endgame.items={shearRoots:120,voidSplinter:3};
    game.atlas.run.found=[ATLAS.fragments[0].id,ATLAS.fragments[0].id];
    game.atlas.run.drops=[{...game.atlas.stash[0],uid:game.atlas.nextUid++}];`);
    let expectedSapBud=9;
    if(mode!=='last-portal-defeat') {
        failedRun('changeZone(29);');
        assert.equal(failedRun('game.currencies.sapBud'),9,'leaving already collects floor currency');
        if(mode==='outside-abandon') {
            const receipt=read('game.explorationLoot');
            failedRun(`grantEnemyLoot(createEnemy(getZone(29),{at:0,count:1,boss:true},0));
                combatLootReceipts.capture(game,()=>awardCurrency('sapBud',11));
                game=mergeDefaults(JSON.parse(serializeSaveState(game)));`);
            assert.deepEqual(read('game.explorationLoot'),receipt,'outside combat and rewards never enter the held map receipt, including after load');
            expectedSapBud=failedRun('game.currencies.sapBud');
            assert.ok(expectedSapBud>=20,'the outside reward was actually granted');
        } else {
            assert.equal(failedRun('atlasRun.reenter()'),'');
            assert.equal(failedRun('game.explorationLoot.currencies.sapBud'),9,'the same map retains its receipt across portals');
        }
        failedRun('atlasRun.abandon();');
    } else failedRun('game.atlas.run.portals=1;handlePlayerDefeat(getZone(game.currentZoneId),getPlayerStats(),"test",{noToast:true});');
    const result=read('game.atlas.lastResult'),wallet=read('game.currencies');
    assert.equal(result.outcome,'failed');
    assert.equal(result.lost,1);
    assert.equal(result.fragments,0);
    assert.equal(result.lostFragments,2);
    assert.deepEqual(result.lostMaterials,[['shearRoots',120],['voidSplinter',3]],'losses report held quantities, not the 99-item stock cap');
    assert.equal(result.loot.currencies.sapBud,9);
    assert.equal(wallet.sapBud,expectedSapBud);
    assert.equal(result.endgame,null,'lost materials are never presented as completion gains');
    assert.equal(failedRun("atlasEndgame.count(game,'shearRoots')"),0);
    failedRun('atlasRun.abandon();atlas.usePortal(game);atlas.close(game,"failed");game=mergeDefaults(JSON.parse(serializeSaveState(game)));');
    assert.deepEqual(read('game.atlas.lastResult'),result,'repeated failure and reload keep the same receipt');
    assert.deepEqual(read('game.currencies'),wallet,'failure receipts never repay drops');
    assert.equal(failedRun('atlasRun.open(game.atlas.stash[0].uid)'),'');
    failedRun('atlasRun.finish(getZone(game.currentZoneId));');
    assert.deepEqual(read('[game.atlas.lastResult.lostFragments,game.atlas.lastResult.lostMaterials,game.atlas.lastResult.loot.currencies]'),[0,[],{}],
        'the next completion does not inherit failed-map losses or ordinary rewards');
    failedRun(`game.atlas.lastResult=${JSON.stringify(result)};delete game.atlas.lastResult.lostFragments;delete game.atlas.lastResult.lostMaterials;
        game=mergeDefaults(JSON.parse(serializeSaveState(game)));`);
    assert.deepEqual(read('[game.atlas.lastResult.lostFragments,game.atlas.lastResult.lostMaterials]'),[0,[]],'older failures have no invented loss quantities');
}

// ---------------------------------------------------------------- save boundary and the loop
run(`game.atlas.stash.push({uid:-4,node:'nowhere',tier:1,rarity:'rare',mods:[]},{uid:game.atlas.stash[0].uid,node:'roots_1',tier:2,rarity:'normal',mods:[]},
    {uid:900,node:'roots_1',tier:2,rarity:'magic',mods:[{id:'monsterLife',roll:2},{id:'bogus',roll:0.5},{id:'monsterCrit',roll:0.5},{id:'monsterCrit',roll:0.1}],quality:99});`);
const restored = copy(`(() => {
    const raw = JSON.parse(serializeSaveState(game)), once = mergeDefaults(raw), twice = mergeDefaults(JSON.parse(serializeSaveState(once)));
    return { once: once.atlas, twice: twice.atlas };
})()`);
assert.deepEqual(restored.once, restored.twice, 'normalization is idempotent');
const odd = restored.once.stash.find(map => map.uid === 900);
assert.deepEqual(odd.mods.map(entry => entry.id), ['monsterCrit'], 'unknown, out-of-range and duplicate mods are dropped');
assert.equal(odd.quality, 20);
assert.ok(!restored.once.stash.some(map => map.uid === -4 || map.node === 'nowhere'), 'corrupt maps are dropped');
assert.equal(new Set(restored.once.stash.map(map => map.uid)).size, restored.once.stash.length, 'uids stay unique');
assert.ok(restored.once.nextUid > Math.max(...restored.once.stash.map(map => map.uid)));

const migrated = copy(`(() => {
    const legacy = JSON.parse(serializeSaveState(game));
    delete legacy.atlas;
    legacy.worldTreeJourney = { version: 2, unlocked: true, guardians: [1, 2], stage: 2, cleared: ['2:worldtree_root'] };
    legacy.currentZoneId = 'worldtree_grove';
    const state = mergeDefaults(legacy);
    return { unlocked: state.atlas.unlocked, journey: 'worldTreeJourney' in state, zone: state.currentZoneId, stash: state.atlas.stash.length,
        progressZone: getAutoProgressZoneId(state.maxZoneId) };
})()`);
assert.equal(migrated.unlocked, true, 'the journey unlock carries over to the atlas');
assert.equal(migrated.journey, false, 'the journey ledger is gone');
assert.equal(migrated.zone, migrated.progressZone, 'a save standing in a journey node is moved to its furthest progress zone (not back to act 1)');

run(`game.currentZoneId=29;atlasRun.open(game.atlas.stash[0].uid);`);
assert.equal(run('game.currentZoneId'), 'atlas_map');
const inMapSave = copy(`(() => { const state = mergeDefaults(JSON.parse(serializeSaveState(game))); return { zone: state.currentZoneId, run: !!state.atlas.run }; })()`);
assert.deepEqual(inMapSave, { zone: 'atlas_map', run: true }, 'a save inside a map resumes the map');
const brokenRun = copy(`(() => { const raw = JSON.parse(serializeSaveState(game)); raw.atlas.run.map.node = 'nowhere'; const state = mergeDefaults(raw);
    return { zone: state.currentZoneId, run: state.atlas.run, progressZone: getAutoProgressZoneId(state.maxZoneId) }; })()`);
assert.deepEqual(brokenRun, { zone: brokenRun.progressZone, run: null, progressZone: brokenRun.progressZone }, 'a corrupt open map is refused and the hero stands in their furthest progress zone');

const kept = copy('{completed:game.atlas.completed,bonus:game.atlas.bonus,unlocked:game.atlas.unlocked,auto:game.atlas.autoMap}');
run('atlas.onLoopReset(game);');
const reset = copy('{stash:game.atlas.stash.length,run:game.atlas.run,completed:game.atlas.completed,bonus:game.atlas.bonus,unlocked:game.atlas.unlocked,auto:game.atlas.autoMap}');
assert.deepEqual([reset.stash, reset.run], [0, null], 'a new loop empties the stash and closes the map');
assert.deepEqual({ completed: reset.completed, bonus: reset.bonus, unlocked: reset.unlocked, auto: reset.auto }, kept, 'atlas progress survives the loop');

// ---------------------------------------------------------------- the way back in: chaos 20+ bosses
run(`game.currentZoneId=29;game.atlas.stash=[];`);
runtime.Math.random = () => 0.01;
const outside = copy(`atlas.dropFromKill(game, getZone(getAbyssZoneIdForDepth(22)), { isBoss: true }).map(map => map.tier)`);
assert.equal(outside.length, 1, 'a deep chaos boss can drop a map straight to the stash');
assert.ok(outside[0] >= 1 && outside[0] <= 3);
assert.equal(copy(`atlas.dropFromKill(game, getZone(getAbyssZoneIdForDepth(12)), { isBoss: true }).length`), 0, 'shallow chaos never does');
console.log('atlas: 45-node graph, map rarity/crafting rules, tier = chaos depth at its loop, real map clear, auto-map, portals, save/migration, loop reset: OK');

// Board rewards survive reload and cannot be settled twice. Independent game fixture.
for (const action of ['stop', 'nextZone']) {
    const {run: boardRun}=fixture(731);
    boardRun(`game.season=34;game.maxZoneId=29;game.currentZoneId=29;game.chaosRealm.unlocked=true;
        game.loopProgressCurrent.chaos20Cleared=true;game.settings.mapCompleteAction='${action}';
        game.equipment['무기']={id:90001,slot:'무기',name:'진행 검사',rarity:'rare',baseStats:[{id:'flatDmg',val:100000000},{id:'flatHp',val:100000000}],stats:[]};
        playerStatCache.invalidate();game.playerHp=getPlayerStats().maxHp;
        atlas.sync(game);atlasBoard.sync(game);atlasBoard.roll(game,()=>0);`);
    assert.equal(boardRun('atlasRun.openBoard()'),'');
    let ticks=0;
    while(ticks<6000 && boardRun('!!game.atlas.run'))boardRun(`coreLoop(${1800000000000+(++ticks)*100})`);
    assert.equal(boardRun('game.atlas.run'),null);
    assert.equal(boardRun('game.currentZoneId'),29);
    assert.equal(boardRun('game.atlas.board.gear'),1);
    assert.ok(boardRun('actExplorationState.current(game)'), 'completed board returns to exploration, never the legacy 9x8 arena');
    assert.ok(boardRun('getCombatGridSize().columns>9'));
    assert.equal(boardRun('game.combatHalted'),action==='stop');
    boardRun('game=mergeDefaults(JSON.parse(serializeSaveState(game)));');
    assert.ok(boardRun('actExplorationState.current(game)'), 'return room survives save/reload');
}
{
    const {run: boardRun}=fixture(730);
    boardRun("game.season=34;game.maxZoneId=29;game.currentZoneId=29;game.chaosRealm.unlocked=true;game.loopProgressCurrent.chaos20Cleared=true;atlas.sync(game);atlasBoard.sync(game);game.atlas.board.position=22;atlasBoard.roll(game,()=>0);");
    assert.equal(boardRun("atlas.beginBoard(game,29)"),'');
    boardRun("game=mergeDefaults(JSON.parse(JSON.stringify(game)));");
    assert.ok(boardRun("game.atlas.run.board && game.atlas.board.pending"));
    const dice=boardRun("game.atlas.board.dice");
    boardRun("atlas.usePortal(game);atlas.usePortal(game);");
    assert.equal(boardRun("game.atlas.board.dice"),dice);
    assert.equal(boardRun("game.atlas.board.pending"),null);
    assert.notEqual(boardRun("atlas.beginBoard(game,29)"),'','failed attempt cannot reopen for free');
    boardRun("atlasBoard.roll(game,()=>.5);atlas.beginBoard(game,29);");
    assert.equal(boardRun("game.atlas.board.dice"),dice-1);
    assert.ok(boardRun("atlas.complete(game).board.boss"));
    assert.equal(boardRun("atlas.complete(game)"),null);
    assert.equal(boardRun("game.atlas.board.lap"),1);
    assert.equal(boardRun("game.atlas.seeds"),0);
}
