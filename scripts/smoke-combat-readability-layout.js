const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
// Canvas is the external boundary; run the actual figure, health bar and damage text renderers.
let canvasCount = 0;
const painted = [], composites = [];
function context() {
    const stack = [], state = { globalAlpha: 1, globalCompositeOperation: 'source-over' };
    return new Proxy(state, { get(target, key) {
        if (key in target) return target[key];
        if (key === 'save') return () => stack.push({ ...state });
        if (key === 'restore') return () => Object.assign(state, stack.pop());
        if (key === 'measureText') return value => ({ width: String(value).length * 8 });
        if (key.startsWith('create')) return () => ({ addColorStop() {} });
        return (...args) => {
            painted.push({ type: key, args, color: state.fillStyle, owner: state });
            composites.push(state.globalCompositeOperation);
        };
    } });
}
const runtime = buildGameRuntime({}, null, { createElement(tag) {
    assert.equal(tag, 'canvas'); canvasCount++;
    const ctx = context(); return { width: 0, height: 0, getContext: () => ctx };
} });
runtime.readCtx = context();
runtime.readCtx.isForeground = true;
const run = code => vm.runInContext(code, runtime);
run(`game.settings.heroSpriteSet = 'legacy'; battleFx.length = 0;
    window.readState = {now:1000,gridProj:{tileW:48,tileH:48},gridUnitScale:1,playerPos:{x:300,y:300},
        motionState:{advanceBlend:0,facingDirection:'east'},enemyPosMap:{},swingPower:0,currentSkillVisual:{pose:'sword',effect:'slash'}};
    window.readEnemy = {id:71,hp:5,maxHp:10};`);
const before = run('JSON.stringify(game)');
run('drawBattlePlayerFigure.readability.begin(readState, [{x:300,y:250,enemy:readEnemy}]); drawBattlePlayerFigure.readability.draw(readCtx);');
assert.equal(canvasCount, 0, 'a monster behind the player needs no extra rendering');
run('drawBattlePlayerFigure.readability.begin(readState,[{x:300,y:310,enemy:readEnemy}]); drawBattlePlayerFigure.readability.draw(readCtx);');
assert.equal(canvasCount, 2, 'only two small surfaces are allocated for an occluded hero');
assert.ok(composites.includes('source-in') && composites.includes('destination-out'), 'outline is alpha-masked and hollow');
assert.ok(painted.some(p => p.type === 'drawImage' && p.owner.isForeground), 'outline reaches the foreground');
for (let i = 0; i < 20; i++) run('drawBattlePlayerFigure.readability.begin(readState,[{x:300,y:310,enemy:readEnemy}]);');
assert.equal(canvasCount, 2, 'crowded frames reuse the two masks');
painted.length = 0;
run('drawBattlePlayerFigure.readability.begin({...readState,returnWarp:{}},[{x:300,y:310,enemy:readEnemy}]); drawBattlePlayerFigure.readability.draw(readCtx);');
assert.equal(painted.length, 0, 'return transitions do not leave a phantom silhouette');
run(`drawBattlePlayerFigure.readability.begin(readState,[]);
    drawBattlefieldEnemyHealthBars(readCtx,[{x:300,y:310,enemy:readEnemy},{x:300,y:310,enemy:{...readEnemy,id:72}}],[],48);`);
const bars = painted.filter(p => p.type === 'fillRect' && p.color === '#e94f64').map(p => p.args);
assert.equal(bars.length, 2);
assert.ok(Math.abs(bars[0][1] - bars[1][1]) >= 10, 'overlapping enemy bars occupy separate rows');
painted.length = 0;
run(`battleVisualState.damageTexts=[]; spawnDamageText({value:500,x:300,y:270,start:1000});
    spawnDamageText({value:400,x:300,y:270,start:1000}); drawDamageTexts(readCtx,1100);`);
const numbers = painted.filter(p => p.type === 'fillText').map(p => p.args);
assert.equal(numbers.length, 2);
// 2026-10-05 user request: numbers stay on the body they hit; only the stack of hits arriving together spreads them.
assert.ok(numbers.every(([,x]) => x === 300), 'damage text stays centred on the body it hit');
assert.ok(Math.abs(numbers[0][2] - numbers[1][2]) >= 20, 'simultaneous damage texts avoid one another');
assert.equal(run('JSON.stringify(game)'), before, 'readability never changes combat or saved data');
console.log('Combat readability: foreground hollow outline, bounded surface reuse, transition guard, separated bars and numbers OK');
