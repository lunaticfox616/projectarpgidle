// 보스 공격 연출(2026-10-06 사용자 요청: "보스 몬스터들의 공격 및 패턴이 너무 허접하고 이펙트도 안보여서"): js/canvas-boss-attacks.js.
// 전투 쪽은 놓는 순간(bossRelease)과 땅에 닿는 순간(bossAreaImpact, 원소 · 길이)을 알리고, 그림 쪽은 경고가 진해지고, 인물 위에는
// 선만 더하고, 몸이 젖혔다가 뛰어올라 착지와 함께 내리찍고, 타격 때 파편 · 소리 · 갈라짐 · 흔들림이 한 번씩 난다.
// 판정 칸과 피해는 바꾸지 않는다(smoke-boss-pattern-areas · smoke-boss-pattern-visuals가 지킨다).
const assert = require('node:assert/strict');
const { runtime: r, enemy, state, run } = require('./audit-combat-20260905').prepare();
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const stats = r.getPlayerStats();

// ── 전투: 놓는 순간과 땅에 닿는 순간 ─────────────────────────────────────────────
Object.assign(enemy, { isBoss: true, attackKind: 'ranged', attackRange: 99, patternMode: 'intro', patternAttackCount: 2, attackTimer: 0.6, gx: 6, gy: 4 });
run('battleFx.length = 0; pendingEnemyCombatAttacks.length = 0;');
r.refreshBossPatternPreview(enemy);
r.updateBossPatternTelegraph(enemy, r.getCombatTime(), state.gridPlayer);
assert.ok(enemy.patternArea, 'the intro slam warns first');
enemy.patternTelegraphStartedAt -= 1500;
enemy.attackTimer = 1;
r.performMonsterAttacks(stats);
const release = json('battleFx.filter(fx => fx.type === "bossRelease").map(fx => ({ enemyId: fx.enemyId, slam: fx.slam, duration: fx.duration }))');
assert.deepEqual(release, [{ enemyId: 100, slam: true, duration: 560 }], 'letting an area special go is announced at release, as a slam');
assert.equal(run('pendingEnemyCombatAttacks.filter(attack => attack.delivery === "patternArea").length'), 1);
run('pendingEnemyCombatAttacks.forEach(attack => { attack.at = getCombatTime(); });');
r.performMonsterAttacks(stats);
const impact = json('battleFx.filter(fx => fx.type === "bossAreaImpact").map(fx => ({ element: fx.element, duration: fx.duration, cells: fx.footprint.cells.length }))');
assert.deepEqual(impact, [{ element: enemy.ele || 'phys', duration: 560, cells: 1 }], 'the impact carries the boss element and lasts for the shockwave');
run('battleFx.length = 0;');
enemy.attackTimer = 1;
r.performMonsterAttacks(stats);
assert.deepEqual(json('battleFx.filter(fx => fx.type === "bossRelease").map(fx => fx.slam)'), [false], 'an ordinary shot is a thrust, not a slam');
assert.equal(run('battleFx.filter(fx => fx.type === "combatTravel" && fx.sourceId === 100).length'), 1, 'and still flies as a shot');

// ── 바닥 경고: 예고가 흐를수록 진해지고 끝 무렵에만 깜빡인다 ─────────────────────────────
const warn = { isBoss: true, hp: 1, patternTelegraphKey: 'k', patternArea: { cells: [{ gx: 1, gy: 1 }], kind: 'blast', center: { gx: 1, gy: 1 } } };
const alphaAt = ms => { warn.patternTelegraphStartedAt = r.getCombatTime() - ms; return r.bossAttackView.groundAlpha(warn); };
assert.equal(alphaAt(0), 3, 'a fresh warning starts as before');
assert.ok(Math.abs(alphaAt(750) - 5) < 1e-9, 'half way it is stronger');
assert.ok(alphaAt(1500) >= 7 * 0.62 && alphaAt(1500) <= 7, 'at release it is strongest, blinking');
assert.equal(r.bossAttackView.groundAlpha({ isBoss: true }), 3, 'a boss with no warning keeps the old strength');

// ── 몸: 예고 동안 젖히고, 범위기는 뛰어올라 착지와 함께 내리찍고, 사격은 앞으로 내지른다 ─────────────────
const now = r.performance.now();
const entry = { enemy: { id: 7, isBoss: true, hp: 1, ...warn }, x: 200, y: 200 };
const hero = { x: 100, y: 200 };
const motionOf = () => r.bossAttackView.addMotions({}, [entry], hero, now, 48)[7];
entry.enemy.patternTelegraphStartedAt = r.getCombatTime() - 1500;
const lean = motionOf();
assert.ok(lean.x > 5 && lean.lift > 0, 'the full warning leans away from the hero (to the right) and rears up');
entry.enemy.patternTelegraphKey = null;
run('battleFx.length = 0;');
const releaseAt = (ago, slam) => run(`battleFx.length = 0; battleFx.push({ id: 900, type: 'bossRelease', enemyId: 7, slam: ${slam}, start: ${now - ago}, duration: 560 });`);
releaseAt(270, true);
assert.ok(motionOf().lift > 0.4 * 48, 'half way through the release the boss is high in the air');
releaseAt(515, true);
assert.equal(motionOf().lift, 0, 'and it is back on the ground when the area lands (0.5 s after release)');
releaseAt(190, false);
assert.ok(motionOf().x < -10 && !motionOf().lift, 'a shot thrusts towards the hero without leaving the ground');
run(`battleFx.length = 0; battleFx.push({ id: 901, type: 'enemyAttack', enemyId: 7, start: ${now - 100}, duration: 220 });`);
const lunges = r.bossAttackView.addMotions({ 7: { progress: 0.5, x: -10, y: 0 } }, [entry], hero, now, 48);
assert.equal(lunges[7], undefined, 'the late hit lunge is gone for bosses (the release already moved them)');
assert.equal(r.bossAttackView.spriteOffsetY({ lift: 20 }, { offsetY: 3 }), -17, 'a lift moves only the picture');
assert.equal(r.bossAttackView.spriteOffsetY({ lift: 0 }, { offsetY: 3 }), undefined, 'no lift keeps the frame offset');

// ── 타격: 파편 · 소리 · 갈라짐은 한 번씩, 투명도는 1을 넘기지 않는다, 화면이 흔들린다 ─────────────────────
const calls = [];
const ctx = new Proxy({}, {
    get(target, key) { return key in target ? target[key] : (...args) => calls.push([key, ...args]); },
    set(target, key, value) { if (key === 'globalAlpha') calls.push(['alpha', value]); target[key] = value; return true; }
});
const counts = { spawn: 0, sound: [] };
r.attackFxSpawn = () => { counts.spawn++; };
r.playUiFeedbackSound = kind => counts.sound.push(kind);
const projection = { tileW: 40, tileH: 40, cellToScreen: (gx, gy) => ({ x: gx * 40, y: gy * 40 }) };
const slamFx = { id: 77, type: 'bossAreaImpact', element: 'fire', duration: 560,
    footprint: { cells: [{ gx: 2, gy: 2 }, { gx: 3, gy: 2 }, { gx: 2, gy: 3 }], kind: 'blast', radius: 1, center: { gx: 2, gy: 2 } } };
r.bossAttackView.drawImpact(ctx, slamFx, 0.1, projection);
r.bossAttackView.drawImpact(ctx, slamFx, 0.5, projection);
assert.deepEqual([counts.spawn, counts.sound], [1, ['hitSlam']], 'debris and the slam sound happen once per impact');
assert.ok(calls.some(call => call[0] === 'ellipse'), 'shockwave rings are drawn');
assert.ok(calls.filter(call => call[0] === 'alpha').every(call => call[1] <= 1), 'no globalAlpha above 1 (canvas would ignore it)');
run("battleAssets.images.skillFxEarthCrack = { complete: true, naturalWidth: 32 };");
calls.length = 0;
r.bossAttackView.drawGround(ctx, projection);
assert.equal(calls.filter(call => call[0] === 'drawImage').length, 1, 'the area leaves a crack on the ground');
run(`battleFx.length = 0; game.settings.cameraShake = true; battleFx.push({ id: 902, type: 'bossAreaImpact', start: ${now - 40}, duration: 560, footprint: { cells: [] } });`);
const shakes = [0, 1, 2, 3].map(step => r.getBattleCameraShake(now + step * 13)).map(shake => Math.hypot(shake.x, shake.y));
assert.ok(Math.max(...shakes) > 1, 'the landing shakes the screen even when dodged');

// ── 시트 보스: 예고 동안 준비 동작, 놓는 순간 한 번만 친다 ───────────────────────────────────
r.Image = class { constructor() { this.complete = true; this.naturalWidth = 256; this.naturalHeight = 256; } };
const sheetCalls = [];
const sheetCtx = new Proxy({}, { get(target, key) { return key in target ? target[key] : (...args) => { if (key === 'drawImage') sheetCalls.push(args[0].src || ''); }; } });
const queen = { id: 8, isBoss: true, hp: 1, monsterVisualId: 'hive-queen', attackTimer: 0.3 };
const pose = { x: 100, y: 100, tile: 48, now, facing: 'west', flash: 0 };
const sheet = () => { sheetCalls.length = 0; r.monsterActors.draw(sheetCtx, queen, pose); return sheetCalls.at(-1); };
run('battleFx.length = 0;');
assert.match(sheet(), /queen-idle/, 'a resting queen idles');
Object.assign(queen, { attackTimer: 1, patternTelegraphKey: 'k', patternArea: warn.patternArea, patternTelegraphStartedAt: r.getCombatTime() - 1200 });
assert.match(sheet(), /queen-attack/, 'during the warning (gauge waiting at 1) she holds the wind-up instead of idling');
Object.assign(queen, { attackTimer: 0.05, patternTelegraphKey: null });
run(`battleFx.push({ id: 903, type: 'enemyAttack', enemyId: 8, start: ${now - 50}, duration: 220 });`);
assert.match(sheet(), /queen-idle/, 'the late hit no longer plays a second strike');
run(`battleFx.push({ id: 904, type: 'bossRelease', enemyId: 8, slam: true, start: ${now - 50}, duration: 560 });`);
assert.match(sheet(), /queen-attack/, 'the release plays the strike');

// ── 보스 사격: 몸 가운데에서, 칸에 맞춘 크기로, 잔상 두 개 ─────────────────────────────────
const shot = { owner: 'enemy', sourceId: 7, element: 'fire', enemyFlight: { source: entry.enemy } };
run('enemyDrawnHeights.set(window.__shotBoss = { isBoss: true }, 120);');
const source = r.prepareBossShot(shot, { tileW: 96 }, { 7: { x: 300, y: 260, enemy: run('__shotBoss') } });
assert.deepEqual({ ...source }, { x: 300, y: 200 }, 'a boss shot leaves half the drawn height above the feet');
assert.ok(Math.abs(shot.screenShotScale - 3.2) < 1e-9, 'and grows with the tile');
run("battleAssets.images.skillFxEnemyProjectiles = { complete: true, naturalWidth: 128 };");
const shotCalls = [];
const shotCtx = new Proxy({}, { get(target, key) { return key in target ? target[key] : (...args) => { if (key === 'drawImage') shotCalls.push(args); }; } });
assert.ok(r.enemyProjectileSprites.draw(shotCtx, shot, { x: 0, y: 0 }, [{ x: 100, y: 0 }], 0.5));
assert.equal(shotCalls.length, 3, 'two fading copies trail a boss shot');
// 불 사격은 42 도트 너비 그림(canvas-enemy-projectiles sizes[1]): 3.2배면 134.4.
assert.ok(shotCalls.every(args => Math.abs(args[7] - 42 * 3.2) < 1e-9 && Math.abs(args[8] - 21 * 3.2) < 1e-9), 'every copy is drawn at the grown size');
assert.equal(r.prepareBossShot({ owner: 'enemy', sourceId: 9 }, { tileW: 48 }, { 9: { x: 0, y: 0, enemy: { isBoss: false } } }), null, 'other shots keep their cell start');
console.log('boss attack feel: release and impact events, warning ramp, wind-up lean, hop landing on impact, impact debris/sound/crack/shake, sheet wind-up, boss shots OK');
