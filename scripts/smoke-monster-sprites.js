// 액트 몬스터(2026-10-02): 지역별 외형 목록(data/bosses.js), 그림을 따르는 공격 방식(js/combat-grid.js), 시트 규격과
// 잰 발 자리 · 높이(data/monster-sprites.js ↔ PNG), 그리기 시점(js/canvas-monster-actors.js), 목재 몬스터 저장 변환.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const { decodePng } = require('./lib/png.cjs');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

// 1. 지역별 목록: 액트 1 · 3 · 4 · 5는 슬라임 · 웜 · 개미, 2 · 6 · 7 · 8은 그 팔레트 부제, 9 · 10은 장막(8), 나머지는 부제 넷을 섞는다.
const poolOf = zone => json(`getActMonsterPool(${zone})`);
assert.deepStrictEqual(poolOf('getZone(0)'), ['act1-slime', 'act1-worm', 'act1-ant']);
assert.deepStrictEqual(poolOf('getZone(4)'), ['act5-slime', 'act5-worm', 'act5-ant']);
assert.deepStrictEqual(poolOf('getZone(1)'), ['deacon-act2-melee', 'deacon-act2-ranged']);
assert.deepStrictEqual(poolOf('getZone(8)'), ['deacon-act8-melee', 'deacon-act8-ranged'], 'act 9 wears the veil (act 8) palette');
assert.deepStrictEqual(poolOf('getZone(9)'), ['deacon-act8-melee', 'deacon-act8-ranged'], 'act 10 wears the veil (act 8) palette');
const postChaos = poolOf('getZone(ABYSS_START_ZONE_ID + 4)');
assert.strictEqual(postChaos.length, 8, 'after chaos every deacon palette mixes');
assert.deepStrictEqual(poolOf('{ type: "trial", id: "trial_1" }'), postChaos);
for (let act = 0; act < 10; act++) {
    const zone = `getZone(${act})`;
    const picks = new Set(json(`Array.from({ length: 200 }, (_, seed) => getMonsterVariantDefinition(seed, 'phys', ${zone}).id)`));
    const pool = poolOf(zone);
    for (const id of picks) assert(id.startsWith('wisp-') || pool.includes(id), `act ${act + 1} spawns only its own monsters (${id})`);
    pool.forEach(id => assert(picks.has(id), `act ${act + 1} uses every monster of its pool (${id})`));
}

// 2. 공격 방식은 그림을 따른다: 벌레 · 철퇴는 근접, 성수 · 위습은 원거리. 영역 세트(그림 미정)는 예전 확률을 쓴다.
const profile = enemy => json(`rollEnemyGridCombatProfile(${JSON.stringify(enemy)})`);
for (const id of ['act1-ant', 'act3-slime', 'act5-worm', 'deacon-act6-melee']) assert.strictEqual(profile({ spriteVariantId: id }).melee, true, `${id} fights in melee`);
for (const id of ['deacon-act2-ranged', 'deacon-act8-ranged']) {
    const row = profile({ spriteVariantId: id });
    assert.strictEqual(row.melee, false, `${id} throws holy water`);
    assert(row.range >= 3 && row.range <= 5, `${id} keeps the ranged reach (${row.range})`);
}
assert.strictEqual(profile({ monsterArchetype: 'wisp', spriteVariantId: 'wisp-b02' }).melee, false);
const realmMelee = json(`REALM_MONSTER_VISUAL_SETS.underworld.members.map(m => rollEnemyGridCombatProfile({ monsterVisualId: m.id }).melee)`);
assert(realmMelee.includes(false), 'realm sets keep their per-visual roll until their pictures are redrawn');
run('showGameToast = () => {};'); // 화면 알림은 검사 밖
const spawned = json(`(() => { resetGame(); const e = createEnemy(getZone(0), { at: 20, count: 1 }, 1); assignEnemyGridCombatProfile(e); return e; })()`);
assert.strictEqual(spawned.spriteVariantId.startsWith('act1-'), true, 'act 1 spawns an act 1 monster');
assert.strictEqual(spawned.attackKind, 'melee', 'and it walks up to bite');
assert.strictEqual(spawned.name, run(`ACT_MONSTER_VISUAL_BY_ID[${JSON.stringify(spawned.spriteVariantId)}].name`), 'the name comes from the picture');

// 3. 시트: 대기 4열 · 공격 6열 × 4방향, 잰 높이 = 발에서 대기 0번 네 방향 중 가장 높은 도트까지.
const kinds = json('MONSTER_SPRITE_KINDS'), sheets = json('MONSTER_SPRITE_SHEETS');
assert.deepStrictEqual(Object.keys(sheets).sort(), json('ACT_MONSTER_VISUALS.map(v => v.id)').sort(), 'every act monster has a sheet');
function topOfIdle(png, cell) {
    let top = cell;
    for (let row = 0; row < 4; row++) for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
        if (png.data[((row * cell + y) * png.width + x) * 4 + 3]) { top = Math.min(top, y); break; }
    }
    return top;
}
for (const [id, sheet] of Object.entries(sheets)) {
    const kind = kinds[sheet.kind], idle = decodePng(fs.readFileSync(sheet.idle)), attack = decodePng(fs.readFileSync(sheet.attack));
    assert.deepStrictEqual([idle.width, idle.height], [kind.frame * 4, kind.frame * 4], `${id} idle sheet is 4 frames × 4 directions`);
    assert.deepStrictEqual([attack.width, attack.height], [kind.frame * 6, kind.frame * 4], `${id} attack sheet is 6 frames × 4 directions`);
    assert.strictEqual(kind.attackMs.length, 6);
    assert.strictEqual(sheet.height, kind.feet[1] - topOfIdle(idle, kind.frame), `${id} height matches the picture`);
}

// 4. 그리기 시점: 때린 순간(근접) 또는 쏜 순간(원거리)에 타격 프레임, 게이지 0.8→1은 준비, 걷는 중에는 빠른 대기 + 한 도트 튐.
const bug = kinds.bug, deacon = kinds.deaconMelee;
run('battleFx.length = 0; window.testBug = { id: 3, spriteVariantId: "act1-ant", attackTimer: 0.2 };');
const clip = (who, kind, now, moving = false) => json(`monsterActors.clipFrame(${who}, MONSTER_SPRITE_KINDS.${kind}, ${now}, ${moving})`);
assert.strictEqual(clip('testBug', 'bug', 10000).clip, 'idle');
run('testBug.attackTimer = 0.9;');
assert.deepStrictEqual(clip('testBug', 'bug', 10000), { clip: 'attack', index: 1, bob: 0 }, 'wind-up in the last fifth of the gauge');
assert.strictEqual(clip('testBug', 'bug', 10000, true).clip, 'idle', 'walking monsters do not hold the wind-up pose');
run('battleFx.push({ type: "enemyAttack", enemyId: 3, start: 10000, duration: 220 });');
assert.deepStrictEqual(clip('testBug', 'bug', 10000), { clip: 'attack', index: bug.impactFrame, bob: 0 }, 'the bite lands on the strike frame');
run('testBug.attackTimer = 0.05;'); // 때리고 나면 게이지가 비어 다시 찬다
assert.strictEqual(clip('testBug', 'bug', 10000 + 600 - 271).clip, 'attack', 'the recovery frames play out');
assert.strictEqual(clip('testBug', 'bug', 10000 + 600 - 270).clip, 'idle', 'back to idle after the 600 ms clip');
run('window.testDeacon = { id: 4, spriteVariantId: "deacon-act2-melee", attackTimer: 0 }; battleFx.push({ type: "enemyAttack", enemyId: 4, start: 20000, duration: 220 });');
assert.strictEqual(clip('testDeacon', 'deaconMelee', 20000).index, deacon.impactFrame, 'the mace strikes on its own frame 2');
const walking = [0, 50, 100, 150, 200, 250, 300, 350].map(ms => clip('{ id: 0, attackTimer: 0 }', 'bug', ms, true));
assert(walking.some(row => row.bob === 1) && walking.some(row => row.bob === 0), 'walking hops a dot on every other frame');
assert.strictEqual(run('monsterActors.draw(null, { spriteVariantId: "underworld-beetle" }, { tile: 48 })'), false, 'realm sets keep the atlas sprite');
assert.strictEqual(run('monsterActors.draw(null, { spriteVariantId: null, isBoss: true }, { tile: 48 })'), false, 'bosses keep their art');

// 5. 저장 변환: 모은 목재 외형 → 닮은 새 몬스터, 싸우던 목재 적 → 그 지역 몬스터(이름 · 외형 · 공격 방식 다시).
const migrated = json(`(() => {
    const save = { unlockedMonsterSkins: { woodSlime: true, woodPuppet: true, 'wisp-b02': true }, selectedMonsterSkin: 'rootSpider', currentZoneId: 0,
        enemies: [{ id: 1, variantSeed: 4, spriteVariantId: 'sapLeech-3', baseMonsterName: '쌍둥이 뿌리관', name: '광폭 연타 쌍둥이 뿌리관', attackKind: 'ranged', attackRange: 4 }] };
    migrateRetiredWoodMonsters(save);
    const again = JSON.stringify(save); migrateRetiredWoodMonsters(save);
    return { save, stable: again === JSON.stringify(save) };
})()`);
assert.deepStrictEqual(migrated.save.unlockedMonsterSkins, { 'wisp-b02': true, 'act1-slime': true, 'deacon-act2-melee': true });
assert.strictEqual(migrated.save.selectedMonsterSkin, 'act1-ant');
const foe = migrated.save.enemies[0];
assert(foe.spriteVariantId.startsWith('act1-'), 'a saved wood enemy in act 1 becomes an act 1 monster');
assert.strictEqual(foe.name, '광폭 연타 ' + foe.baseMonsterName, 'the elite trait stays in front of the new name');
assert.strictEqual(foe.attackKind, undefined, 'its attack kind is chosen again from the picture');
assert.strictEqual(migrated.stable, true, 'loading twice changes nothing more');

console.log('monster sprites: act pools, picture attack kinds, 20 sheets with measured feet, strike-aligned clips, wood save conversion: OK');
