// 세계수 아틀라스 3단계 (data/atlas-passives.js · js/atlas-passives.js · js/atlas-encounters.js, docs/atlas-endgame-20260930.md 3절):
// passives spend atlas points along their wheels and refund only when nothing leans on them; fragments in the device are used
// once per map and force their content rooms; a content room is an elite-led, tuned pack whose clear pays that content's
// currency with the map's loot; the run keeps the passives it opened with; saves and the loop keep the right parts.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { run } = fixture(53);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));
let tick = 0;
const advance = () => run(`coreLoop(${1800000000000 + (++tick) * 100})`);
run(`
    game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',level:100,
        combatTimeMs:1800000000000,settings:{pauseGameOnOverlay:false,mapCompleteAction:'nextZone'}});
    game.season=10;game.maxZoneId=29;game.currentZoneId=29;game.chaosRealm.unlocked=true;game.loopProgressCurrent.chaos20Cleared=true;
    game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
    game.equipment['무기']={id:90001,slot:'무기',name:'진행 검사',rarity:'rare',baseStats:[{id:'flatDmg',val:1000000},{id:'flatHp',val:1000000}],stats:[]};
    game.playerHp=getPlayerStats().maxHp;atlas.sync(game);
`);

// ---------------------------------------------------------------- passives
assert.match(run(`atlasPassives.allocate(game,'s_r')`), /포인트/, 'no points, no passive');
run(`game.atlas.completed=atlas.nodes.filter(node=>node.tier<=2).slice(0,6).map(node=>node.id);`);
assert.equal(run('atlas.points(game)'), 6);
assert.match(run(`atlasPassives.allocate(game,'s_a1')`), /먼저/, 'a branch starts at its root');
for (const id of ['s_r', 's_a1', 's_a2', 's_aN', 's_k1']) assert.equal(run(`atlasPassives.allocate(game,'${id}')`), '', id);
assert.match(run(`atlasPassives.refund(game,'s_aN')`), /먼저 되돌리/, 'a keystone held only by this notable keeps it');
assert.equal(run(`atlasPassives.allocate(game,'s_b1')`), '');
assert.match(run(`atlasPassives.allocate(game,'s_b2')`), /포인트/, 'six points, six passives');
const sums = copy('atlasPassives.effects(game)');
assert.deepEqual({ drop: sums.mapDrop, starter: sums.starter, up: sums.mapTierUp }, { drop: 10 + 10 + 10 + 20 + 15, starter: 3, up: 3 });
assert.equal(run(`atlasPassives.refund(game,'s_k1')`), '');
assert.equal(run(`atlasPassives.refund(game,'s_aN')`), '', 'with the keystone gone the notable comes back freely');
assert.equal(run('atlasPassives.available(game)'), 2);
const trimmed = copy(`atlasPassives.normalize(['s_r','s_b1','s_b2','s_k1','s_bN','nope','s_r'], 10)`);
assert.ok(trimmed.includes('s_k1') && trimmed.includes('s_bN'), 'a keystone saved before its later notable still loads');
assert.deepEqual(copy(`atlasPassives.normalize(['s_r','s_a1','s_a2'], 2)`), ['s_r', 's_a1'], 'no more passives than points');
assert.deepEqual(copy(`atlasPassives.normalize(['s_a1','s_r'], 5)`), ['s_r', 's_a1']);

// ---------------------------------------------------------------- fragments, content rooms and the run's snapshot
run(`game.atlas.passives=[];game.atlas.completed=atlas.nodes.map(node=>node.id);
    for (const id of ['l_r','l_a1','l_a2','l_aN','s_r','s_b1','s_b2','s_bN','s_k2']) atlasPassives.allocate(game,id);
    game.atlas.fragments={breach:2,treasure:1,packs:1};atlas.setLoadout(game,['breach','treasure','packs']);`);
assert.deepEqual(copy('game.atlas.loadout'), ['breach', 'treasure'], 'the device holds two fragments until a passive adds a third');
const uid = run(`game.atlas.stash.push(Object.assign(atlasMaps.create('roots_0',1,'normal'),{uid:game.atlas.nextUid++}));game.atlas.stash.at(-1).uid`);
assert.equal(run(`atlasRun.open(${uid})`), '');
const opened = copy(`(() => { const run = game.atlas.run, zone = getZone(game.currentZoneId);
    return { fragments: run.fragments, stock: game.atlas.fragments, encounters: run.encounters, portals: run.portals, quantity: run.bonus.quantity,
        packExtra: zone.packExtra, zoneQuantity: zone.atlasLootQuantity, zoneRooms: zone.atlasEncounters }; })()`);
assert.deepEqual(opened.fragments, ['breach', 'treasure']);
assert.deepEqual([opened.stock.breach, opened.stock.treasure || 0], [1, 0], 'each fragment used once');
assert.ok(opened.encounters.includes('breach') && opened.encounters.includes('treasure'), 'fragments force their content rooms');
assert.equal(opened.portals, 4, 'the portal keystone adds a portal');
assert.equal(opened.quantity, 22);
assert.equal(opened.packExtra, 1, 'the pack-size notable reaches the map');
assert.deepEqual(opened.zoneRooms, opened.encounters);
run(`atlasPassives.refund(game,'s_k2');`);
assert.equal(copy('getZone(game.currentZoneId).packExtra'), 1, 'the open map keeps the passives it opened with');
run('game.atlas.passives.push("s_k2");');

for (let n = 0; n < 200 && run('!game.actExploration || game.actExploration.zoneId !== "atlas_map" || !!game.actExploration.arrival'); n++) advance();
const packs = copy(`game.actExploration.packs.filter(pack => pack.encounter).map(pack => ({ type: pack.encounter, size: pack.aliveIds.length,
    elites: pack.eliteIds.length, names: pack.waiting.map(enemy => enemy.name) }))`);
assert.deepEqual(packs.map(pack => pack.type).sort(), ['breach', 'treasure'], 'each content has its own room');
const breach = packs.find(pack => pack.type === 'breach');
assert.equal(breach.size, 3 + 1 + 4, 'a breach room is the base pack + the pack-size passive + its own four');
assert.equal(breach.elites, 1, 'content rooms are elite-led (they seal the boss gate)');
assert.ok(breach.names.every(name => name.startsWith('공허의')));
const before = copy(`({ voidChisel: game.currencies.voidChisel || 0, magicBud: game.currencies.magicBud || 0 })`);
let cleared = false;
for (let n = 0; n < 6000 && run('!!game.atlas.run'); n++) {
    advance();
    if (!cleared && run('!!game.actExploration && game.actExploration.packs.some(pack => pack.encounter === "treasure" && pack.aliveIds.length === 0)')) {
        cleared = true;
        const held = copy('game.actExploration.loot.currencies');
        assert.ok((held.magicBud || 0) > 0, 'an emptied treasure room pays into the map loot, not the wallet');
        assert.equal(run('game.currencies.magicBud || 0'), before.magicBud, 'nothing reaches the wallet before the boss falls');
    }
}
assert.ok(cleared, 'the hero clears the treasure room on the way to the boss');
const after = copy(`({ result: game.atlas.lastResult, voidChisel: game.currencies.voidChisel || 0, magicBud: game.currencies.magicBud || 0 })`);
assert.equal(after.result.outcome, 'complete');
assert.ok(after.voidChisel > before.voidChisel, 'the breach room paid void chisels once the map was done');
assert.ok(after.magicBud > before.magicBud);

// ---------------------------------------------------------------- save boundary and the loop
run(`game.atlas.fragments={maps:3,boss:1};atlas.setLoadout(game,['maps']);atlasRun.open(game.atlas.stash[0].uid);`);
const saved = copy(`(() => { const state = mergeDefaults(JSON.parse(serializeSaveState(game))); return { run: state.atlas.run, passives: state.atlas.passives,
    loadout: state.atlas.loadout, fragments: state.atlas.fragments }; })()`);
assert.deepEqual(saved.run.fragments, ['maps']);
assert.equal(saved.run.bonus.mapDrop, 60 + 10 + 0, 'the run snapshot survives a reload');
assert.deepEqual(saved.loadout, ['maps']);
assert.equal(saved.passives.length, run('game.atlas.passives.length'));
const corrupt = copy(`(() => { const raw = JSON.parse(serializeSaveState(game)); raw.atlas.run.bonus = { quantity: 'x', mapDrop: 1e9 };
    raw.atlas.run.encounters = ['breach', 'volcano', 'breach']; raw.atlas.fragments = { maps: -2, boss: 7.9, dragon: 3 }; raw.atlas.loadout = ['boss','maps','hive','packs'];
    const state = mergeDefaults(raw); return { bonus: state.atlas.run.bonus, encounters: state.atlas.run.encounters, fragments: state.atlas.fragments, loadout: state.atlas.loadout }; })()`);
assert.equal(corrupt.bonus.quantity, 0);
assert.equal(corrupt.bonus.mapDrop, 1000, 'bonus values are clamped');
assert.deepEqual(corrupt.encounters, ['breach']);
assert.deepEqual(corrupt.fragments, { boss: 7 });
assert.equal(corrupt.loadout.length, run('atlas.slots(game)'), 'the loadout never exceeds the device');
run('atlas.onLoopReset(game);');
assert.deepEqual(copy('game.atlas.fragments'), {}, 'fragments are per loop like maps');
assert.deepEqual(copy('game.atlas.loadout'), ['maps'], 'the device setting stays');
assert.ok(run('game.atlas.passives.length') > 0, 'passives stay');
console.log('atlas content: passives (points, wheels, refunds, snapshot), fragments, content rooms paid through the map loot, save/loop: OK');
