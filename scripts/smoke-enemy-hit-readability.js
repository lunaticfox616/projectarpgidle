const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

// Canvas and decoded images are the external boundary; use the real sheet, atlas and feedback renderers.
const draws = [], surfaces = [];
function canvasContext() {
    const stack = [], state = { globalAlpha: 1, filter: 'none', globalCompositeOperation: 'source-over' };
    return new Proxy(state, { get(target, key) {
        if (key in target) return target[key];
        if (key === 'save') return () => stack.push({ ...state });
        if (key === 'restore') return () => Object.assign(state, stack.pop());
        if (key === 'drawImage') return (...args) => draws.push({ args, owner: state, alpha: state.globalAlpha, filter: state.filter });
        if (key === 'fillRect') return (...args) => surfaces.push({ args, color: state.fillStyle, composite: state.globalCompositeOperation });
        return () => {};
    } });
}
const runtime = buildGameRuntime({}, null, { createElement: () => ({ getContext: canvasContext }) });
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
runtime.hitCtx = canvasContext();
runtime.Image = class { constructor() { this.complete = true; this.naturalWidth = 512; this.naturalHeight = 512; } };
run(`game.enemies = []; battleFx.length = 0;
    window.hitEnemy = { id: 7, hp: 80, maxHp: 100, spriteVariantId: 'act1-ant', attackTimer: 0 };
    window.hitPose = { x: 100, y: 150, tile: 48, now: 1030, facing: 'south', flash: 0.92 };
    window.hitFx = { type: 'hit', enemyId: 7, start: 1000, duration: 2000, damage: 20 };
    window.hitState = { now: 1034, gridProj: { tileW: 48 }, playerPos: { x: 0, y: 150 },
        enemyPosMap: { 7: { x: 100, y: 150, enemy: hitEnemy } } };`);
const before = run('JSON.stringify(hitEnemy)');
assert.equal(run('getEnemyHitFlash(hitFx,999)'), 0, 'no flash before a delayed impact');
assert.ok(run('getEnemyHitFlash(hitFx,1033)') > 0.9, 'a hit stays readable for at least one 30 fps frame');
assert.ok(run('getEnemyHitFlash(hitFx,1080)') < run('getEnemyHitFlash(hitFx,1033)'), 'flash fades back to original art');
assert.equal(run('getEnemyHitFlash(hitFx,1110)'), 0, 'long skill effects do not extend the body flash');
assert.ok(run('getEnemyHitFlash({...hitFx,crit:true},1110)') > 0, 'critical hits hold slightly longer');
for (const extra of ['dot:true', 'damage:0', 'type:"enemyAttack"']) {
    assert.equal(run(`getEnemyHitFlash({...hitFx,${extra}},1033)`), 0, 'DoT, zero damage and enemy attacks do not light a hit body');
}
const recoil = run('getEnemyHitRecoil(hitFx,hitState,48).x');
assert.ok(recoil >= 4 && recoil < 5, 'normal hits visibly flinch a 48 px tile monster');
assert.ok(run('getEnemyHitRecoil({...hitFx,crit:true},hitState,48).x') > recoil);
assert.equal(run('getEnemyHitRecoil({...hitFx,damage:0},hitState,48)'), null);
assert.equal(run('getEnemyHitRecoil({...hitFx,dot:true},hitState,48)'), null);
assert.equal(run('getEnemyHitRecoil(hitFx,{...hitState,now:1170},48)'), null, 'recoil always returns home');
run('hitEnemy.isBoss=true;');
assert.equal(run('getEnemyHitRecoil(hitFx,hitState,48).x'), recoil / 2, 'bosses retain weight');
run('delete hitEnemy.isBoss;');

function checkOverlay(code, label) {
    draws.length = 0;
    run(code);
    const overlay = draws.at(-1), body = draws.filter(d => d.owner === overlay.owner).at(-2);
    assert.ok(overlay && body, label + ': draws a body and its hit silhouette');
    assert.equal(overlay.args.length, 5, label + ': cached silhouette uses one small image draw');
    assert.deepEqual(overlay.args.slice(1), body.args.slice(-4), label + ': overlay matches the drawn body exactly');
    assert.ok(overlay.alpha > 0.8 && overlay.alpha <= 1, label + ': clearly visible flash');
    assert.equal(overlay.filter, 'none', label + ': no full-canvas flash filter');
    assert.equal(runtime.hitCtx.globalAlpha, 1, 'restores opacity for other enemies');
}
checkOverlay('monsterActors.draw(hitCtx,hitEnemy,hitPose)', '16 px monster');
const cached = run('outlinedSpriteCache.size');
for (let i = 0; i < 40; i++) run('monsterActors.draw(hitCtx,hitEnemy,hitPose)');
assert.equal(run('outlinedSpriteCache.size'), cached, 'repeated hits reuse the same masked frame');
checkOverlay('wispActors.draw(hitCtx,{...hitEnemy,monsterArchetype:"wisp",ele:"cold"},hitPose)', 'wisp');
run(`battleAssets.ready = true;
    battleAssets.atlas = { enemies: { image: new Image(), frames: { bandit: {x:0,y:0,width:32,height:48} } } };`);
checkOverlay('drawEnemySprite(hitCtx,{id:9,isBoss:true},100,150,2.55,0.92,1030,false,null,"south")', 'atlas boss');
assert.ok(surfaces.some(s => s.composite === 'source-in' && s.color === '#fff4df'), 'hit tint is masked by source alpha, never a white rectangle');
draws.length = 0;
run('monsterActors.draw(hitCtx,hitEnemy,{...hitPose,flash:0})');
assert.equal(draws.at(-1).args.length, 9, 'normal body returns after the flash');
assert.equal(run('JSON.stringify(hitEnemy)'), before, 'visual feedback does not change health, attacks or position');
assert.equal(run('getBattleFeedbackProfile(hitFx).hitStopMs'), 0, 'ordinary hits keep combat moving');
console.log('Enemy hit readability: timed flash, bounded recoil, monster/wisp/boss body masks and cache reuse OK');
run('battleVisualState.enemyHitPulses.clear(); game.settings.hitEmphasis="normal";');
assert.ok(run('buildEnemyHitFlashMap([hitFx],1030).get(7)') > 0.9);
assert.equal(run('buildEnemyHitFlashMap([hitFx,{...hitFx,start:1080}],1120).get(7)'), 0,
    'a second rapid hit leaves a dark interval after the first pulse');
assert.ok(run('buildEnemyHitFlashMap([{...hitFx,start:1240}],1270).get(7)') > 0.9, 'later hit can flash again');
run('game.settings.hitEmphasis="mild";');
assert.ok(run('buildEnemyHitFlashMap([{...hitFx,start:1240}],1270).get(7)') < 0.5, 'mild changes flash strength only');
run('clearBattleVisualBacklog();');
assert.equal(run('battleVisualState.enemyHitPulses.size'), 0, 'scene resets release pulse history');
run('resetBattleRuntimeVisuals(); buildEnemyHitFlashMap([hitFx],1030); clearBattleVisualBacklog();');
assert.equal(run('battleVisualState.enemyHitPulses.size'), 0, 'map/realm resets initialize flash history too');
assert.equal(run('mergeDefaults({settings:{hitEmphasis:"broken"}}).settings.hitEmphasis'), 'normal');
assert.equal(run('mergeDefaults({settings:{hitEmphasis:"mild"}}).settings.hitEmphasis'), 'mild');
