const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

// Story boss pictures face left. The renderer mirrors them while the hero stands to their right, keeps the last side
// inside a quarter-tile dead zone (hero passing the boss column), and never mirrors the frontal pictures.
const calls = [];
function canvasContext() {
    const state = { globalAlpha: 1, filter: 'none' };
    return new Proxy(state, { get(target, key) {
        if (key in target) return target[key];
        if (key === 'scale') return (...args) => calls.push(['scale', ...args]);
        if (key === 'drawImage') return () => calls.push(['drawImage']);
        return () => {};
    } });
}
const runtime = buildGameRuntime({}, null, { createElement: () => ({ getContext: canvasContext }) });
const run = code => vm.runInContext(code, runtime);
runtime.facingCtx = canvasContext();
run(`battleAssets.ready = true;
    window.bossPicture = { width: 64, height: 64 };
    battleAssets.atlas = { enemies: { image: bossPicture, frames: { boss: { x: 0, y: 0, width: 64, height: 64 } },
        bossImages: { bossAct1: bossPicture, bossAct9: bossPicture } } };
    window.facingState = (playerX, playerY) => ({ now: 1000, gridProj: { tileW: 48 }, enemyHitFlashes: new Map(),
        enemyHitRecoil: {}, enemyAttackMotions: {}, playerPos: { x: playerX, y: playerY } });
    window.drawBossAt = (enemy, playerX, playerY) => drawEnemyActorSprite(facingCtx, { enemy, x: 200, y: 300 },
        facingState(playerX, playerY), { y: 300, scale: 3.65 });`);

function mirrored(code) {
    calls.length = 0;
    run(code);
    assert.ok(calls.some(call => call[0] === 'drawImage'), 'the boss picture is drawn');
    return calls.some(call => call[0] === 'scale' && call[1] === -1 && call[2] === 1);
}

run(`window.leftBoss = { id: 1, isBoss: true, bossAssetKey: 'bossAct1' };
    window.frontBoss = { id: 2, isBoss: true, bossAssetKey: 'bossAct9' };
    window.oldBoss = { id: 3, isBoss: true };`);
assert.equal(mirrored('drawBossAt(leftBoss, 100, 300)'), false, 'a left-facing boss keeps its picture while the hero is on the left');
assert.equal(mirrored('drawBossAt(leftBoss, 300, 300)'), true, 'a left-facing boss turns around when the hero is on the right');
assert.equal(mirrored('drawBossAt(leftBoss, 290, 420)'), true, 'down and to the right still counts as the right side');
assert.equal(mirrored('drawBossAt(leftBoss, 205, 180)'), true, 'straight above (inside the dead zone) keeps the last side');
assert.equal(mirrored('drawEnemySprite(facingCtx, leftBoss, 200, 300, 3.65, 0, 1000)'), true,
    'the death dissolve and afterimages reuse the last side');
// The ghosts draw a copy of the enemy (battleVisualState.enemyGhostPos): the copy keeps the side too (2026-10-07 review: a boss
// slain from its right fell with its back turned).
assert.equal(mirrored('drawEnemySprite(facingCtx, copyEnemySpriteSide(leftBoss, { ...leftBoss }), 200, 300, 3.65, 0, 1000)'), true,
    'the dying copy keeps the side');
assert.match(require('node:fs').readFileSync('js/canvas-battlefield.js', 'utf8'), /enemy: copyEnemySpriteSide\(entry\.enemy, \{ \.\.\.entry\.enemy \}\)/,
    'the ghost snapshot carries the side');
assert.equal(mirrored('drawBossAt(leftBoss, 150, 300)'), false, 'the hero walking back to the left turns the boss back');
assert.equal(mirrored('drawBossAt(frontBoss, 300, 300)'), false, 'a frontal boss picture is never mirrored');
assert.equal(mirrored('drawBossAt(oldBoss, 300, 300)'), false, 'the frontal legacy demon frame is never mirrored');
assert.deepEqual(JSON.parse(run('JSON.stringify(BOSS_ASSET_FRONT_FACING.filter(key => !BOSS_ASSET_MANIFEST[key]))')), [],
    'every frontal key names a real boss picture');
run(`game.skills = [...(game.skills || []), '암살']; game.mobilitySkill = '암살';`);
assert.equal(run('mobilitySkill.equipped()'), '암살', 'the assassin mobility gem is worn for the next check');
assert.equal(run(`resolveEnemyFacingDirection(null, { x: 0, y: 0 })`), 'south', 'a missing position does not throw with the assassin gem');
console.log('Boss facing: left-facing pictures turn toward the hero, dead zone keeps the side, frontal pictures stay OK');
