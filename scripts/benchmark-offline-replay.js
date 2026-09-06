// Same real combat rules and seeded inputs before/after optimization; no reward projection.
const fs = require('node:fs');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const fixture = require('./lib/replay-fixture');
const durationMs = Number(process.env.REPLAY_DURATION_MS || 180000);
const output = process.argv[2] || 'artifacts/offline-replay-benchmark.json';
const cases = ['starter', 'summoner', 'void-passives'].filter(name => !process.env.REPLAY_CASE || name === process.env.REPLAY_CASE);
if (!cases.length) throw new Error('Unknown REPLAY_CASE');

async function measure(name) {
    const { runtime: r, run } = fixture(17);
    if (name === 'summoner') run(`
        game.selectedClassId='occultist';game.selectedHeroId='hero9';game.level=8;
        game.skills=['기본 공격','서리늑대 소환'];game.gemData={'서리늑대 소환':{level:3,exp:0}};
        game.equippedSummonSkills=['서리늑대 소환'];game.summonSkillCounts={'서리늑대 소환':1};
        game.summonLoadoutInitialized=true;
    `);
    if (name === 'void-passives') run(`
        getVoidPassiveNodeIds().slice(0,8).forEach(id=>{
            game.passives.push(id);
            game.voidPassives[id]={rarity:'magic',stats:[{id:'flatHp',val:12}],transcendent:null};
        });
    `);
    run('lastTime=Date.now();game.playerHp=getPlayerStats().maxHp;');
    const original = JSON.stringify(run('game'));
    let callbacks = 0, maxSliceMs = 0, previous = performance.now();
    let lastReport = previous;
    const start = previous;
    const result = await r.simulateBackgroundCombatChunked({
        snapshot: run('game'), elapsedMs: durationMs,
        onProgress(doneMs) {
            const now = performance.now();
            maxSliceMs = Math.max(maxSliceMs, now - previous);
            previous = now; callbacks++;
            if (now - lastReport > 30000) { console.log(`${name}: ${doneMs}/${durationMs} combat ms`); lastReport = now; }
        }
    });
    const wallMs = performance.now() - start;
    if (original !== JSON.stringify(run('game'))) throw new Error('Replay mutated committed state');
    // spawnStamp is rendering wall time, not a combat deadline or reward.
    const canonical = JSON.stringify(result, (key, value) => key === 'spawnStamp' ? undefined : value);
    if (process.env.REPLAY_SNAPSHOTS) fs.writeFileSync(output + '.' + name + '.json', canonical);
    return { name, requestedMs: durationMs, processedMs: result.processedMs, wallMs,
        maxCallbackGapMs: maxSliceMs, callbacks, kills: result.metrics.kills,
        deaths: result.metrics.deaths, stopReason: result.stopReason,
        digest: crypto.createHash('sha256').update(canonical).digest('hex') };
}

(async () => {
    const results = [];
    for (const name of cases) { const result = await measure(name); results.push(result); console.log(JSON.stringify(result)); }
    fs.writeFileSync(output, JSON.stringify({ node: process.version, results }, null, 2) + '\n');
})().catch(error => { console.error(error); process.exitCode = 1; });
