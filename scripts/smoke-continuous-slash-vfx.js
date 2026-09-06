const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const read = source => vm.runInContext(source, runtime);
const list = read('battleVisualState.skillEffects');
const player = Object.freeze({ x: 100, y: 200 });
const target = Object.freeze({ x: 160, y: 200 });
const hit = Object.freeze({ id: 1, skillName: '연속 베기', stageIndex: 0,
    stageKind: 'primary', repeatIndex: 0, damageTextGroupId: 'attack:0', element: 'phys' });
const before = read('JSON.stringify(game)');
const queue = (fx, position = target, at = 1000, scale = 1) =>
    runtime.queueSkillGemVfx(fx, position, player, {}, at, scale);

queue({ ...hit, dot: true });
queue({ ...hit, skillName: 'missing' });
assert.strictEqual(list.length, 0, 'DOT and unknown skills must not produce melee arcs');
queue(hit);
queue({ ...hit, id: 2 }, { x: 160, y: 230 });
assert.strictEqual(list.length, 1, 'one actual cleave stage must draw one arc across multiple victims');
queue({ ...hit, id: 3, repeatIndex: 1 });
assert.strictEqual(list.length, 2, 'the real second stage must retain its own arc');
const [first, second] = list;
assert.strictEqual(first.sweep, -second.sweep, 'the follow-up must sweep in the opposite direction');
assert.strictEqual(second.startAt, 1065, 'confirmed second hit gets only a 65ms presentation delay');
assert.strictEqual(first.x, target.x - 10, 'the cutting edge must meet the near surface of the victim');
assert(first.y < target.y, 'contact must be lifted from the ground to the victim body');
assert(first.size >= 156, 'the visible crescent must open wider than the small legacy body halo');

const calls = [];
const ctx = new Proxy({}, { get: (object, key) => object[key] ||
    ((...args) => calls.push({ key, args, alpha: object.globalAlpha })),
set: (object, key, value) => { object[key] = value; return true; } });
read('battleAssets.images.skillFxDoubleSlash = { complete: true, naturalWidth: 1280, naturalHeight: 1280 }');
runtime.drawSkillGemVfxLayer(ctx, 999);
assert.strictEqual(calls.length, 0, 'no image may appear before the impact');
runtime.drawSkillGemVfxLayer(ctx, 1040);
assert.strictEqual(calls.filter(call => call.key === 'drawImage').length, 1,
    'the first stage must render exactly one image before the second hit');
assert(calls.some(call => call.key === 'drawImage' && call.alpha > 0.7), 'impact must be immediately legible');
assert.deepStrictEqual(calls.find(call => call.key === 'drawImage').args.slice(1, 5), [640, 0, 640, 640],
    'the peak must sample just the second cell, never shrink the entire atlas into one effect');
for (const [at, crop] of [[1010, [0, 0]], [1100, [0, 640]], [1150, [640, 640]]]) {
    calls.length = 0;
    runtime.drawSwordSlashVfx(ctx, first, read('battleAssets.images.skillFxDoubleSlash'), (at - 1000) / first.duration);
    assert.deepStrictEqual(calls.find(call => call.key === 'drawImage').args.slice(1, 3), crop,
        'onset, trailing and dissipating art must advance in order');
    assert.strictEqual(calls.filter(call => call.key === 'drawImage').length, 1, 'one image draw per sweep');
}
calls.length = 0;
read('delete battleAssets.images.skillFxDoubleSlash');
runtime.drawSkillGemVfxLayer(ctx, 1040);
assert(calls.some(call => call.key === 'stroke'), 'an unavailable image must retain a visible arc fallback');
assert(!calls.some(call => call.key === 'drawImage'), 'a failed image must never be passed to drawImage');
calls.length = 0;
runtime.drawSkillGemVfxLayer(ctx, 2000);
assert.strictEqual(calls.length, 0, 'expired arcs must stop drawing');

list.length = 0;
queue({ ...hit, id: 4, damageTextGroupId: 'left:0' }, { x: 58, y: 200 }, 2000, 0.7);
assert(Math.abs(Math.abs(list[0].rotation) - Math.PI) < 0.001, 'left-side targets must receive a left-facing arc');
assert(list[0].size < first.size, 'mobile viewport scaling must reduce arc size');
list.length = 0;
queue({ ...hit, id: 5, damageTextGroupId: undefined });
queue({ ...hit, id: 6, damageTextGroupId: undefined });
assert.strictEqual(list.length, 2, 'ungrouped legacy hits must not collapse unrelated attacks');
for (let id = 10; id < 100; id++) queue({ ...hit, id, damageTextGroupId: `fast:${id}` });
assert(list.length <= 4, 'rapid attacks must retain at most four readable arcs');
assert.strictEqual(read('JSON.stringify(game)'), before, 'rendering must not change combat, rewards or progression');
runtime.cleanupBattleVisualState(3000);
assert.strictEqual(read('battleVisualState.skillEffects.length'), 0, 'normal cleanup must remove slash effects');

read('battleAssets.images.skillFxBasicSlash = { complete: true, naturalWidth: 1280, naturalHeight: 1280 }');
queue({ ...hit, skillName: '기본 공격', damageTextGroupId: 'basic:0' });
calls.length = 0;
runtime.drawSkillGemVfxLayer(ctx, 1060);
assert(calls.some(call => call.key === 'drawImage' && call.args[0] === read('battleAssets.images.skillFxBasicSlash')
    && call.args.length === 9 && call.args[3] === 640), 'basic attack must use its own animated atlas');
assert.strictEqual(read('JSON.stringify(game)'), before, 'new basic art cannot change game state');

// Real damage resolution must retain repeat identity even when the field is crowded.
const { runtime: combat, run } = require('./lib/replay-fixture')(7);
combat.Math.random = () => 0.5;
run(`game.selectedHeroId = 'hero2'; game.selectedClassId = 'warrior';
    grantLoopStarterGemOnFirstKill(); game.activeSkill = '연속 베기';
    game.enemies = Array.from({length: 5}, (_, i) => createEnemy(getZone(1), {at: 20, count: 5}, i));
    game.enemies.forEach(enemy => { enemy.hp = 1000; enemy.maxHp = 1000; });
    battleFx = [];`);
const stats = combat.getPlayerStats();
const victim = run('game.enemies[0]');
const attack = { stageReplay: true, skillName: '연속 베기', forcedCrit: false, forcedElement: 'phys',
    targetEntries: [{ enemyId: victim.id, mult: 1 }], damageTextGroupId: 'real:0' };
combat.performPlayerAttack(stats, attack);
const actualHits = run('battleFx.filter(fx => fx.type === "hit")');
assert.deepStrictEqual(Array.from(actualHits, fx => fx.repeatIndex), [0, 1], 'crowd merging must preserve both real hit identities');
assert.strictEqual(actualHits.reduce((sum, fx) => sum + fx.damage, 0), 1000 - victim.hp);
assert(run('game.enemies.slice(1).every(enemy => enemy.hp === 1000)'), 'unselected victims must retain their health');
const actualList = run('battleVisualState.skillEffects');
actualHits.forEach(fx => combat.queueSkillGemVfx(fx, target, player, {}, 1000, 1));
assert.strictEqual(actualList.length, 2, 'real crowded combat must reach both image sweeps');
run('battleFx = []; battleVisualState.skillEffects = []; game.enemies[0].hp = 1;');
combat.performPlayerAttack(stats, { ...attack, damageTextGroupId: 'lethal:0' });
const lethalHits = run('battleFx.filter(fx => fx.type === "hit")');
assert.strictEqual(lethalHits.length, 1, 'a first-hit kill must not invent a second successful hit');
lethalHits.forEach(fx => combat.queueSkillGemVfx(fx, target, player, {}, 2000, 1));
assert.strictEqual(run('battleVisualState.skillEffects.length'), 1, 'a first-hit kill must show only its confirmed sweep');
console.log('smoke-continuous-slash-vfx passed');
