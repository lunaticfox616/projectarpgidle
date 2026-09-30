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
    return { resist: enemy.resF - plain.resF, pack: zone.atlasPackExtra, hp: zone.mapHpMul, hazard: !!zone.trialHazard, quantity: zone.atlasLootQuantity,
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
assert.match(run(`atlasRun.open(${copy('game.atlas.stash[0].uid')})`), /이미 열린 지도/, 'one map at a time');

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

// ---------------------------------------------------------------- auto-map
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
    return { unlocked: state.atlas.unlocked, journey: 'worldTreeJourney' in state, zone: state.currentZoneId, stash: state.atlas.stash.length };
})()`);
assert.equal(migrated.unlocked, true, 'the journey unlock carries over to the atlas');
assert.equal(migrated.journey, false, 'the journey ledger is gone');
assert.equal(migrated.zone, 0, 'a save standing in a journey node is moved to a valid zone');

run(`game.currentZoneId=29;atlasRun.open(game.atlas.stash[0].uid);`);
assert.equal(run('game.currentZoneId'), 'atlas_map');
const inMapSave = copy(`(() => { const state = mergeDefaults(JSON.parse(serializeSaveState(game))); return { zone: state.currentZoneId, run: !!state.atlas.run }; })()`);
assert.deepEqual(inMapSave, { zone: 'atlas_map', run: true }, 'a save inside a map resumes the map');
const brokenRun = copy(`(() => { const raw = JSON.parse(serializeSaveState(game)); raw.atlas.run.map.node = 'nowhere'; const state = mergeDefaults(raw);
    return { zone: state.currentZoneId, run: state.atlas.run }; })()`);
assert.deepEqual(brokenRun, { zone: 0, run: null }, 'a corrupt open map is refused and the hero stands in a valid zone');

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
