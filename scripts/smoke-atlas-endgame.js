// 아틀라스 후반부 (data/atlas-endgame.js · js/atlas-endgame.js, docs/atlas-pinnacles-20261002.md 2-1, 3절): the first kill of the shadow wakes the
// atlas; guardians then give their shears, the gardener's echo opens with all five and falls in three named stages through the real combat loop;
// the gardener's fall starts the blight, whose apostles hold blighted maps and give the elder's shards; late kills are witnessed into the weaver's
// invitations (her fight replays the newest witnessed bosses); altar and league rooms hold their materials until the boss falls; saves, refunds
// and the epoch keep it whole.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { run } = fixture(83);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));
let tick = 0;
const advance = () => run(`coreLoop(${1800000000000 + (++tick) * 100})`);
const clearOpenMap = (limit = 9000) => { for (let n = 0; n < limit && run('!!game.atlas.run'); n++) advance(); };
const openNode = (node, tier, rarity = 'normal') => run(`openNode(${JSON.stringify(node)}, ${tier}, ${JSON.stringify(rarity)})`);
run(`
    game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',level:100,
        combatTimeMs:1800000000000,settings:{pauseGameOnOverlay:false,mapCompleteAction:'nextZone'}});
    game.season=12;game.maxZoneId=29;game.currentZoneId=29;game.chaosRealm.unlocked=true;game.loopProgressCurrent.chaos20Cleared=true;
    game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
    game.equipment['무기']={id:90001,slot:'무기',name:'후반부 검사',rarity:'rare',baseStats:[{id:'flatDmg',val:1e12},{id:'flatHp',val:1e12}],stats:[]};
    game.playerHp=getPlayerStats().maxHp;atlas.sync(game);
    var openNode = (node, tier, rarity = 'normal') => { const map = Object.assign(atlasMaps.create(node, tier, rarity), { uid: game.atlas.nextUid++ });
        game.atlas.stash.push(map); return atlasRun.open(map.uid); };
`);

// ---------------------------------------------------------------- asleep: nothing of the late atlas yet
assert.equal(run('atlasEndgame.awakened(game)'), false);
assert.match(run(`atlasEndgame.entryReason(game, 'apex_gardener')`), /세계수의 그림자/, 'the late fights wait for the shadow');
const asleepRolls = copy(`(() => { let seed = 3; const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000);
    const bonus = { encounterExtra: 3, exarch: 100, eater: 100 }, seen = new Set();
    for (let i = 0; i < 400; i++) for (const type of atlasEncounters.roll(bonus, [], random)) seen.add(type);
    return [...seen]; })()`);
assert.ok(!asleepRolls.includes('exarch') && !asleepRolls.includes('eater'), 'no altar before the atlas wakes');
assert.equal(openNode('roots_g', 16), '');
clearOpenMap();
assert.equal(run(`atlasEndgame.count(game, 'shearRoots')`), 0, 'a guardian gives no shear while the atlas sleeps');

// ---------------------------------------------------------------- the shadow wakes the atlas
run('for (const key of ATLAS.pinnacle.tickets) game.currencies[key] = 1;');
assert.equal(run('atlasRun.openPinnacle()'), '');
// The fixture window has no event target: collect the atlas notices (js/atlas-run.js notify) the log and the result screen read.
run(`window.__late = []; window.CustomEvent = function (type, init) { this.type = type; this.detail = init && init.detail; };
    window.dispatchEvent = event => { if (event.type === 'project-idle:atlas-map') window.__late.push(event.detail); return true; };`);
clearOpenMap();
assert.equal(run('atlasEndgame.awakened(game)'), true, 'the shadow’s first fall wakes the atlas');
assert.equal(run(`atlasEndgame.kills(game, 'pinnacle')`), 1);
assert.equal(run(`window.__late.filter(row => row.kind === 'complete').pop().endgame.awakened`), true, 'the result says the atlas woke');

// ---------------------------------------------------------------- guardians give shears; the gardener's echo
assert.match(run(`atlasEndgame.entryReason(game, 'apex_elder')`), /정원사의 메아리 처치 뒤에/, 'the elder waits for the gardener');
for (const region of ['roots', 'trunk', 'canopy', 'garden', 'sanctum']) { assert.equal(openNode(`${region}_g`, 16), ''); clearOpenMap(); }
assert.deepEqual(copy(`['shearRoots','shearTrunk','shearCanopy','shearGarden','shearSanctum'].map(id => atlasEndgame.count(game, id))`), [1, 1, 1, 1, 1],
    'each guardian gives its region’s shear once the atlas is awake');
assert.equal(run('game.atlas.endgame.witness'), 5, 'the weaver witnessed the five guardians');
assert.equal(run(`atlasEndgame.count(game, 'ringInvite')`), 1, 'five witnessed kills make an invitation');
run(`atlasRun.openEndgame('apex_gardener');atlas.cancel(game);`);
assert.equal(run(`atlasEndgame.count(game, 'shearSanctum')`), 1, 'a failed departure hands the shears back');
assert.equal(run(`atlasRun.openEndgame('apex_gardener')`), '');
const gardener = copy(`(() => { const zone = getZone(game.currentZoneId);
    return { kind: zone.atlasKind, stages: zone.exploration.bossStages, arena: zone.exploration.arena, act: zone.exploration.act, names: zone.bossStageNames,
        hazard: zone.trialHazard && zone.trialHazard.pattern, hp: zone.bossMods.hpMul, name: zone.name,
        waiting: game.actExploration.packs.filter(pack => pack.stage !== null).map(pack => [pack.waiting[0].name, pack.waiting[0].patternMode, pack.waiting[0].apexMechanic, pack.waiting[0].bossAssetKey]) }; })()`);
assert.deepEqual([gardener.kind, gardener.stages, gardener.arena, gardener.act], ['apex', 3, true, 6], 'the echo waits in the ruined courtyard’s boss room, three stages');
assert.deepEqual(gardener.names, ['정원사의 메아리', '접붙이는 정원사', '판결하는 정원사']);
assert.equal(gardener.hazard, 'line', 'pruning blades sweep the floor');
assert.deepEqual(gardener.waiting.map(row => row.slice(1)), [['apex', 'prune', 'bossAct6'], ['apex', 'graft', 'bossAct6'], ['apex', 'verdict', 'bossAct6']],
    'each stage body carries its own special and the gardener’s picture');
assert.ok(gardener.waiting.every((row, i) => row[0].endsWith(gardener.names[i])), 'stage bodies carry their names');
assert.deepEqual(copy(`[1, 2, 3, 6].map(n => atlasEndgame.patternState('prune', n)).map(row => [row.isSpecial, row.telegraphKind, row.damageMul])`),
    [[false, 'lane', 1], [false, 'lane', 1], [true, 'lane', 1.5], [true, 'lane', 1.5]], 'the special lands every third attack');
const before = copy(`{ golden: game.currencies.goldenRule || 0, bag: game.inventory.length }`);
clearOpenMap(12000);
const fell = copy(`{ result: game.atlas.lastResult, kills: atlasEndgame.kills(game, 'apex_gardener'), golden: game.currencies.goldenRule || 0,
    unique: game.inventory.some(item => item.name === '정원사의 가지 왕관'), done: game.atlas.completed.includes('apex_gardener') }`);
assert.equal(fell.result.outcome, 'complete', 'all three stages fall in the real combat loop');
assert.equal(fell.kills, 1);
assert.equal(fell.golden, before.golden + 3, 'its rewards are paid');
assert.equal(fell.unique, true, 'the first kill always drops its unique');
assert.equal(fell.done, true, 'and it counts as a completed node (an atlas point)');

// ---------------------------------------------------------------- blight and the elder's apostles
assert.doesNotMatch(run(`atlasEndgame.entryReason(game, 'apex_elder')`), /처치 뒤에/, 'the elder opens once the gardener has fallen');
assert.equal(openNode('roots_0', 3), '');
clearOpenMap();
assert.equal(run('game.atlas.endgame.blight.roots'), 1, 'completing a map spreads blight in its region');
run('game.atlas.endgame.blight.roots = 10;');
const apostle = copy(`(() => { const map = Object.assign(atlasMaps.create('roots_1', 4, 'normal'), { uid: game.atlas.nextUid++ });
    game.atlas.stash.push(map); atlas.begin(game, map.uid, 29, () => 0.01); const zone = getZone(ATLAS.zoneId);
    return { apostle: game.atlas.run.endgame.apostle, boss: zone.bossName, hp: zone.bossMods.hpMul }; })()`);
assert.deepEqual([apostle.apostle, apostle.boss], ['apostleRoot', '뿌리의 사도'], 'a blighted roots map is held by the root apostle');
assert.ok(apostle.hp >= 1.6, 'and the apostle hits harder than the map boss');
run('atlasRun.reenter();');
clearOpenMap();
assert.equal(run(`atlasEndgame.count(game, 'rotRoot')`), 1, 'the apostle gives its rot shard');

// ---------------------------------------------------------------- altars and league rooms hold their materials until the boss
// (the awake maps above may already have rolled altars of their own, so everything here is measured against the stock before)
const altar = copy(`(() => { const map = Object.assign(atlasMaps.create('garden_0', 3, 'normal'), { uid: game.atlas.nextUid++ });
    game.atlas.stash.push(map); atlasRun.open(map.uid); const zone = getZone(ATLAS.zoneId);
    const before = atlasEndgame.count(game, 'ember');
    const held = atlasEndgame.roomItems(game, zone, 'exarch', () => 0.99), shard = atlasEndgame.roomItems(game, zone, 'hive', () => 0.99);
    return { held, shard, before, after: atlasEndgame.count(game, 'ember'), run: game.atlas.run.endgame.items.ember }; })()`);
assert.ok(altar.held.length && altar.held[0][0] === 'ember' && altar.held[0][1] >= 2, 'an emptied red altar finds embers');
assert.equal(altar.shard[0][0], 'royalHoney', 'an emptied hive finds royal honey');
assert.equal(altar.after, altar.before, 'they wait in the run, not in the stock');
assert.ok(altar.run >= altar.held[0][1]);
clearOpenMap();
const settled = copy(`(() => { const done = window.__late.filter(row => row.kind === 'complete').pop();
    return { items: done.endgame.items, ember: atlasEndgame.count(game, 'ember') }; })()`);
const movedEmber = settled.items.filter(([item]) => item === 'ember').reduce((sum, [, amount]) => sum + amount, 0);
assert.ok(movedEmber >= altar.held[0][1], 'the boss down moves them to the stock');
assert.equal(settled.ember, Math.min(99, altar.before + movedEmber), 'exactly what the run held');
run(`game.atlas.endgame.items.ember = 9;`);
assert.match(run(`atlasEndgame.entryReason(game, 'apex_exarch')`), /성화 잉걸 9\/10/, 'ten embers open the archbishop');
run(`game.atlas.endgame.items.ember = 10; game.atlas.endgame.items.royalHoney = 0;`);
assert.equal(run(`atlasEndgame.entryReason(game, 'apex_exarch')`), '');
assert.match(run(`atlasEndgame.entryReason(game, 'league_hive')`), /왕실 꿀/, 'the hive queen waits for her honey');

// ---------------------------------------------------------------- the weaver replays the newest witnessed bosses
run(`game.atlas.endgame.items.ringInvite = 1;`);
assert.equal(run(`atlasRun.openEndgame('apex_maven')`), '');
const weaver = copy(`(() => { const zone = getZone(game.currentZoneId); return { names: zone.bossStageNames, stages: zone.exploration.bossStages, act: zone.exploration.act }; })()`);
assert.equal(weaver.stages, 4, 'the weaver fights in four stages');
assert.equal(weaver.act, 10, 'in the crown wheel');
assert.ok(weaver.names[1].startsWith('엮인 메아리: ') && weaver.names[1] !== weaver.names[2], 'her middle stages are echoes of witnessed bosses');
run('atlas.cancel(game);');
assert.equal(run(`atlasEndgame.count(game, 'ringInvite')`), 1, 'a failed departure hands the invitation back');

// ---------------------------------------------------------------- saves, loops and the epoch
const saved = copy(`(() => { const raw = JSON.parse(serializeSaveState(game)), kept = mergeDefaults(JSON.parse(JSON.stringify(raw))).atlas.endgame;
    raw.atlas.endgame.items.ember = 9999; raw.atlas.endgame.items.bogus = 3; raw.atlas.endgame.kills.constructor = 5; raw.atlas.endgame.blight.roots = 99;
    const fixed = mergeDefaults(raw).atlas.endgame;
    return { awake: kept.kills.pinnacle === 1, ember: fixed.items.ember, bogus: 'bogus' in fixed.items, ctor: Object.hasOwn(fixed.kills, 'constructor'), blight: fixed.blight.roots }; })()`);
assert.deepEqual(saved, { awake: true, ember: 99, bogus: false, ctor: false, blight: 10 }, 'the late atlas saves and clamps');
run('atlas.onLoopReset(game);');
assert.equal(run('atlasEndgame.awakened(game)'), true, 'the late atlas survives the loop');
run('game.atlas.seeds = 4; atlasEpoch.rebirth(game);');
assert.equal(run('atlasEndgame.awakened(game)'), false, 'the epoch puts it back to sleep');
assert.equal(run(`atlasEndgame.count(game, 'ringInvite')`), 0);

// ---------------------------------------------------------------- review fixes (2026-10-02)
assert.equal(run(`(() => { const raw = JSON.parse(serializeSaveState(game)); delete raw.atlas.endgame;
    raw.atlas.completed = ['roots_0', 'pinnacle']; return atlasEndgame.awakened(mergeDefaults(raw)); })()`), true, 'a save from before the late atlas that beat the shadow loads awake');
run(`game.atlas.endgame.kills.pinnacle = 1; game.atlas.endgame.items.ember = 10;`);
assert.equal(run(`atlasRun.openEndgame('apex_exarch')`), '');
assert.equal(run(`atlasEndgame.count(game, 'ember')`), 0);
run('atlas.onLoopReset(game); game.currentZoneId = 29;');
assert.deepEqual([run(`atlasEndgame.count(game, 'ember')`), run('game.atlas.run')], [10, null], 'a loop reset hands the open late fight’s offering back');
assert.deepEqual(copy(`(() => { game.atlas.endgame.items.ember = 95;
    const out = atlasEndgame.onComplete(game, atlas.node('roots_0'), { endgame: { items: { ember: 10 } } });
    return { told: out.items, stock: atlasEndgame.count(game, 'ember') }; })()`), { told: [['ember', 4]], stock: 99 }, 'at the cap the result tells what really came in');
run(`game.atlas.completed = ['roots_0', 'apex_maven'];`);
assert.equal(run('atlas.bestTier(game)'), run(`atlas.effectiveTier(game, atlas.node('roots_0'))`), 'late fights do not raise the next loop’s starter maps');
assert.ok(run('Object.values(ATLAS_ENDGAME.mechanics).every(rule => rule.damageMul <= getMaximumBossPatternDamageMultiplier())'),
    'no late special out-hits the boss pattern peak the power estimate assumes');
// (test pieces without level or attribute requirements: the elder's numbers on the amulet, 공허의 첨탑's on the ring processed after it)
assert.deepEqual(copy(`(() => { const piece = (id, slot, perHit, maxStacks) => ({ id, slot, name: '시험 ' + slot, rarity: 'unique', baseStats: [], stats: [],
        uniqueEffect: '시험', uniqueEffectKey: 'hitApplyChaosResDown', uniqueEffectParams: { perHit, maxStacks } });
    game.equipment['목걸이'] = piece(90011, '목걸이', 3, 12); game.equipment['반지1'] = piece(90012, '반지', 1, 10);
    const stat = getPlayerStats().uniqueChaosResDownOnHit; game.equipment['목걸이'] = null; game.equipment['반지1'] = null; return stat; })()`),
    { perHit: 3, maxStacks: 12 }, 'two chaos-shred uniques keep the better of each number (the last one used to win)');
const lonelyEchoes = copy(`(() => { game.atlas.endgame.witnessed = []; game.atlas.endgame.items.ringInvite = 1; atlasRun.openEndgame('apex_maven');
    const tints = game.actExploration.packs.filter(pack => pack.stage === 1 || pack.stage === 2).map(pack => pack.waiting[0].bossVisualTint);
    atlas.cancel(game); game.currentZoneId = 29; return tints; })()`);
assert.deepEqual(lonelyEchoes, [200, 200], 'echo stages stay (weaker, tinted) echoes even with nothing witnessed');
assert.equal(run(`getZone(ATLAS.zoneId) ? 1 : 0`), 0);
const exarchZone = copy(`(() => { game.atlas.endgame.items.ember = 10; atlasRun.openEndgame('apex_exarch'); const zone = getZone(game.currentZoneId);
    const out = { elements: zone.trapElements, name: zone.trapName }; atlas.cancel(game); game.currentZoneId = 29; return out; })()`);
assert.deepEqual(exarchZone, { elements: ['fire'], name: '바닥 함정' }, 'a late floor hazard burns with its boss’s element under its own name');
// ---------------------------------------------------------------- the late view (js/atlas-endgame-ui.js)
const lateView = copy(`(() => { game.atlas.endgame.kills = { pinnacle: 1 }; game.atlas.endgame.items = { ember: 10 };
    const ready = atlasEndgameUi.html(); atlasRun.openEndgame('apex_exarch'); const busy = atlasEndgameUi.html(); atlas.cancel(game); game.currentZoneId = 29;
    const count = html => (html.match(/atlas-late-card is-ready/g) || []).length;
    return { ready: count(ready), busy: count(busy), blockLine: busy.includes('열린 지도를 마치거나 닫으면'), elderLock: ready.includes('정원사의 메아리 처치 뒤에 열립니다'),
        named: (ready.match(/aria-label="[^"]+ 도전"/g) || []).length }; })()`);
assert.deepEqual(lateView, { ready: 1, busy: 0, blockLine: true, elderLock: true, named: 9 },
    'the late view: the one affordable fight is ready, an open map blocks all of them in one line, the elder says what opens it, every button is named');
run(`tutorialQueue.length = 0; game.seenTutorials = (game.seenTutorials || []).filter(key => key !== 'atlas_awakened'); atlasEndgameUi.noticeAwakened(); atlasEndgameUi.noticeAwakened();`);
assert.deepEqual(copy(`tutorialQueue.filter(row => row.key === 'atlas_awakened').map(row => [row.subtabId, row.atlasView])`), [['map-explore-worldtree', 'late']],
    'the awakening card follows the state (once) and opens the late view');
console.log('atlas endgame: awakening, shears, gardener three stages in the real loop, blight + apostles, altars and league rooms held, weaver echoes, saves, epoch, review fixes, late view: OK');
