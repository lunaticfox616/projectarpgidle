const assert = require('node:assert/strict');
const { run } = require('./lib/replay-fixture')(43);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));

run(`game = mergeDefaults({level: 30, currencies: {formlessDew: 17}});
    game.inventory.push(normalizeItem(generateUniqueItem(16, '방패', '마지막 기도의 문')));
    game = mergeDefaults(JSON.parse(serializeSaveState(game)));
    window.cleanSave = JSON.parse(serializeSaveState(game));`);
const possessions = copy('({inventory:game.inventory,currencies:game.currencies,level:game.level})');
const damage = run('getPlayerStats(false).damageIncreasePct');
assert.ok(Number.isFinite(damage), 'damage comparison uses the live damage increase stat');
for (const legacy of [
    { shrineState: { activeId: 'power', spawnCell: { gx: 1, gy: 2 }, pity: 19, spawned: 4, claimed: 3 },
        shrineBuff: { name: '힘의 성소', stat: 'pctDmg', value: 16, expiresAt: Number.MAX_SAFE_INTEGER } },
    { shrineState: { active: { name: '수호의 성소', expiresAt: Number.MAX_SAFE_INTEGER } }, shrineBuff: null },
    { shrineState: 'corrupt', shrineBuff: { stat: 'pctDmg', value: 999999 } },
    {}
]) {
    run(`game = mergeDefaults({...cleanSave,...${JSON.stringify(legacy)}})`);
    assert.equal(run("'shrineState' in game || 'shrineBuff' in game"), false,
        'old pending shrines and active blessings are removed on load');
    assert.equal(run('getPlayerStats(false).damageIncreasePct'), damage, 'retired blessings cannot affect damage');
    assert.deepEqual(copy('({inventory:game.inventory,currencies:game.currencies,level:game.level})'), possessions,
        'migration preserves equipment, currency and level');
    run('game = mergeDefaults(JSON.parse(serializeSaveState(game)))');
    assert.equal(run("'shrineState' in game || 'shrineBuff' in game"), false);
    assert.deepEqual(copy('({inventory:game.inventory,currencies:game.currencies,level:game.level})'), possessions,
        'reloading does not duplicate or remove possessions');
}

run(`game.settings.mapCompleteAction = 'repeatZone';
    for (let i = 0; i < 25; i++) {
        startEncounterRun(true);
        game.actExploration.status = 'cleared';
        finishEncounterRun();
    }`);
assert.equal(run("'shrineState' in game || 'shrineBuff' in game"), false,
    'repeated encounter completion never recreates shrines or blessings');
assert.equal(run('game.actExploration.completionApplied'), true, 'ordinary encounter completion still succeeds');
console.log('Shrine removal preserves legacy saves, possessions, stats and encounter completion: OK');
