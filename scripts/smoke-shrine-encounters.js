const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = { console };
context.window = context;
context.safeExposeData = map => Object.assign(context, map);
context.safeExposeGlobals = map => Object.assign(context, map);
vm.createContext(context);
vm.runInContext(fs.readFileSync('data/shrines.js', 'utf8'), context, { filename: 'data/shrines.js' });
vm.runInContext(fs.readFileSync('js/shrines.js', 'utf8'), context, { filename: 'js/shrines.js' });

const legacyGame = {
    shrineState: { active: { name: '수호의 성소', expiresAt: Date.now() + 60000 }, nextRollAt: 999 },
    unrelated: { kept: true }
};
let legacyState = context.shrineRuntime.ensureState(legacyGame);
assert.strictEqual(legacyState.activeId, 'guard', 'legacy pending shrine should migrate without being lost');
assert.ok(context.SHRINE_SPAWN_CELLS.some(cell => cell.gx === legacyState.spawnCell.gx && cell.gy === legacyState.spawnCell.gy),
    'legacy pending shrine should receive a valid battlefield cell');
assert.strictEqual(Object.hasOwn(legacyState, 'active'), false, 'legacy wall-clock state should be removed');
assert.strictEqual(legacyGame.unrelated.kept, true, 'normalization must preserve unrelated game state');

const expiredLegacyGame = { shrineState: { active: { name: '힘의 성소', expiresAt: 1 } } };
assert.strictEqual(context.shrineRuntime.ensureState(expiredLegacyGame).activeId, null,
    'an already expired legacy shrine should not be resurrected during migration');

const game = { shrineState: null, shrineBuff: null };
context.game = game;
context.shrineRuntime.ensureState();
let result = context.shrineRuntime.advanceAfterEncounter({ type: 'trial' });
assert.strictEqual(result.reason, 'ineligible', 'special encounters should not charge shrine pity');
assert.strictEqual(game.shrineState.pity, 0);

vm.runInContext('Math.random = function () { return 0.999; };', context);
for (let clear = 1; clear <= 19; clear++) {
    result = context.shrineRuntime.advanceAfterEncounter({ type: 'act' });
    assert.strictEqual(result.spawned, false, `clear ${clear} should remain a miss before the guarantee`);
    assert.strictEqual(game.shrineState.pity, clear);
}
result = context.shrineRuntime.advanceAfterEncounter({ type: 'act' });
assert.strictEqual(result.spawned, true, 'the twentieth eligible clear should guarantee a shrine');
assert.strictEqual(game.shrineState.pity, 0, 'a successful spawn should reset pity');
assert.strictEqual(game.shrineState.spawned, 1);
assert.ok(context.SHRINE_BLESSING_DB[game.shrineState.activeId], 'spawn must select a real blessing');
assert.ok(context.SHRINE_SPAWN_CELLS.some(cell => cell.gx === game.shrineState.spawnCell.gx && cell.gy === game.shrineState.spawnCell.gy),
    'spawned shrine must occupy one of the safe battlefield cells');
const activeEncounter = context.shrineRuntime.getActiveEncounter(game);
assert.strictEqual(activeEncounter.blessing.id, game.shrineState.activeId);
assert.deepStrictEqual(JSON.parse(JSON.stringify(activeEncounter.cell)), JSON.parse(JSON.stringify(game.shrineState.spawnCell)));

result = context.shrineRuntime.advanceAfterEncounter({ type: 'act' });
assert.strictEqual(result.reason, 'pending', 'a pending shrine must not be replaced or stack pity');
assert.strictEqual(game.shrineState.spawned, 1);

const selectedId = game.shrineState.activeId;
result = context.shrineRuntime.claimActive(game, 1000);
assert.strictEqual(result.claimed, true);
assert.strictEqual(game.shrineState.activeId, null);
assert.strictEqual(game.shrineState.spawnCell, null);
assert.strictEqual(game.shrineState.claimed, 1);
assert.strictEqual(game.shrineBuff.id, selectedId);
assert.strictEqual(game.shrineBuff.expiresAt, 1000 + context.SHRINE_ENCOUNTER_CONFIG.buffDurationMs);

const existingBuff = game.shrineBuff;
result = context.shrineRuntime.claimActive(game, 2000);
assert.strictEqual(result.reason, 'missing', 'claiming twice should be a no-op');
assert.strictEqual(game.shrineBuff, existingBuff, 'a failed claim must not mutate the active buff');

console.log('smoke-shrine-encounters passed');
