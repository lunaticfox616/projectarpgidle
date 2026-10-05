// Controlled encounters with versioned equipment builds; no player saves or fabricated flat stats.
// These are selected/crafted examples, not average loot, progression time or player enjoyment.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

function inspectBuild() {
    const allocated = new Set(game.passives), root = getPassiveTreeRootNodeId(game);
    const edges = getPassiveTreeAdjacency(allocated), connected = new Set([root]), queue = [root];
    for (const id of queue) for (const next of edges.get(id) || []) {
        if (allocated.has(next) && !connected.has(next)) { connected.add(next); queue.push(next); }
    }
    const stats = getPlayerStats(false);
    return {
        allocated: allocated.size, points: game.passivePoints, level: game.level,
        disconnected: [...allocated].filter(id => !connected.has(id)),
        invalidEquipment: Object.entries(game.equipment).filter(([, item]) => item)
            .filter(([slot, item]) => !combatEquipmentStats.inspect(item, slot).ok).map(([slot]) => slot),
        dps: stats.totalDps, hp: stats.maxHp,
        resists: [stats.resF, stats.resC, stats.resL, stats.resChaos]
    };
}

function encounter(input) {
    game.season = input.loop; game.loopCount = input.loop - 1;
    game.currentZoneId = input.zone; game.combatHalted = false;
    game.isBackgroundCalculation = true;
    game.pendingLoopHeroSelection = false; game.pendingLoopDecision = false; game.pendingLoopReady = false;
    game.settings.pauseGameOnOverlay = false; game.settings.showDeathNotice = false;
    game.settings.mapCompleteAction = 'stop'; game.settings.townReturnAction = 'stop';
    game.loopDeaths = 0; game.loopKills = 0;
    gameplayStarted = true; startupOverlayActive = false;
    resetBattleRuntimeVisuals(); resetCombatTacticsRuntime();
    game.actExploration = null; game.encounterPlan = [{at:101,count:0}]; game.encounterIndex = 0;
    game.runProgress = 20; game.moveTimer = 0; game.gridPlayer = {gx:3,gy:4,gridMoveTimer:0};
    const zone = getZone(input.zone);
    game.enemies = [Object.assign(createEnemy(zone, {boss:true,at:50}, 0), {gx:4,gy:3})];
    const enemy = game.enemies[0], stats = getPlayerStats(false), start = getCombatTime();
    game.playerHp = stats.maxHp; game.playerEnergyShield = stats.energyShield;
    let elapsedMs = 0, lowestLife = game.playerHp;
    while (elapsedMs < 120000 && enemy.hp > 0 && !game.loopDeaths && !game.combatHalted) {
        elapsedMs += 100; coreLoop(start + elapsedMs);
        lowestLife = Math.min(lowestLife, game.playerHp);
    }
    return {...input, zoneName:zone.name, enemyHp:enemy.maxHp, dps:stats.totalDps, life:stats.maxHp,
        elapsedMs, remainingHp:Math.max(0,enemy.hp), lowestLifePct:100*lowestLife/stats.maxHp,
        outcome:game.loopDeaths?'death':enemy.hp<=0?'clear':game.combatHalted?'halt':'timeout'};
}

const builds = {}, rows = [], started = performance.now();
for (const name of ['legal-build', 'crafted-t15-build']) {
    const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, '../tests/fixtures/world-tree-atlas', name + '.json'), 'utf8'));
    for (const loop of [10, 30, 50]) for (const zone of [9, 29]) for (const seed of [17, 29]) {
        const runtime = buildGameRuntime();
        let random = seed;
        runtime.Math = Object.create(Math);
        runtime.Math.random = () => ((random = (Math.imul(random, 1664525) + 1013904223) >>> 0) / 0x100000000);
        runtime.snapshot = snapshot;
        const run = code => vm.runInContext(code, runtime);
        run('game=mergeDefaults(snapshot);window.game=game;');
        const before = JSON.parse(run(`JSON.stringify((${inspectBuild.toString()})())`));
        assert.deepEqual(before.disconnected, [], name + ': connected allocated passives');
        assert.deepEqual(before.invalidEquipment, [], name + ': equipment meets current requirements');
        assert.ok(before.allocated + before.points <= before.level - 1, name + ': within level-earned point budget');
        run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));window.game=game;');
        assert.deepEqual(JSON.parse(run(`JSON.stringify((${inspectBuild.toString()})())`)), before,
            name + ': save round trip preserves build and stats');
        builds[name] = before;
        runtime.probeInput = {build:name,loop,zone,seed};
        rows.push(JSON.parse(run(`JSON.stringify((${encounter.toString()})(probeInput))`)));
    }
}
const output = process.argv[2] || 'artifacts/main-playtest/build-combat.json';
fs.mkdirSync(path.dirname(output), {recursive:true});
const report = {method:'24 seeded boss encounters using actual equipment/passives/gems from versioned selected T14 and crafted T15 builds. Current equipment requirements, passive connectivity, level point budget and save round trip checked. Same gear across loops, no new permanent investment. Direct encounter setup bypasses destination access gates. This isolates scaling; not normal clear-time targets, class balance or a human fun score.',
    wallMs:performance.now()-started, builds, rows};
fs.writeFileSync(output, JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,wallMs:report.wallMs,builds,rows:rows.map(({build,loop,zone,seed,outcome,elapsedMs})=>({build,loop,zone,seed,outcome,elapsedMs}))},null,2));
