// 속성 위습 시트(data/wisp-sprites.js)와 그리기 시점(js/canvas-wisp-actors.js), 위습 규칙(data/bosses.js WISP_ENEMY_RULES).
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const pngSize = file => { const b = fs.readFileSync(file); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

// 시트: 행 = 위·아래·왼쪽·오른쪽, 칸 48, 대기 4열 · 공격 6열
const sheets = json('WISP_SPRITE_SHEETS');
assert.deepStrictEqual(Object.keys(sheets).sort(), ['fire', 'holy', 'ice', 'lightning', 'poison', 'void']);
for (const [id, row] of Object.entries(sheets)) {
    assert.deepStrictEqual(pngSize(row.idle), [48 * 4, 48 * 4], `${id} idle sheet is 4 frames × 4 directions`);
    assert.deepStrictEqual(pngSize(row.attack), [48 * 6, 48 * 4], `${id} attack sheet is 6 frames × 4 directions`);
}
// 게임의 위습 외형 18종은 모두 시트 하나에 이어진다
const visuals = json('WISP_MONSTER_VISUALS.map(wisp => wisp.id)');
assert.strictEqual(visuals.length, 18);
for (const id of visuals) assert(sheets[run(`WISP_SPRITE_BY_VISUAL[${JSON.stringify(id)}]`)], `${id} has a sheet`);

// 공격 클립: 타격 프레임(3)이 투사체가 떠나는 순간에 오고, 그 전 공격 게이지 0.8→1에서 준비 프레임, 그 밖에는 대기 반복
run('battleFx.length = 0; window.testWisp = { id: 7, monsterArchetype: "wisp", spriteVariantId: "wisp-b02", attackTimer: 0.2 };');
assert.strictEqual(run('wispActors.clipFrame(testWisp, 10000).clip'), 'idle', 'no attack in sight → idle loop');
assert.deepStrictEqual(json('[0, 220, 400, 620, 800].map(ms => wispActors.frameAt(WISP_SPRITE_CLIPS.idle.durationsMs, ms))'), [0, 1, 2, 3, 3]);
run('testWisp.attackTimer = 0.9;');
assert.deepStrictEqual(json('wispActors.clipFrame(testWisp, 10000)'), { clip: 'attack', index: 1 }, 'half way through the last fifth of the gauge: wind-up');
run('testWisp.attackTimer = 1;');
assert.strictEqual(run('wispActors.clipFrame(testWisp, 10000).clip'), 'idle', 'a full gauge that is waiting (out of range) does not hold a wind-up pose');
run('battleFx.push({ type: "combatTravel", owner: "enemy", sourceId: 7, start: 10000, duration: 500 });');
assert.deepStrictEqual(json('[10000, 10080, 10200, 10329, 10330].map(now => wispActors.clipFrame(testWisp, now))'),
    [{ clip: 'attack', index: 3 }, { clip: 'attack', index: 4 }, { clip: 'attack', index: 5 }, { clip: 'attack', index: 5 }, { clip: 'idle', index: run('wispActors.clipFrame(testWisp, 10330).index') }],
    'release = strike frame, then recovery, then back to idle after the 600 ms clip');
run('battleFx.push({ type: "combatTravel", owner: "enemy", sourceId: 8, start: 10100, duration: 500 });');
assert.deepStrictEqual(json('wispActors.clipFrame(testWisp, 10080)'), { clip: 'attack', index: 4 }, 'another enemy’s projectile does not animate this wisp');
assert.strictEqual(run('wispActors.draw(null, { monsterArchetype: null }, { tile: 48 })'), false, 'other monsters keep the atlas sprite');

// 규칙: 조금 드물게(외형 뽑기의 1/5), 회피 조금 높게, 방어도 낮게, 스킬 젬 3배
assert.deepStrictEqual(json('WISP_ENEMY_RULES'), { spawnOneIn: 5, hpMul: 0.7, evasionMul: 1.3, armorMul: 0.5, gemDropMul: 3 });
const share = run(`Array.from({ length: 997 }, (_, seed) => getMonsterVariantDefinition(seed, 'cold')).filter(def => def.id.startsWith('wisp-')).length / 997`);
assert(share > 0.19 && share < 0.21, `wisps are about one in five ordinary spawns (${share})`);

console.log('wisp sprites: 6 sheets, 18 visuals mapped, release-aligned attack clip, idle loop and wisp rules: OK');
