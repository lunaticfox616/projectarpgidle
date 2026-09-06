const assert = require('assert');
const { runtime, run } = require('./lib/replay-fixture')();
const enabled = { enemyPower: true, fragileArmor: true, shortHunt: true, greedPact: true, enabled: true };
for (const legacy of [enabled, null, 'damaged']) {
    const saved = { heroSelectionInitialized: true, selectedHeroId: 'hero1', selectedClassId: 'warrior',
        challengeContract: legacy, activeChallengeContract: legacy, currencies: { magicBud: 37 } };
    runtime.legacySave = saved;
    const merged = run('mergeDefaults(legacySave)');
    assert(!Object.hasOwn(merged, 'challengeContract'));
    assert(!Object.hasOwn(merged, 'activeChallengeContract'));
    assert.strictEqual(merged.currencies.magicBud, 37, 'removing contracts must preserve rewards already earned');
    runtime.legacySave = merged;
    const repeated = run('mergeDefaults(legacySave)');
    assert(!Object.hasOwn(repeated, 'activeChallengeContract'), 'reloading cannot restore a removed contract');
    assert.strictEqual(repeated.currencies.magicBud, 37);
}
const baseline = run('getEnemyLootDropMultiplier(getZone(0), {isBoss:true, dropMul:1})');
run('game.challengeContract = game.activeChallengeContract = '+JSON.stringify(enabled));
assert.strictEqual(run('getEnemyLootDropMultiplier(getZone(0), {isBoss:true, dropMul:1})'), baseline,
    'stale runtime fields cannot modify rewards');
console.log('smoke-challenge-contracts passed (legacy removal)');
