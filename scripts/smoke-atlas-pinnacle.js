// 세계수 아틀라스 4단계 (docs/atlas-endgame-20260930.md 3절): a region's guardian opens behind its innermost maps and its map drops
// from that region's 13+ bosses; each guardian kill pays its root ticket; the four tickets open the pinnacle, whose three-stage
// boss grants a world-tree seed; every seed lifts every node two tiers; four seeds stand in for loop 50 at the Beyond gate.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { run } = fixture(67);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));
let tick = 0;
const advance = () => run(`coreLoop(${1800000000000 + (++tick) * 100})`);
const clearOpenMap = (limit = 6000) => { for (let n = 0; n < limit && run('!!game.atlas.run'); n++) advance(); };
run(`
    game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',level:100,
        combatTimeMs:1800000000000,settings:{pauseGameOnOverlay:false,mapCompleteAction:'nextZone'}});
    game.season=12;game.maxZoneId=29;game.currentZoneId=29;game.chaosRealm.unlocked=true;game.loopProgressCurrent.chaos20Cleared=true;
    game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
    game.equipment['무기']={id:90001,slot:'무기',name:'정점 검사',rarity:'rare',baseStats:[{id:'flatDmg',val:1e11},{id:'flatHp',val:1e11}],stats:[]};
    game.playerHp=getPlayerStats().maxHp;atlas.sync(game);
`);

// ---------------------------------------------------------------- guardians
assert.equal(run(`atlas.status(game,'roots_g')`), 'locked', 'a guardian waits behind its region');
run(`game.atlas.completed=['roots_7'];`);
assert.equal(run(`atlas.status(game,'roots_g')`), 'open', 'completing an innermost map opens the guardian');
const guardianDrop = copy(`(() => {
    const map = Object.assign(atlasMaps.create('roots_7', 13, 'normal'), { uid: game.atlas.nextUid++ });
    game.atlas.stash.push(map); atlas.begin(game, map.uid, 29);
    const zone = getZone(ATLAS.zoneId), drops = atlas.dropFromKill(game, zone, { isBoss: true }, () => 0.001);
    atlas.close(game, 'failed');
    return drops.map(entry => ({ node: entry.node, tier: entry.tier }));
})()`);
assert.ok(guardianDrop.some(entry => entry.node === 'roots_g' && entry.tier === 16), 'a 13+ boss of the region drops the guardian map');
const shallow = copy(`(() => {
    const map = Object.assign(atlasMaps.create('roots_4', 7, 'normal'), { uid: game.atlas.nextUid++ });
    game.atlas.stash.push(map); atlas.begin(game, map.uid, 29);
    const drops = atlas.dropFromKill(game, getZone(ATLAS.zoneId), { isBoss: true }, () => 0.001);
    atlas.close(game, 'failed');
    return drops.filter(entry => entry.node.endsWith('_g')).length;
})()`);
assert.equal(shallow, 0, 'shallow maps never drop guardians');

run(`game.atlas.stash.push(Object.assign(atlasMaps.create('roots_g', 16, 'normal'), { uid: game.atlas.nextUid++ }));`);
const guardianUid = run('game.atlas.stash.at(-1).uid');
const chaosTickets = run('game.currencies.uberRootTicketChaos || 0');
assert.equal(run(`atlasRun.open(${guardianUid})`), '');
const arena = copy(`(() => { const zone = getZone(game.currentZoneId); return { kind: zone.atlasKind, arena: zone.exploration.arena, act: zone.exploration.act, hp: zone.bossMods.hpMul, boss: zone.bossName }; })()`);
assert.deepEqual([arena.kind, arena.arena, arena.act], ['guardian', true, 1], 'a guardian waits at the gate of its region map (deep roots: the root cave)');
assert.equal(arena.hp, 2.5);
clearOpenMap();
assert.equal(run('game.atlas.lastResult && game.atlas.lastResult.outcome'), 'complete', 'the guardian falls in the real combat loop');
assert.equal(run('game.currencies.uberRootTicketChaos'), chaosTickets + 1, 'the roots guardian pays the chaos ticket');
assert.ok(run(`game.atlas.completed.includes('roots_g')`), 'and counts as a completed node');

run(`game.currencies.uberRootTicketFlame=3;game.currencies.uberRootTicketStorm=2;game.currencies.uberRootTicketFrost=0;
    game.atlas.stash.push(Object.assign(atlasMaps.create('trunk_g', 16, 'normal'), { uid: game.atlas.nextUid++ }));
    atlasRun.open(game.atlas.stash.at(-1).uid);atlasRun.finish(getZone(game.currentZoneId));`);
assert.equal(run('game.currencies.uberRootTicketFrost'), 1, 'the trunk guardian fills the ticket you hold fewest of');

// ---------------------------------------------------------------- the pinnacle
run('game.currencies.uberRootTicketChaos=0;');
assert.match(run('atlas.pinnacleReason(game)'), /뿌리 입장권/, 'the pinnacle needs all four tickets');
run('for (const key of ATLAS.pinnacle.tickets) game.currencies[key] = Math.max(1, game.currencies[key] || 0);');
const ticketsBefore = copy('ATLAS.pinnacle.tickets.map(key => game.currencies[key])');
run('atlas.beginPinnacle(game, 29);atlas.cancel(game);');
assert.deepEqual(copy('ATLAS.pinnacle.tickets.map(key => game.currencies[key])'), ticketsBefore, 'a failed departure hands the tickets back');
assert.equal(run('atlasRun.openPinnacle()'), '');
assert.deepEqual(copy('ATLAS.pinnacle.tickets.map(key => game.currencies[key])'), ticketsBefore.map(n => n - 1), 'one of each ticket is spent');
const pinnacle = copy(`(() => { const zone = getZone(game.currentZoneId); return { kind: zone.atlasKind, stages: zone.exploration.bossStages, name: zone.name, tier: zone.atlasTier }; })()`);
assert.deepEqual([pinnacle.kind, pinnacle.stages, pinnacle.tier], ['pinnacle', 3, 16]);
const golden = run('game.currencies.goldenRule || 0');
clearOpenMap(9000);
const seeded = copy('{ result: game.atlas.lastResult, seeds: game.atlas.seeds, golden: game.currencies.goldenRule || 0 }');
assert.equal(seeded.result.outcome, 'complete', 'all three stages of the shadow fall');
assert.equal(seeded.seeds, 1, 'the pinnacle grants a world-tree seed');
assert.equal(seeded.golden, golden + 2, 'and its rewards');
assert.equal(run(`atlas.status(game,'pinnacle')`), 'complete');

// ---------------------------------------------------------------- seeds lift every tier
const lifted = copy(`{ roots0: atlas.effectiveTier(game, atlas.node('roots_0')), top: atlas.effectiveTier(game, atlas.node('trunk_8')), pin: atlas.effectiveTier(game, atlas.pinnacle) }`);
assert.deepEqual(lifted, { roots0: 3, top: 18, pin: 18 }, 'one seed lifts every node two tiers');
const fresh = copy(`(() => { const s = { ...game, atlas: { ...game.atlas, stash: [], starterSeason: 0 } }; atlas.sync(s, () => 0.5); return s.atlas.stash.map(map => map.tier); })()`);
assert.ok(fresh.length && fresh.every(tier => tier >= 3), 'maps rolled after a seed carry the lifted tiers');
run('game.atlas.seeds=4;');
assert.equal(run(`atlas.effectiveTier(game, atlas.node('trunk_8'))`), 24, 'four seeds reach tier 24');
assert.equal(copy(`atlas.preview(game, Object.assign(atlasMaps.create('trunk_8', 24), { uid: 1 })).equivalentDepth`), 66, 'tier 24 fights like deep chaos 66');

// ---------------------------------------------------------------- Beyond the Boundary and saves
run(`game.season=31;game.clearedRootBosses=['pinnacle_observer'];game.atlas.seeds=3;`);
assert.equal(run('isBeyondBoundaryUnlockRequirementMet(game)'), false, 'three seeds are not enough before loop 50');
run('game.atlas.seeds=4;');
assert.equal(run('isBeyondBoundaryUnlockRequirementMet(game)'), true, 'four seeds stand in for loop 50');
run(`game.clearedRootBosses=[];`);
assert.equal(run('isBeyondBoundaryUnlockRequirementMet(game)'), false, 'the Observer is still required');
const saved = copy(`(() => { const raw = JSON.parse(serializeSaveState(game)); const kept = mergeDefaults(JSON.parse(JSON.stringify(raw))).atlas.seeds;
    raw.atlas.seeds = 9; raw.atlas.stash.push({ uid: 99999, node: 'pinnacle', tier: 16, rarity: 'normal', mods: [] });
    const clamped = mergeDefaults(raw).atlas; return { kept, clamped: clamped.seeds, pinnacleInStash: clamped.stash.some(map => map.node === 'pinnacle') }; })()`);
assert.deepEqual(saved, { kept: 4, clamped: 4, pinnacleInStash: false }, 'seeds persist and clamp; the pinnacle is never a stash map');
run('atlas.onLoopReset(game);');
assert.equal(run('game.atlas.seeds'), 4, 'seeds survive the loop');
console.log('atlas pinnacle: guardian gate/drops/tickets, pinnacle tickets + three stages + seed, seeds lift tiers, Beyond gate, saves: OK');
