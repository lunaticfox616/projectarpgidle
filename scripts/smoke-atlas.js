// 세계수 아틀라스 (data/atlas-chart.js · data/atlas.js · js/atlas-maps.js · js/atlas.js · js/atlas-run.js, docs/atlas-endgame-20260930.md 3절):
// the star chart (50 maps, 10 closed boss gates, one parent each, 시작 육분의) is whole and equals its source JSON, map items follow their
// rarity rules and crafting roles, a chart tier is exactly as hard as the chaos depth of its game tier at that depth's loop, a map opened
// from the device is fought through the real combat loop to completion, auto-map, portals, the runs of stage A2 (a stone of the map's own
// tier, one stone per newly opened map, the last portal's refund, the dew entry, 장비 상자 rolled from the run's stone, stones delivered
// over the stash cap), save round trips, the loop reset, and a save
// from before the chart (old node ids, game-tier stones, an open map) is moved once and never twice.
const fs = require('node:fs');
const chartTable = require('./build-atlas-chart.cjs');
const assert = require('node:assert/strict');
const replayFixture = require('./lib/replay-fixture');
// 지도 콘텐츠를 보는 검사라 트리의 새 줄(기억 던전, 방, 변이체 들)은 모두 가진 채로 시작한다.
const OWNED_ROWS = "game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.filter(def=>def.since===CONTENT_UNLOCK_TREE_VERSION).map(def=>def.id);";
const fixture = seed => {
    const made = replayFixture(seed);
    made.run(OWNED_ROWS);
    return made;
};
const { runtime, run } = replayFixture(41);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));

// ---------------------------------------------------------------- the chart table and its source
assert.equal(fs.readFileSync(chartTable.TARGET, 'utf8').replace(/\r\n/g, '\n'), chartTable.render(),
    'modules/data/atlas-chart.mjs equals modules/data/sources/atlas-structure.json (run node scripts/build-atlas-chart.cjs)');

// ---------------------------------------------------------------- the graph
const graph = copy(`(() => {
    const maps = atlas.nodes.filter(node => node.kind === 'map'), gates = atlas.nodes.filter(node => node.kind === 'gate'), ids = atlas.nodes.map(node => node.id);
    const state = mergeDefaults({}), open = () => maps.filter(node => atlas.status(state, node.id) === 'open').map(node => node.id);
    const before = open();
    state.atlas.sextant = true;
    const entry = open();
    let steps = 0;
    for (let next = open(); next.length; next = open()) { state.atlas.completed.push(...next); steps++; }
    const count = key => value => maps.filter(node => node[key] === value).length;
    return { count: maps.length, gates: gates.length, unique: new Set(ids).size, all: ids.length, before, entry, steps, reached: state.atlas.completed.length,
        tiers: [...new Set(maps.map(node => node.tier))].sort((a, b) => a - b), sides: ['solar', 'lunar', 'interior'].map(count('side')),
        regions: ATLAS.regions.map(region => count('region')(region.id)), chartRegions: ['roots', 'garden', 'veil', 'cloud', 'interior'].map(count('chartRegion')),
        oneParent: maps.every(node => node.parent === 'entry' || atlas.node(node.parent).kind === 'map'),
        parentsBelow: maps.every(node => node.parent === 'entry' ? node.tier === 1 : atlas.node(node.parent).tier === node.tier - 1),
        linksValid: atlas.links.every(([a, b]) => ids.includes(a) && ids.includes(b) && a !== b), links: atlas.links.length,
        routes: ATLAS.starChart.routes.length, hidden: ATLAS.starChart.routes.filter(route => route.hidden).length,
        inside: atlas.nodes.map(node => atlas.position(node)).every(({ x, y }) => x > 3 && x < 97 && y > 3 && y < 97),
        gateStatus: [...new Set(gates.map(node => atlas.status(state, node.id)))], gateKinds: gates.map(node => node.gate).sort(),
        legacy: ['roots_g', 'trunk_g', 'canopy_g', 'garden_g', 'sanctum_g', 'pinnacle'].map(id => [atlas.node(id).kind, atlas.nodes.includes(atlas.node(id)), atlas.status(state, id)]),
        content: ['sun1', 'sunWarmQuarry', 'sun4', 'inner1', 'inner2'].map(id => [atlas.node(id).boss, atlas.node(id).act, atlas.node(id).bossVisualId]),
        hosts: [atlas.hosts('roots_0'), atlas.hosts('garden_5'), atlas.hosts('trunk_0'), atlas.hosts('nowhere')] };
})()`);
assert.equal(graph.count, 50);
assert.equal(graph.gates, 10);
assert.equal(graph.unique, graph.all, 'unique ids');
assert.equal(graph.all, 60, '50 maps and 10 boss gates stand on the chart');
assert.deepEqual(graph.sides, [15, 15, 20], '태양 15, 달 15, 세계수 20');
assert.deepEqual(graph.chartRegions, [10, 5, 10, 5, 20]);
assert.deepEqual(graph.regions, [10, 20, 5, 5, 10], 'the chart regions land on the game regions roots, trunk, canopy, garden, sanctum');
assert.deepEqual(graph.tiers, Array.from({ length: 10 }, (_, i) => i + 1), 'chart tiers 1..10');
assert.ok(graph.oneParent && graph.parentsBelow, 'every map has one parent, one tier below it');
assert.ok(graph.linksValid && graph.inside);
assert.deepEqual([graph.routes, graph.hidden, graph.links], [62, 2, 58], '62 routes, two hidden, four of them leave the sextant');
assert.deepEqual(graph.before, [], 'nothing is open before 시작 육분의 is activated');
assert.deepEqual(graph.entry.sort(), ['inner1', 'inner2', 'moon1', 'sun1'], 'the sextant opens the four tier 1 maps');
assert.deepEqual([graph.reached, graph.steps], [50, 10], 'clearing maps outward opens every map, one tier at a time');
assert.deepEqual(graph.gateStatus, ['locked'], 'the boss gates stay closed whatever is cleared (stage C wires them)');
assert.deepEqual(graph.gateKinds, ['guardian', 'guardian', 'guardian', 'guardian', 'outer', 'outer', 'region', 'region', 'tree', 'tree']);
assert.deepEqual(graph.legacy, [...Array(5).fill(['guardian', false, 'locked']), ['pinnacle', false, 'locked']], 'the old guardians and pinnacle stay defined, off the chart and closed');
assert.deepEqual(graph.content, [['검은 뿌리의 잔영', 1, 'atlas-roots-0'], ['검은 뿌리의 잔영', 1, 'atlas-roots-0'], ['정원사의 흐린 메아리', 2, 'atlas-garden-0'], ['틈새 사냥꾼', 7, 'atlas-trunk-0'], ['틈새 사냥꾼', 7, 'atlas-trunk-0']],
    'a map borrows the rows of its region in branch order and starts over past the ninth');
assert.deepEqual(graph.hosts, [['sun1', 'sunWarmQuarry'], ['sun4'], ['inner1', 'innerGardenSeal', 'inner2', 'innerWillThreshold'], []], 'old node ids resolve to the maps that took their rows');

// Ancient paths must not unlock a final encounter by killing only one subordinate.
{
    const { run: gate } = fixture(86);
    // 예전 수호자의 처치 기록(endgame.kills)이 고대 존재의 조건을 잇는다: 천문도로 옮겨도 그 기록은 남는다.
    gate("game.atlas.endgame.kills.pinnacle=1;for(const id of ['roots_g','garden_g','canopy_g','sanctum_g'])game.atlas.endgame.kills[id]=1;");
    assert.equal(gate("atlasEndgame.ancientGate(game,'apex_archbishop')"),'');
    gate("game.atlas.endgame.kills.apex_archbishop=1");
    assert.ok(gate("atlasEndgame.ancientGate(game,'pinnacle_underking')"));
    gate("game.atlas.endgame.kills.apex_devourer=1");
    assert.equal(gate("atlasEndgame.ancientGate(game,'pinnacle_underking')"),'');
    gate("game.atlas.endgame.kills.pinnacle_underking=1");
    assert.ok(gate("atlasEndgame.ancientGate(game,'woodsman')"));
    gate("game.atlas.endgame.kills.pinnacle_sky=1;game.atlas.endgame.kills.pinnacle_leviathan=1");
    assert.equal(gate("atlasEndgame.ancientGate(game,'cosmos_astra')"),'');
    gate("game.atlas.endgame.kills.cosmos_astra=1");
    assert.equal(gate("atlasEndgame.ancientGate(game,'woodsman')"),'');
    assert.ok(gate("atlasEndgame.ancientGate(game,'pinnacle_observer')"));
    gate("game.atlas.endgame.kills.woodsman=1;game=mergeDefaults(JSON.parse(JSON.stringify(game)))");
    assert.equal(gate("atlasEndgame.ancientGate(game,'pinnacle_observer')"),'');
    assert.equal(gate("game.clearedRootBosses.length"),0,'atlas recognition must not consume external bosses first-clear rewards');
}

// ---------------------------------------------------------------- map items and crafting
run(`
    var seeded = (seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; })(99);
    var kinds = map => map.mods.map(entry => atlasMaps.mod(entry.id).kind);
    var count = (list, kind) => list.filter(value => value === kind).length;
`);
const rolls = copy(`(() => {
    const out = [];
    for (let i = 0; i < 300; i++) {
        const rarity = ['normal', 'magic', 'rare'][i % 3], map = atlasMaps.create('sun1', 1, rarity, seeded), k = kinds(map);
        out.push({ rarity, mods: map.mods.length, prefix: count(k, 'prefix'), suffix: count(k, 'suffix'), unique: new Set(map.mods.map(entry => entry.id)).size });
    }
    return out;
})()`);
assert.ok(rolls.filter(row => row.rarity === 'normal').every(row => row.mods === 0));
assert.ok(rolls.filter(row => row.rarity === 'magic').every(row => row.mods >= 1 && row.mods <= 2 && row.prefix <= 1 && row.suffix <= 1));
assert.ok(rolls.filter(row => row.rarity === 'rare').every(row => row.mods >= 4 && row.mods <= 6 && row.prefix <= 3 && row.suffix <= 3));
assert.ok(rolls.every(row => row.unique === row.mods), 'a mod never appears twice');

const crafted = copy(`(() => {
    const map = atlasMaps.create('sun1', 1, 'normal', seeded), steps = {};
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
    for (let i = 0; i < 400; i++) seen[atlasMaps.corrupt(atlasMaps.create('sunBrassStep', 7, 'magic', seeded), seeded)] = true;
    const top = atlasMaps.create('sunKey', ATLAS.starChart.tiers, 'normal', seeded), boss = atlasMaps.create('roots_g', ATLAS.tierCap, 'normal', seeded);
    for (let i = 0; i < 50; i++) { top.corrupted = false; atlasMaps.corrupt(top, seeded); boss.corrupted = false; atlasMaps.corrupt(boss, seeded); }
    return { seen: Object.keys(seen).sort(), capped: top.tier === ATLAS.starChart.tiers && boss.tier === ATLAS.tierCap };
})()`);
assert.deepEqual(outcomes.seen, ['extra', 'none', 'reforge', 'tier'], 'corruption can do nothing, raise the tier, add a mod past the limit or reforge');
assert.ok(outcomes.capped, 'a corrupted map never goes past the top chart tier (an old guardian stone: the game tier cap)');

const enemyMods = copy(`(() => {
    const map = { uid: 1, node: 'sun4', tier: 6, rarity: 'rare', quality: 0, corrupted: false,
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
const difficulty = copy(`[1, 10].map(tier => {
    const zone = atlas.preview(game, atlasMaps.create(atlas.nodes.find(node => node.tier === tier).id, tier, 'normal'));
    const saved = { season: game.season, endless: game.abyssEndlessDepth, loops: game.loopCount };
    const boss = createEnemy(zone, { at: 0, count: 1, boss: true, storyStage: 0 }, 0);
    Object.assign(game, { season: zone.fixedSeason, abyssEndlessDepth: zone.equivalentDepth, loopCount: zone.fixedSeason - 1 });
    const reference = createEnemy(getZone(getAbyssZoneIdForDepth(zone.equivalentDepth)), { at: 0, count: 1, boss: true }, 0);
    Object.assign(game, { season: saved.season, abyssEndlessDepth: saved.endless, loopCount: saved.loops });
    return { depth: zone.equivalentDepth, season: zone.fixedSeason, boss: boss.maxHp, reference: reference.maxHp, loot: getRealmEquipmentHiddenTierCap(zone) };
})`);
assert.deepEqual(difficulty.map(row => [row.depth, row.season]), [[20, 10], [50, 40]], '천문도 1등급 = 싸움 1등급 = 루프 10 혼돈 20, 천문도 10등급 = 싸움 16등급 = 루프 40 심화 50');
assert.ok(difficulty.every(row => row.boss === row.reference), 'a node boss is exactly the chaos boss of its depth at that loop');
assert.deepEqual(difficulty.map(row => row.loot), [15, 20], 'equipment tier rises with the map tier');
assert.deepEqual(copy(`ATLAS.gameTiers.map((tier, index) => atlas.preview(game, atlasMaps.create('sun1', index + 1)).atlasTier)`), [1, 3, 4, 6, 8, 9, 11, 13, 14, 16],
    'the zone carries the game tier of the chart tier (loot, area level and content thresholds read it)');
assert.deepEqual(copy(`(() => { game.atlas.seeds = 4; const out = [1, 10].map(tier => { const zone = atlas.preview(game, atlasMaps.create('sun1', tier)); return [zone.atlasTier, zone.atlasChartTier]; });
    game.atlas.seeds = 0; return out; })()`), [[9, 1], [24, 10]], 'each seed lifts the game tier by two under the cap, the chart tier stays');
assert.deepEqual(copy(`[atlas.gameTier(game, atlas.node('sunKey')), atlas.effectiveTier(game, atlas.node('sunKey')), atlas.mapGameTier(game, atlasMaps.create('roots_g', 16))]`), [16, 10, 16]);
assert.equal(copy(`[1, 30].map(season => { game.season = season; const hp = createEnemy(atlas.preview(game, atlasMaps.create('sun1', 1)), { at: 0, count: 1, boss: true }, 0).maxHp; game.season = 1; return hp; })`)
    .reduce((a, b) => a === b), true, 'the loop count never inflates an atlas map');

// ---------------------------------------------------------------- shared map stones and safe bulk discard
{
    const { run: manage } = fixture(131);
    manage(`game.atlas.unlocked = true;
        game.loopProgressCurrent.chaos20Cleared = true;
        game.atlas.stash = [
            { ...atlasMaps.create('sun1', 1, 'magic', () => .5), uid: 1, quality: 10 },
            { ...atlasMaps.create('moon1', 1, 'magic', () => .5), uid: 2, corrupted: true },
            { ...atlasMaps.create('sun1', 1), uid: 3 },
            { ...atlasMaps.create('sunMossBend', 2, 'magic', () => .5), uid: 4 },
            { ...atlasMaps.create('roots_g', 16), uid: 5 }
        ];`);
    assert.match(manage("atlas.begin(game, 1, 29, () => .5, 'moon1')"), /아직 열리지 않은/, 'no map opens before 시작 육분의 is activated');
    assert.match(manage("atlas.begin(game, 1, 29)"), /입장할 수 있는 지도가 없습니다/, 'nor straight from the stash');
    manage('game.atlas.sextant = true;');
    assert.match(manage("atlas.begin(game, 1, 29, () => .5, 'sunMossBend')"), /사용할 수 없는/, 'wrong-tier selection is rejected');
    assert.match(manage("atlas.begin(game, 4, 29, () => .5, 'sunMossBend')"), /아직 열리지 않은/, 'matching stones do not bypass progression');
    assert.match(manage("atlas.begin(game, 5, 29, () => .5, 'roots_g')"), /아직 열리지 않은/, 'an old guardian stone is kept but its guardian is closed');
    assert.match(manage("atlas.begin(game, 5, 29)"), /입장할 수 있는 지도가 없습니다/);
    assert.match(manage("for(const key of ATLAS.pinnacle.tickets)game.currencies[key]=1;atlas.beginPinnacle(game, 29)"), /아직 열리지 않은/, 'the old pinnacle is closed even with its tickets');
    assert.equal(manage("ATLAS.pinnacle.tickets.every(key => game.currencies[key] === 1)"), true, 'and takes none');
    assert.equal(manage('game.atlas.stash.length'), 5, 'blocked entry spends nothing');
    assert.equal(manage("atlas.begin(game, 1, 29, () => .5, 'moon1')"), '', 'a stone opens any open map of its tier');
    assert.equal(manage("atlas.zone(game).atlasRegion === 'sanctum' && game.atlas.run.map.rarity === 'magic' && game.atlas.run.map.quality === 10"), true);
    assert.equal(manage("atlas.discardBatch(game, 'magic', 1, atlas.discardCandidates(game, 'magic', 1))"), 0, 'bulk discard is blocked during a run');
    manage('atlas.cancel(game); const beforeDiscard = atlas.discardCandidates(game, "magic", 1);');
    assert.equal(manage("atlas.discardBatch(game, 'magic', 1, [...beforeDiscard].reverse())"), 0, 'changed candidates require confirmation again');
    assert.equal(manage("atlas.discardBatch(game, 'magic', 1, beforeDiscard)"), 2, 'both regions and crafted stones match the selected filters');
    assert.equal(manage("JSON.stringify(atlas.discardCandidates(game, 'all', 24).map(map => map.uid))"), '[3,4]', 'guardian stones never match bulk discard');
    assert.equal(manage("atlas.discardCandidates(game, 'all', 0).length"), 0, 'invalid tier does not match');
}

// ---------------------------------------------------------------- a full stash keeps what it holds
const stashSafety = copy(`(() => {
    const state = mergeDefaults({ season: 10 });
    state.loopProgressCurrent.chaos20Cleared = true;
    Object.assign(state.atlas, { unlocked: true, sextant: true, completed: atlas.nodes.filter(node => node.kind === 'map').map(node => node.id) });
    state.atlas.stash = Array.from({ length: ATLAS.stashCap }, (_, i) => ({ ...atlasMaps.create('sunKey', 10), uid: i + 1 }));
    state.atlas.nextUid = ATLAS.stashCap + 1;
    const sextantFull = atlas.sextantReason({ ...state, atlas: { ...state.atlas, sextant: false } });
    const original = JSON.stringify(state.atlas.stash.slice(1));
    atlas.begin(state, 1, 29, () => .5);
    const activeBefore = JSON.stringify(state.atlas), activeReason = atlas.discard(state, 2);
    const activeSafe = activeBefore === JSON.stringify(state.atlas);
    // The held-drop limit holds, and no old guardian stone drops while the old guardians are closed.
    state.atlas.run.drops = Array.from({ length: ATLAS.stashCap }, () => ({ ...atlasMaps.create('sun1', 1), uid: state.atlas.nextUid++ }));
    const rolled = atlas.dropFromKill(state, atlas.zone(state), { isBoss: true }, () => 0);
    const bossStones = rolled.filter(map => atlas.node(map.node).kind !== 'map').length, heldCount = state.atlas.run.drops.length;
    const dropTiers = rolled.map(map => map.tier);
    atlas.complete(state);
    const existingSafe = JSON.stringify(state.atlas.stash.slice(0, ATLAS.stashCap - 1)) === original;
    const missingBefore = JSON.stringify(state.atlas), missingReason = atlas.discard(state, -1);
    const missingSafe = missingBefore === JSON.stringify(state.atlas);
    const discardBefore = JSON.stringify(state.atlas.stash.filter(map => map.uid !== 2)), nextUid = state.atlas.nextUid;
    const discardReason = atlas.discard(state, 2);
    const discardedOnlySelected = JSON.stringify(state.atlas.stash) === discardBefore && state.atlas.nextUid === nextUid;
    return { sextantFull, activeReason, activeSafe, bossStones, heldCount, dropTiers, existingSafe, missingReason, missingSafe, discardReason, discardedOnlySelected,
        capped: state.atlas.stash.length === ATLAS.stashCap - 1 };
})()`);
assert.equal(stashSafety.sextantFull, '', '시작 육분의 does not wait for room: its four stones arrive over the cap');
assert.ok(stashSafety.activeReason && stashSafety.activeSafe, 'an active run blocks stash deletion without partial changes');
assert.deepEqual([stashSafety.bossStones, stashSafety.heldCount], [0, run('ATLAS.stashCap')], 'held rewards stay under the cap and no closed guardian stone drops');
assert.ok(stashSafety.dropTiers.length >= 1 && stashSafety.dropTiers.every(tier => tier >= 1 && tier <= 10), 'a tier 10 boss drops stones in chart tiers');
assert.ok(stashSafety.existingSafe && stashSafety.capped, 'only new rewards compete for room; stored maps are never replaced');
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
assert.equal(run('game.atlas.unlocked'), false, 'a chaos 20 clear before ATLAS.unlockLoop leaves the atlas closed (2026-11-06)');
assert.deepEqual(copy('game.atlas.stash'), [], 'and brings no maps');
run('game.season=ATLAS.unlockLoop;atlasRun.onChaos20();');
assert.equal(run('game.atlas.unlocked'), true);
assert.equal(run('game.atlas.stash.length'), ATLAS_STARTER(), 'the loop starts with its starter maps');
function ATLAS_STARTER() { return run('ATLAS.starter.count'); }
assert.deepEqual(copy('atlas.sync(game)'), [], 'starter maps come once per loop');
assert.ok(copy('game.atlas.stash').every(map => map.tier === 1 && run(`atlas.node('${map.node}').tier`) === 1), 'a fresh atlas starts at tier 1');

// 시작 육분의: once per 시대, it opens the four tier 1 maps and gives four normal tier 1 stones.
const first = copy('game.atlas.stash[0]');
assert.match(run(`atlasRun.open(${first.uid})`), /입장할 수 있는 지도가 없습니다/, 'the starter stones wait for the sextant');
assert.equal(run('game.atlas.stash.length'), ATLAS_STARTER(), 'and are not spent');
assert.equal(run('atlas.sextantReason(game)'), '');
const lit = copy('atlas.activateSextant(game, () => .5)');
assert.deepEqual(lit.maps.map(map => [map.tier, map.rarity, map.quality, map.corrupted, map.mods.length]), Array(4).fill([1, 'normal', 0, false, 0]), 'four plain tier 1 stones');
assert.deepEqual(lit.maps.map(map => map.node).sort(), ['inner1', 'inner2', 'moon1', 'sun1']);
assert.equal(run('game.atlas.stash.length'), ATLAS_STARTER() + 4);
assert.match(copy('atlas.activateSextant(game)').reason, /이미/, 'the sextant is activated once');
assert.equal(run('game.atlas.stash.length'), ATLAS_STARTER() + 4, 'a second press grants nothing');
assert.deepEqual(copy("['sun1','moon1','inner1','inner2','sunMossBend'].map(id => atlas.status(game, id))"), ['open', 'open', 'open', 'open', 'locked']);
assert.equal(run(`atlasRun.open(${first.uid})`), '');
const opened = copy(`{zone:game.currentZoneId,run:!!game.atlas.run,stash:game.atlas.stash.length,type:getZone(game.currentZoneId).type,
    exploration:getZone(game.currentZoneId).exploration,portals:game.atlas.run.portals,returnZone:game.atlas.run.returnZoneId}`);
assert.equal(opened.zone, 'atlas_map');
assert.equal(opened.type, 'atlasMap');
assert.equal(opened.stash, ATLAS_STARTER() + 4 - 1, 'opening consumes the map');
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
assert.equal(cleared.stash, ATLAS_STARTER() + 4 - 1 + cleared.result.drops + 1, 'the map drops held by the run and the new map\'s stone reach the stash');
assert.deepEqual(cleared.result.granted, copy(`atlas.nodes.filter(node => node.parent === '${first.node}').map(node => ({ node: node.id, tier: node.tier }))`),
    'the first clear gives one stone for the map it opened');
assert.equal(cleared.result.boxes.count, 1, 'an ordinary clear opens one 장비 상자');
assert.ok(cleared.result.boxes.total >= 2, 'and the box holds the map boss reward once more');
assert.ok(cleared.result.drops >= 1, 'the node boss always drops a map');
const children = copy(`atlas.nodes.filter(node => node.parent === '${first.node}').map(node => atlas.status(game, node.id))`);
assert.deepEqual(children, ['open'], 'completing a map opens its child');
assert.equal(copy(`atlas.nodes.filter(node => node.kind === 'map' && node.tier === 2 && node.parent !== '${first.node}').every(node => atlas.status(game, node.id) === 'locked')`), true, 'and no other branch');
assert.equal(run(`atlas.points(game)`), 0, 'no passive points until the 24 stars arrive (stage B)');
assert.deepEqual(copy('game.atlas.passives'), []);
const held = run('game.atlas.stash.length');
assert.match(run(`game.pendingLoopDecision=true;atlasRun.open(game.atlas.stash[0].uid)`), /루프 정산/, 'no map opens while the loop decision waits');
assert.equal(run('game.atlas.stash.length'), held, 'and no map is spent');
run('game.pendingLoopDecision=false;');

// Completion rewards belong to the finished map, including its guaranteed unique, material and seed receipts.
{
    const {run: settle}=fixture(731);
    const read=code=>JSON.parse(settle(`JSON.stringify(${code})`));
    settle(`game=mergeDefaults({...game,season:50});${OWNED_ROWS}game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;
        game.settings.mapCompleteAction='stop';atlas.sync(game);game.atlas.sextant=true;
        for(const key of ATLAS.pinnacle.tickets)game.currencies[key]=1;`);
    assert.match(settle('atlasRun.openPinnacle()'),/아직 열리지 않은/,'the old pinnacle waits for stage C');
    assert.equal(settle('game.atlas.run'),null);
    // 깨어난 아틀라스의 싸움은 그대로다: 예전 정점의 처치 기록이 있는 저장으로 본다.
    settle(`game.atlas.endgame.kills.pinnacle=1;for(const item of Object.values(ATLAS_ENDGAME.guardianShears))game.atlas.endgame.items[item]=1;
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
    assert.equal(settle('game.atlas.lastResult.loot.equipmentCount'),settle('game.atlas.lastResult.boxes.total'),'next map does not inherit the last unique (its gear is its own 장비 상자)');
    assert.ok(!read('game.atlas.lastResult.loot.items').some(item=>item.name===unique),'nor its receipt row');
    const old=read('game.atlas.lastResult');delete old.seed;delete old.seeds;delete old.endgame;
    settle(`game.atlas.lastResult=${JSON.stringify(old)};game=mergeDefaults(JSON.parse(serializeSaveState(game)));`);
    assert.equal(settle('game.atlas.lastResult.endgame'),null,'older result saves are still accepted');
}

// Memory progress receipts survive saves without replacing the completion event's reward contract.
{
    const {run: memoryRun,runtime: memoryRuntime}=fixture(844);
    const read=code=>JSON.parse(memoryRun(`JSON.stringify(${code})`));
    memoryRun(`game=mergeDefaults({...game,season:50});game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;atlas.sync(game);
        game.atlas.sextant=true;game.atlas.stash=[{...atlasMaps.create('sun1',1),uid:game.atlas.nextUid++}];
        atlas.begin(game,game.atlas.stash[0].uid,29,()=>.5);`);
    memoryRuntime.Math.random=()=>0;
    memoryRun('var receiptEvent=atlas.complete(game);');
    assert.deepEqual(read('game.atlas.lastResult.memory'),{foughtTier:0,newBest:false,ticket:{node:'sun1',tier:1}});
    assert.deepEqual(read('receiptEvent.memory.ticket'),{node:'sun1',name:memoryRun("atlas.node('sun1').boss"),tier:1});
    assert.equal(memoryRun('receiptEvent.memory.spoils'),null,'the event still exposes memory payouts separately from the saved receipt');
    const beforePreview=read('game'),randomBeforePreview=memoryRuntime.Math.random;
    let previewDraws=0;
    memoryRuntime.Math.random=()=>{previewDraws++;return randomBeforePreview();};
    const preview=read("memoryDungeon.preview(game,'sun1',1)");
    memoryRun("memoryDungeon.preview(game,'sun1',1);memoryDungeon.overview(game);");
    assert.deepEqual(read('game'),beforePreview,'reading memory preparation never spends a ticket or changes progress');
    assert.equal(previewDraws,0,'repeated preparation does not advance reward or combat randomness');
    memoryRuntime.Math.random=randomBeforePreview;
    assert.equal(memoryRun("atlas.beginMemory(game,'sun1',1,29,()=>.5)"),'');
    assert.deepEqual(read('[game.atlas.run.map.node,game.atlas.run.map.memory,game.atlas.run.map.tier]'),
        [preview.map.node,preview.tier,preview.map.tier],'the eventual entry uses the previewed memory and difficulty');
    memoryRun('receiptEvent=atlas.complete(game);');
    assert.deepEqual(read('game.atlas.lastResult.memory'),{foughtTier:1,newBest:true,ticket:{node:'sun1',tier:2}});
    assert.equal(memoryRun('receiptEvent.memory.spoils.tier'),1);
    assert.equal(memoryRun('receiptEvent.memory.spoils.best'),true);
    assert.ok(read('receiptEvent.memory.spoils.rewards').length,'the event retains the actual currency payout list');
    const result=read('game.atlas.lastResult'),progress=read('game.atlas.memory'),wallet=read('game.currencies');
    memoryRun('atlas.complete(game);game=mergeDefaults(JSON.parse(serializeSaveState(game)));atlas.complete(game);');
    assert.deepEqual(read('game.atlas.lastResult'),{...result,loot:null},'memory result survives restoration and repeated completion');
    assert.deepEqual(read('game.atlas.memory'),progress,'loading a progress receipt never grants another ticket or advances its best tier');
    assert.deepEqual(read('game.currencies'),wallet,'a presentation receipt never pays currencies');
    memoryRun("memoryDungeon.give(game,'sun1',1);atlas.beginMemory(game,'sun1',1,29,()=>.5);atlas.complete(game);");
    assert.equal(memoryRun('game.atlas.lastResult.memory.newBest'),false,'a repeated tier is not a new record');
    memoryRun("memoryDungeon.give(game,'sun1',5);atlas.beginMemory(game,'sun1',5,29,()=>.5);atlas.close(game,'failed');");
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
        [{foughtTier:1.5,newBest:true,ticket:{node:'sun1',tier:'2'}},null],
        [{foughtTier:6,newBest:true,ticket:null},null],
        [{foughtTier:2,newBest:'true',ticket:{node:'sun1',tier:99}},{foughtTier:2,newBest:false,ticket:null}],
        [{foughtTier:0,newBest:true,ticket:{node:'sun1',tier:5}},{foughtTier:0,newBest:false,ticket:{node:'sun1',tier:5}}]
    ]) {
        memoryRun(`game.atlas.lastResult={...${JSON.stringify(base)},outcome:'complete',memory:${JSON.stringify(raw)}};atlas.normalize(game);`);
        assert.deepEqual(read('game.atlas.lastResult.memory'),expected,'invalid memory receipt fields are dropped, never clamped into invented progress');
    }
    memoryRun(`game.atlas.lastResult={...${JSON.stringify(base)},memory:{foughtTier:5,newBest:true,ticket:{node:'sun1',tier:2}}};atlas.normalize(game);`);
    assert.deepEqual(read('game.atlas.lastResult.memory'),failed,'a corrupted failed result cannot claim a win or a ticket');
    memoryRun("memoryDungeon.give(game,'inner1',5);atlas.beginMemory(game,'inner1',5,29,()=>.5);atlas.complete(game);");
    assert.equal(memoryRun("memoryDungeon.count(game,'inner1',5)"),0,'the final held memory was spent');
    memoryRun('game=mergeDefaults(JSON.parse(serializeSaveState(game)));');
    assert.deepEqual(read("memoryDungeon.overview(game).filter(row=>row.node.id==='inner1').map(row=>[row.best,row.counts])"),
        [[5,[0,0,0,0,0]]],'a completed memory remains in records after its last ticket is spent and the save reloads');
}

// A completion reports only fragments actually stored under the per-kind cap, including after save/load.
for(const before of [0,98,99]) {
    const {run: fragmentRun}=fixture(845);
    const read=code=>JSON.parse(fragmentRun(`JSON.stringify(${code})`));
    fragmentRun(`game.season=ATLAS.unlockLoop;game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;atlas.sync(game);game.atlas.sextant=true;
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

// A map keeps the bonus it was opened with, even if its sources change before completion (the atlas passives are closed until the
// 24 stars arrive, so an epoch perk stands in for them).
for(const perkBefore of [true,false]) {
    const {run: bonusRun}=fixture(841);
    bonusRun(`game.season=50;game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;atlas.sync(game);game.atlas.sextant=true;
        game.atlas.stash=[{...atlasMaps.create('sun1',1),uid:game.atlas.nextUid++}];`); // 기운 없는 지도석: 기운의 보너스가 섞이지 않게
    if(perkBefore)bonusRun('game.atlas.epoch.perks.mapDrop=2;');
    assert.equal(bonusRun('atlasRun.open(game.atlas.stash[0].uid)'), '');
    bonusRun(perkBefore ? 'delete game.atlas.epoch.perks.mapDrop;' : 'game.atlas.epoch.perks.mapDrop=2;');
    const perk=bonusRun("ATLAS.epoch.perks.find(row=>row.id==='mapDrop').effect.mapDrop");
    assert.equal(bonusRun('game.atlas.run.bonus.mapDrop'),perkBefore ? perk*2 : 0,'only the entry bonus applies');
    bonusRun('game=mergeDefaults(JSON.parse(serializeSaveState(game)));');
    assert.equal(bonusRun('game.atlas.run.bonus.mapDrop'),perkBefore ? perk*2 : 0,'and it survives a reload');
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
    assert.deepEqual(read("memoryDungeon.normalize({tickets:{sun1:[0,9,10,999,-1],unknown:[1,1,1,1,1]}}).tickets"),
        {sun1:[0,9,10,10,0]},'older rows remain valid and corrupt counts stay bounded');
}

// ---------------------------------------------------------------- auto-map
{
    const {run: autoRun}=fixture(844);
    autoRun(`game=mergeDefaults({...game,season:50});game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;
        game.atlas.unlocked=true;game.atlas.sextant=true;game.atlas.autoMap=true;game.atlas.completed=['sun1'];
        game.atlas.stash=[{...atlasMaps.create('sunMossBend',2),uid:1},{...atlasMaps.create('trunk_g',16),uid:2},{...atlasMaps.create('sunDawnHill',3),uid:3}];`);
    assert.equal(autoRun('game.atlas.autoGuardians'),true);
    assert.equal(autoRun('atlas.nextAuto(game,16)'),null,'an old preference cannot consume a stone before conquest');
    autoRun('game.atlas.endgame.kills.pinnacle=1');
    // 예전 수호자의 지도석은 갈 곳이 닫혀 있어 고르지 않는다: 열 수 없는 지도석이 자동 지도를 멈추지 않는다.
    assert.equal(autoRun('atlas.nextAuto(game,16).uid'),1,'a stone above every open map waits: auto-map takes the highest stone with an open map of its own tier');
    assert.equal(autoRun('atlas.nextAuto(game,2).uid'),1,'under the tier just finished');
    autoRun('game.atlas.autoGuardians=false;game=mergeDefaults(JSON.parse(serializeSaveState(game)));');
    assert.equal(autoRun('game.atlas.autoGuardians'),false,'the guardian preference survives save/load');
    assert.equal(autoRun('game.atlas.stash.some(map=>map.node==="trunk_g")'),true,'and so does the old guardian stone');
}
for(const action of ['nextZone','stop']) {
    const challenges=["memoryDungeon.give(game,'sun1',1);atlasRun.openMemory('sun1',1)",
        "atlasRun.openEndgame('apex_gardener')",'atlasRun.openEndgame(ATLAS_ENDGAME.leagues[0].id)',
        'atlasBoard.sync(game);atlasBoard.roll(game,()=>0);atlasRun.openBoard()'];
    for(const open of challenges) {
        const {run: specialRun}=fixture(845);
        specialRun(`game=mergeDefaults({...game,season:50});game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;
            game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);
            game.settings.mapCompleteAction='${action}';atlas.sync(game);game.atlas.autoMap=true;
            game.atlas.sextant=true;game.atlas.stash=[{...atlasMaps.create('sun1',1),uid:900}];game.atlas.nextUid=901;
            game.atlas.endgame.kills.pinnacle=1;game.atlas.endgame.items=Object.fromEntries(Object.keys(ATLAS_ENDGAME.items).map(id=>[id,99]));
            for(const key of ATLAS.pinnacle.tickets)game.currencies[key]=1;`);
        assert.equal(specialRun(open),'');
        specialRun('atlasRun.finish(getZone(game.currentZoneId));');
        assert.equal(specialRun('game.atlas.run'),null,'a special challenge never opens an automatic map');
        assert.equal(specialRun('game.atlas.stash.some(map=>map.uid===900)'),true,'unchosen map stones remain in the stash');
        assert.equal(specialRun('game.currentZoneId'),29);
        assert.equal(specialRun('game.combatHalted'),action==='stop','special returns honor the after-clear setting');
        specialRun('game=mergeDefaults(JSON.parse(serializeSaveState(game)));');
        assert.equal(specialRun('game.atlas.autoMap'),true,'special returns preserve the player auto-map setting');
    }
}
run(`game.atlas.endgame.kills.pinnacle=1;game.atlas.autoMap=true;game.atlas.stash=game.atlas.stash.filter(map=>map.tier===1);`);
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
        game.settings.showDeathNotice=false;game.settings.mapCompleteAction='stop';atlas.sync(game);game.atlas.sextant=true;`);
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

// ---------------------------------------------------------------- runs on the star chart (stage A2): entry by tier, grants, refund, dew, 장비 상자
{
    const { run: chart, runtime: chartRuntime } = fixture(847);
    const read = code => JSON.parse(chart(`JSON.stringify(${code})`));
    chart(`game=mergeDefaults({...game,season:50});game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;
        game.settings.showDeathNotice=false;game.settings.mapCompleteAction='stop';atlas.sync(game);game.atlas.stash=[];game.atlas.sextant=true;
        var give = (node, tier) => { const map = { ...atlasMaps.create(node, tier), uid: game.atlas.nextUid++ }; game.atlas.stash.push(map); return map.uid; };
        var held = () => game.atlas.stash.map(map => [map.node, map.tier]);`);
    // Entry: a stone of the map's own chart tier; a stone above every open map waits (no "highest open map below").
    const high = chart("give('sunDawnHill', 3)");
    assert.equal(read(`atlas.mapDestination(game, game.atlas.stash.find(map => map.uid === ${high}))`), null, 'no open map of its tier: no destination');
    assert.match(chart(`atlas.begin(game, ${high}, 29)`), /입장할 수 있는 지도가 없습니다/, 'a tier 3 stone does not run on an open tier 1 map');
    assert.match(chart(`atlas.begin(game, ${high}, 29, () => .5, 'sun1')`), /사용할 수 없는/);
    chart("game.atlas.autoMap=true;game.atlas.endgame.kills.pinnacle=1;");
    assert.equal(chart('atlas.nextAuto(game, 10)'), null, 'auto-map does not take it either');
    chart("game.atlas.autoMap=false;game.atlas.stash=[];");
    // First-clear grants: one plain stone per newly opened map, at its tier, pointed at it; a fork opens two; a clear again opens nothing.
    chart("game.atlas.completed=['sun1','sunMossBend','sunDawnHill','sun2'];var fork = give('sun3', 5);");
    assert.equal(chart(`atlas.begin(game, fork, 29, () => .5, 'sun3')`), '');
    chart('var forkResult = atlas.complete(game);');
    const forked = read('game.atlas.stash');
    assert.deepEqual(forked.map(map => [map.node, map.tier, map.rarity, map.quality, map.corrupted, map.mods.length]).sort(),
        [['sun4', 6, 'normal', 0, false, 0], ['sunRootBank', 6, 'normal', 0, false, 0]], 'a fork gives one plain stone for each map it opened');
    assert.ok(forked.every(map => typeof map.omen === 'string'), 'granted stones roll an omen like drops');
    assert.deepEqual(read('forkResult.granted').map(row => row.node).sort(), ['sun4', 'sunRootBank']);
    chart("var again = give('sun3', 5);atlas.begin(game, again, 29, () => .5, 'sun3');atlas.complete(game);");
    assert.deepEqual(read('game.atlas.lastResult.granted'), [], 'clearing a map again opens nothing new and grants nothing');
    assert.equal(chart('game.atlas.stash.length'), 2);
    // Over the cap: grants, refunds and the sextant arrive; drops stop; loading keeps every stone.
    chart(`game.atlas.stash=Array.from({ length: ATLAS.stashCap }, () => ({ ...atlasMaps.create('sunKey', 10), uid: game.atlas.nextUid++ }));
        game.atlas.completed=['sun1'];var crowded = give('sunMossBend', 2);atlas.begin(game, crowded, 29, () => .5, 'sunMossBend');
        game.atlas.run.drops=[{ ...atlasMaps.create('sun1', 1), uid: game.atlas.nextUid++ }];atlas.complete(game);`);
    assert.equal(chart('game.atlas.stash.length'), read('ATLAS.stashCap') + 1, 'a full stash still takes the new map\'s stone');
    assert.deepEqual([chart('game.atlas.lastResult.drops'), chart('game.atlas.lastResult.lost')], [0, 1], 'while an ordinary drop stays blocked');
    chart("game.atlas.sextant=false;atlas.activateSextant(game);");
    assert.equal(chart('game.atlas.stash.length'), read('ATLAS.stashCap') + 5, '시작 육분의 gives its four stones over the cap');
    assert.equal(chart('mergeDefaults(JSON.parse(serializeSaveState(game))).atlas.stash.length'), read('ATLAS.stashCap') + 5, 'and no load trims the stash');
    // Refund: the last portal of an ordinary chart map gives one plain stone of that map back; closing on purpose gives nothing.
    chart("game.atlas.stash=[];var lost = give('moon1', 1);atlas.begin(game, lost, 29, () => .5, 'moon1');game.atlas.run.portals=2;");
    assert.deepEqual(read('atlas.usePortal(game)'), { closed: false, portals: 1 });
    assert.equal(chart('game.atlas.stash.length'), 0, 'no refund while portals remain');
    const closed = read('atlas.usePortal(game)');
    assert.equal(closed.closed, true);
    assert.deepEqual(closed.refund, { node: 'moon1', tier: 1 });
    assert.deepEqual(read('game.atlas.stash').map(map => [map.node, map.tier, map.rarity, map.quality]), [['moon1', 1, 'normal', 0]], 'the last portal gives the stone back');
    assert.deepEqual(read('game.atlas.lastResult.refund'), { node: 'moon1', tier: 1 });
    chart("atlas.begin(game, game.atlas.stash[0].uid, 29, () => .5, 'moon1');atlas.close(game, 'failed');");
    assert.deepEqual([chart('game.atlas.stash.length'), read('game.atlas.lastResult.refund')], [0, null], 'abandoning with portals left gives nothing back');
    chart("memoryDungeon.give(game,'sun1',1);atlas.beginMemory(game,'sun1',1,29,()=>.5);game.atlas.run.portals=1;atlas.usePortal(game);");
    assert.deepEqual([chart('game.atlas.stash.length'), read('game.atlas.lastResult.refund')], [0, null], 'a memory fight has no refund');
    // Dew entry: one formlessDew on top of the stone, 1 portal, 2 장비 상자; none held: refused, nothing spent; a cancel gives both back.
    chart("game.currencies.formlessDew=0;var dewStone = give('sun1', 1);");
    assert.match(chart(`atlas.begin(game, dewStone, 29, () => .5, 'sun1', true)`), /형체없는 이슬이 없습니다/);
    assert.equal(chart('game.atlas.stash.length'), 1, 'a refused dew entry spends nothing');
    chart('game.currencies.formlessDew=2;');
    assert.equal(chart(`atlas.begin(game, dewStone, 29, () => .5, 'sun1', true)`), '');
    assert.deepEqual(read('[game.currencies.formlessDew, game.atlas.run.portals, game.atlas.run.dew, atlas.portalCap(game.atlas.run)]'), [1, 1, true, 1]);
    chart('atlas.cancel(game);');
    assert.deepEqual(read('[game.currencies.formlessDew, game.atlas.stash.length]'), [2, 1], 'a cancelled dew entry returns the stone and the dew');
    chart(`atlas.begin(game, dewStone, 29, () => .5, 'sun1', true);game.atlas.run.portals=1;atlas.usePortal(game);`);
    assert.deepEqual(read('[game.currencies.formlessDew, game.atlas.lastResult.refund]'), [1, { node: 'sun1', tier: 1 }], 'a lost dew entry returns the stone, not the dew');
    chart(`atlas.begin(game, game.atlas.stash[0].uid, 29, () => .5, 'sun1', true);var dewEnd = atlas.complete(game);`);
    assert.deepEqual(read('[dewEnd.gearBoxes, game.atlas.lastResult.boxes.count]'), [2, 2], 'a dew clear opens two 장비 상자');
    assert.match(chart(`atlas.begin(game, give('sun1', 1), 29, () => .5, undefined, true)`), /형체없는 이슬이 없습니다/, 'the last dew is spent');
    // 장비 상자 rolls come from the run's stone, so a save and load in the middle of the run rolls the same boxes.
    const picks = loadMidRun => {
        chart(`game.currentZoneId=29;game.atlas.run=null;game.atlas.stash=[{ ...atlasMaps.create('sun1', 1), uid: 777 }];game.atlas.nextUid=778;game.currencies.formlessDew=1;`);
        assert.equal(chart("atlasRun.open(777, 'sun1', true)"), '');
        if (loadMidRun) chart('game=mergeDefaults(JSON.parse(serializeSaveState(game)));');
        chartRuntime.Math.random = loadMidRun ? () => 0.01 : () => 0.99;
        chart('var boxPicks = 0, realPick = grantEquipmentPick; grantEquipmentPick = () => { boxPicks++; return []; };');
        try { chart('atlasRun.finish(getZone(game.currentZoneId));'); }
        finally { chart('grantEquipmentPick = realPick;'); }
        return read('[boxPicks, game.atlas.lastResult.boxes.count, game.atlas.run]');
    };
    const straight = picks(false), reloaded = picks(true);
    assert.deepEqual(reloaded, straight, 'the boxes roll the same after a reload, whatever the other draws are');
    assert.ok(straight[0] >= 4 && straight[0] <= 6 && straight[1] === 2 && straight[2] === null, 'two boxes, each the map boss reward (two or three pieces)');
    // Old and half-written values load; loading twice changes nothing.
    chart(`game.atlas.run=null;game.atlas.stash=[{ ...atlasMaps.create('sun1', 1), uid: 900 }];atlas.begin(game, 900, 29, () => .5, 'sun1');
        var oldShape = JSON.parse(serializeSaveState(game));delete oldShape.atlas.run.dew;oldShape.atlas.run.portals=3;
        oldShape.atlas.lastResult={ nodeId:'sun1', tier:1, outcome:'complete', first:true, bonus:false, drops:0, lost:0, fragments:0, lostFragments:0 };`);
    const old = read('mergeDefaults(oldShape).atlas');
    assert.deepEqual([old.run.dew, old.run.portals, old.lastResult.granted, old.lastResult.boxes, old.lastResult.refund], [false, 3, [], null, null], 'an older run and result load with defaults');
    assert.deepEqual(read('mergeDefaults(JSON.parse(serializeSaveState(mergeDefaults(oldShape)))).atlas'), old, 'and loading twice changes nothing');
    chart(`oldShape.atlas.run.dew='yes';oldShape.atlas.lastResult={ ...oldShape.atlas.lastResult, granted:[{node:'nowhere'},{node:'sun4',tier:99},'x'], boxes:{count:'2',total:-4,items:'x'},
        refund:{node:'sun1'} };`);
    const half = read('mergeDefaults(oldShape).atlas');
    assert.deepEqual([half.run.dew, half.lastResult.granted, half.lastResult.boxes, half.lastResult.refund], [false, [{ node: 'sun4', tier: 6 }], { count: 2, total: 0, items: [] }, null],
        'half-written values are cleaned: unknown maps dropped, tiers from the chart, no refund on a clear');
    chart("oldShape.atlas.run.dew=true;oldShape.atlas.run.portals=3;");
    assert.deepEqual(read('[mergeDefaults(oldShape).atlas.run.dew, mergeDefaults(oldShape).atlas.run.portals]'), [true, 1], 'a dew run keeps its one portal');
}

// ---------------------------------------------------------------- save boundary and the loop
run(`game.atlas.stash.push({uid:-4,node:'nowhere',tier:1,rarity:'rare',mods:[]},{uid:game.atlas.stash[0].uid,node:'sunMossBend',tier:2,rarity:'normal',mods:[]},
    {uid:900,node:'sunMossBend',tier:2,rarity:'magic',mods:[{id:'monsterLife',roll:2},{id:'bogus',roll:0.5},{id:'monsterCrit',roll:0.5},{id:'monsterCrit',roll:0.1}],quality:99});`);
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

const kept = copy('{completed:game.atlas.completed,bonus:game.atlas.bonus,unlocked:game.atlas.unlocked,auto:game.atlas.autoMap,sextant:game.atlas.sextant}');
run('atlas.onLoopReset(game);');
const reset = copy('{stash:game.atlas.stash.length,run:game.atlas.run,completed:game.atlas.completed,bonus:game.atlas.bonus,unlocked:game.atlas.unlocked,auto:game.atlas.autoMap,sextant:game.atlas.sextant}');
assert.deepEqual([reset.stash, reset.run], [0, null], 'a new loop empties the stash and closes the map');
assert.deepEqual({ completed: reset.completed, bonus: reset.bonus, unlocked: reset.unlocked, auto: reset.auto, sextant: reset.sextant }, kept, 'atlas progress and the lit sextant survive the loop');
assert.equal(kept.sextant, true);

// ---------------------------------------------------------------- the way back in: chaos 20+ bosses
run(`game.currentZoneId=29;game.atlas.stash=[];`);
runtime.Math.random = () => 0.01;
const outside = copy(`atlas.dropFromKill(game, getZone(getAbyssZoneIdForDepth(22)), { isBoss: true }).map(map => map.tier)`);
assert.equal(outside.length, 1, 'a deep chaos boss can drop a map straight to the stash');
assert.ok(outside[0] >= 1 && outside[0] <= 3);
assert.equal(copy(`atlas.dropFromKill(game, getZone(getAbyssZoneIdForDepth(12)), { isBoss: true }).length`), 0, 'shallow chaos never does');
// ---------------------------------------------------------------- a save from before the star chart (saveVersion 21)
{
    const { run: oldRun } = fixture(846);
    const read = code => JSON.parse(oldRun(`JSON.stringify(${code})`));
    oldRun(`game=mergeDefaults({...game,season:50});${OWNED_ROWS}game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;
        for(const key of ATLAS.pinnacle.tickets)game.currencies[key]=2;
        var OMEN = lootOmens.roll(game, () => 0);
        var stone = (uid, node, tier, extra = {}) => ({ uid, node, tier, rarity: 'normal', mods: [], quality: 0, corrupted: false, ...extra });
        var oldSave = () => {
            const raw = JSON.parse(serializeSaveState(game));
            raw.saveVersion = 21;
            raw.atlas = { version: 1, unlocked: true, completed: ['roots_0', 'roots_1', 'garden_0', 'trunk_8', 'roots_g', 'pinnacle', 'apex_gardener'], bonus: ['roots_0', 'roots_g'],
                passives: ['s_r', 's_a1', 'l_r'], seeds: 2, nextUid: 60, starterSeason: 50, autoMap: true, autoGuardians: false,
                stash: [...Array.from({ length: 16 }, (_, i) => stone(i + 1, ['roots_0', 'trunk_8', 'canopy_3', 'garden_2', 'sanctum_6'][i % 5], i + 1)),
                    stone(17, 'trunk_8', 20), stone(18, 'roots_g', 20),
                    stone(19, 'garden_3', 6, { rarity: 'rare', mods: [{ id: 'monsterLife', roll: 0.25 }, { id: 'packSize', roll: 1 }], quality: 15, corrupted: true, omen: OMEN })],
                fragments: { packs: 3 }, loadout: ['packs'], epoch: { count: 1, essence: 3, perks: { mapDrop: 1 } },
                endgame: { kills: { pinnacle: 2, roots_g: 1, apex_gardener: 1 }, items: { shearRoots: 2 }, blight: {}, witness: 1, witnessed: [] },
                memory: { tickets: { roots_0: [1, 0, 0, 0, 0], garden_0: [1, 1, 0, 0, 0], garden_5: [0, 2, 0, 0, 0], roots_g: [0, 1, 0, 0, 0], apex_gardener: [1, 0, 0, 0, 0] },
                    best: { roots_0: 2, garden_0: 1, garden_5: 3 } } };
            return raw;
        };
        var withRun = (map, extra = {}) => {
            const raw = oldSave();
            raw.currentZoneId = 'atlas_map';
            raw.atlas.run = { map, portals: 2, drops: [stone(30, 'roots_0', 1)], found: ['packs'], fragments: ['packs'], spent: ['packs'], cleared: [], bonus: {}, encounters: [], golden: [],
                returnZoneId: 29, ...extra };
            return raw;
        };
        var before = mergeDefaults(JSON.parse(serializeSaveState(game))), once = mergeDefaults(oldSave());`);
    const once = read('once.atlas');
    assert.equal(oldRun('once.saveVersion'), 22);
    assert.deepEqual([once.completed, once.bonus, once.passives], [['apex_gardener'], [], []],
        'first clears and bonus marks of the old maps, guardians and pinnacle are dropped, late fights stay, every passive is released');
    assert.deepEqual([once.unlocked, once.sextant, once.seeds, once.starterSeason, once.autoMap, once.autoGuardians, once.fragments, once.loadout, once.nextUid],
        [true, false, 2, 50, true, false, { packs: 3 }, ['packs'], 60], 'the unlock, seeds, 각인 and settings are kept; the sextant waits to be activated');
    assert.deepEqual(once.epoch, { count: 1, essence: 3, perks: { mapDrop: 1 } }, '시대 재생 and its perks are kept');
    assert.deepEqual([once.endgame.kills, once.endgame.items, oldRun('atlasEndgame.awakened(once)')], [{ pinnacle: 2, roots_g: 1, apex_gardener: 1 }, { shearRoots: 2 }, true], 'the late atlas records are kept');
    assert.deepEqual(once.stash.slice(0, 17).map(map => map.tier), [1, 1, 2, 3, 3, 4, 4, 5, 6, 6, 7, 7, 8, 9, 9, 10, 10], 'a stone of game tier g becomes the highest chart tier under it');
    assert.equal(read("once.atlas.stash.filter(map => map.uid !== 18).every(map => atlas.node(map.node).kind === 'map' && atlas.node(map.node).tier === map.tier)"), true, 'on a map of that tier');
    assert.deepEqual(once.stash.map(map => map.uid), Array.from({ length: 19 }, (_, i) => i + 1), 'every stone keeps its uid');
    assert.deepEqual(once.stash[17], read("stone(18, 'roots_g', 20)"), 'an old guardian stone is kept untouched');
    assert.deepEqual(once.stash[18], { ...read("stone(19, 'sun2', 4)"), rarity: 'rare', mods: [{ id: 'monsterLife', roll: 0.25 }, { id: 'packSize', roll: 1 }], quality: 15, corrupted: true, omen: oldRun('OMEN') },
        'rarity, mods, quality, corruption and omen are kept');
    assert.deepEqual([once.stash[0].node, once.stash[8].node], ['sun1', 'sun4'], 'in its own region where that region has the tier');
    assert.deepEqual(once.memory.tickets, { sun1: [1, 0, 0, 0, 0], sun4: [1, 3, 0, 0, 0], roots_g: [0, 1, 0, 0, 0], apex_gardener: [1, 0, 0, 0, 0] }, 'memories of an old map move to the map that took its row');
    assert.deepEqual(once.memory.best, { sun1: 2, sun4: 3 });
    assert.deepEqual(read('once.currencies'), read('before.currencies'), 'the move grants nothing');
    assert.deepEqual(read('mergeDefaults(JSON.parse(serializeSaveState(once))).atlas'), once, 'loading the moved save again changes nothing');
    assert.deepEqual(read('mergeDefaults(oldSave()).atlas'), once, 'and loading the old save again gives the same result');
    assert.deepEqual(read("(() => { const half = JSON.parse(serializeSaveState(once)); half.atlas.stash.push(stone(50, 'canopy_8', 16), stone(51, 'sun1', 14)); const state = mergeDefaults(half); return [state.atlas.stash.slice(0, 19), state.atlas.stash.slice(19).map(map => [map.uid, atlas.node(map.node).kind, map.tier])]; })()"),
        [once.stash, [[50, 'map', 10], [51, 'map', 10]]], 'a half-moved save: only what still carries an old id moves, a broken chart tier is capped');
    assert.deepEqual(read('atlas.activateSextant(once, () => .5).maps.length'), 4);
    assert.deepEqual(read('[once.atlas.stash.length, atlas.activateSextant(once).maps === undefined, once.atlas.stash.length]'), [23, true, 23], 'the sextant then gives its four stones once');

    // An open map of the old graph is closed the way a failed entry is: its stone, spent fragments or tickets come back; held drops do not.
    const closed = read(`(() => { const state = mergeDefaults(withRun(stone(31, 'roots_3', 5, { rarity: 'magic', mods: [{ id: 'monsterLife', roll: 0.5 }] })));
        return { run: state.atlas.run, back: state.atlas.stash.find(map => map.uid === 31), held: state.atlas.stash.some(map => map.uid === 30), packs: state.atlas.fragments.packs,
            zone: state.currentZoneId, progressZone: getAutoProgressZoneId(state.maxZoneId), stash: state.atlas.stash.length, result: state.atlas.lastResult,
            again: JSON.stringify(mergeDefaults(JSON.parse(serializeSaveState(state))).atlas) === JSON.stringify(state.atlas) }; })()`);
    assert.deepEqual([closed.run, closed.held, closed.packs, closed.stash, closed.result], [null, false, 4, 20, null], 'the open map closes, its spent 각인 returns, its held drops are gone');
    assert.deepEqual([closed.back.tier, closed.back.rarity, closed.back.mods, oldRun(`atlas.node('${closed.back.node}').kind`)], [3, 'magic', [{ id: 'monsterLife', roll: 0.5 }], 'map'], 'its stone returns, moved like the others');
    assert.equal(closed.zone, closed.progressZone, 'the hero stands in the furthest progress zone, not in a map that no longer exists');
    assert.ok(closed.again, 'saving and loading again returns nothing twice');
    assert.deepEqual(read(`(() => { const state = mergeDefaults(withRun(stone(31, 'pinnacle', 20))); return [state.atlas.run, ATLAS.pinnacle.tickets.map(key => state.currencies[key] - before.currencies[key])]; })()`),
        [null, [1, 1, 1, 1]], 'an open old pinnacle returns its four tickets');
    assert.deepEqual(read(`(() => { const state = mergeDefaults(withRun(stone(31, 'roots_g', 20))); return [state.atlas.run, state.atlas.stash.filter(map => map.node === 'roots_g').map(map => map.uid)]; })()`),
        [null, [31, 18]], 'an open old guardian returns its stone');
    assert.deepEqual(read(`(() => { const state = mergeDefaults(withRun(stone(31, 'roots_0', 3, { memory: 1 }))); return [state.atlas.run, state.atlas.memory.tickets.sun1]; })()`),
        [null, [2, 0, 0, 0, 0]], 'a memory fight on an old map returns its memory to the map that took its row');
    assert.deepEqual(read(`(() => { const state = mergeDefaults(withRun(stone(31, 'apex_gardener', 18, { memory: 2 }))); return [!!state.atlas.run, state.atlas.run.map.memory, state.currentZoneId]; })()`),
        [true, 2, 'atlas_map'], 'a fight that still exists goes on');
    // Damaged saves load.
    assert.deepEqual(read(`[{ ...oldSave(), atlas: 'garbage' }, { ...oldSave(), atlas: { stash: 'x', completed: { a: 1 }, bonus: 5, passives: 's_r', run: { map: null }, memory: 5, endgame: [], epoch: 'e' } },
        { ...oldSave(), atlas: { stash: [null, 7, { uid: 1 }, stone('a', 'roots_0', 1), stone(2, 'roots_0', 99), stone(3, 'roots_0', 0)], run: { map: stone(4, 'roots_0', 2), drops: 'x', portals: 'many' } } }]
        .map(raw => { const state = mergeDefaults(raw); return [state.atlas.stash.map(map => [map.uid, map.tier]), state.atlas.completed, state.atlas.run, state.atlas.sextant]; })`),
        [[[], [], null, false], [[], [], null, false], [[[4, 1]], [], null, false]], 'garbage, wrong shapes and half-written stones load; a stale open map still gives its stone back');
}

console.log('atlas: star chart (50 maps, 10 closed gates) = its JSON, 시작 육분의, map rarity/crafting rules, chart tier = chaos depth of its game tier, real map clear, auto-map, portals, entry by tier, first-clear stones, refund, dew entry, 장비 상자, over-cap delivery, save/migration, loop reset: OK');

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
