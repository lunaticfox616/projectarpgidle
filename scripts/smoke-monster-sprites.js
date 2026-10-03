// 액트 몬스터(2026-10-02): 지역별 외형 목록(data/bosses.js), 그림을 따르는 공격 방식(js/combat-grid.js), 시트 규격과
// 잰 발 자리 · 높이(data/monster-sprites.js ↔ PNG), 그리기 시점(js/canvas-monster-actors.js), 목재 몬스터 저장 변환.
// 무기 뿌리촉수 여섯은 지역 목록과 따로 모든 지역에 섞여 나온다(드랍 쏠림은 scripts/smoke-weapon-categories.js).
// 영역 세트 넷(일곱씩)도 몬스터마다 시트를 가지고 그림대로 싸운다.
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
const roots = json('ROOT_MONSTER_VISUALS.map(v => v.id)');
assert.deepStrictEqual(roots.map(id => id.slice('root-'.length)).sort(), json('Object.keys(WEAPON_CATEGORIES)').sort(), 'one root per weapon category');
for (let act = 0; act < 10; act++) {
    const zone = `getZone(${act})`;
    const picks = new Set(json(`Array.from({ length: 200 }, (_, seed) => getMonsterVariantDefinition(seed, 'phys', ${zone}).id)`));
    const pool = poolOf(zone);
    for (const id of picks) assert(id.startsWith('wisp-') || roots.includes(id) || pool.includes(id), `act ${act + 1} spawns only its own monsters (${id})`);
    pool.forEach(id => assert(picks.has(id), `act ${act + 1} uses every monster of its pool (${id})`));
    roots.forEach(id => assert(picks.has(id), `every root shows up in act ${act + 1} too (${id})`));
}
const rootShare = json(`Array.from({ length: 997 }, (_, seed) => getMonsterVariantDefinition(seed, 'phys', getZone(3)).id).filter(id => id.startsWith('root-')).length / 997`);
assert(rootShare > 0.09 && rootShare < 0.11, `about one in ten ordinary monsters is a root (${rootShare})`);
assert(postChaos.every(id => !id.startsWith('root-')), 'roots are not part of any area list');
assert.strictEqual(json(`getMonsterVariantDefinition(25, 'phys', getZone(0)).id`).startsWith('wisp-'), true, 'a seed that is both goes to the wisp');

// 2. 공격 방식은 그림을 따른다: 벌레 · 철퇴는 근접, 성수 · 위습은 원거리. 영역 세트(그림 미정)는 예전 확률을 쓴다.
const profile = enemy => json(`rollEnemyGridCombatProfile(${JSON.stringify(enemy)})`);
for (const id of ['act1-ant', 'act3-slime', 'act5-worm', 'deacon-act6-melee', 'root-greatsword', 'root-scimitar', 'root-censer']) assert.strictEqual(profile({ spriteVariantId: id }).melee, true, `${id} fights in melee`);
for (const id of ['root-shortbow', 'root-orb', 'root-flask']) assert.strictEqual(profile({ spriteVariantId: id }).melee, false, `${id} shoots or throws`);
for (const id of ['deacon-act2-ranged', 'deacon-act8-ranged']) {
    const row = profile({ spriteVariantId: id });
    assert.strictEqual(row.melee, false, `${id} throws holy water`);
    assert(row.range >= 3 && row.range <= 5, `${id} keeps the ranged reach (${row.range})`);
}
assert.strictEqual(profile({ monsterArchetype: 'wisp', spriteVariantId: 'wisp-b02' }).melee, false);
const realm = json(`Object.values(REALM_MONSTER_VISUAL_SETS).flatMap(set => set.members).filter(m => m.role !== 'boss')
    .map(m => ({ id: m.id, attack: m.attack, melee: rollEnemyGridCombatProfile({ monsterVisualId: m.id }).melee }))`);
realm.forEach(row => assert.strictEqual(row.melee, row.attack === 'melee', `${row.id} fights as drawn (${row.attack})`));
assert(realm.some(row => row.melee) && realm.some(row => !row.melee), 'realm sets mix melee and ranged pictures');
run('showGameToast = () => {};'); // 화면 알림은 검사 밖
const spawned = json(`(() => { resetGame(); const e = createEnemy(getZone(0), { at: 20, count: 1 }, 1); assignEnemyGridCombatProfile(e); return e; })()`);
assert.strictEqual(spawned.spriteVariantId.startsWith('act1-'), true, 'act 1 spawns an act 1 monster');
assert.strictEqual(spawned.attackKind, 'melee', 'and it walks up to bite');
assert.strictEqual(spawned.name, run(`ACT_MONSTER_VISUAL_BY_ID[${JSON.stringify(spawned.spriteVariantId)}].name`), 'the name comes from the picture');

// 3. 시트: 대기 4열 · 공격 6열 × 4방향, 잰 높이 = 발에서 대기 0번 네 방향 중 가장 높은 도트까지(방향별 발 자리가 있으면 그것으로).
const kinds = json('MONSTER_SPRITE_KINDS'), sheets = json('MONSTER_SPRITE_SHEETS');
assert.deepStrictEqual(Object.keys(sheets).sort(), json(`ACT_MONSTER_VISUALS.map(v => v.id)
    .concat(Object.values(REALM_MONSTER_VISUAL_SETS).flatMap(set => set.members.map(m => m.id)))`).sort(), 'every act, root and realm monster has a sheet');
/** First and last opaque line of idle frame 0 in each direction row. */
function idleRows(png, cell) {
    return [0, 1, 2, 3].map(row => {
        const lines = [];
        for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
            if (png.data[((row * cell + y) * png.width + x) * 4 + 3]) { lines.push(y); break; }
        }
        return { top: Math.min(...lines), bottom: Math.max(...lines) };
    });
}
for (const [id, sheet] of Object.entries(sheets)) {
    const kind = kinds[sheet.kind], idle = decodePng(fs.readFileSync(sheet.idle)), attack = decodePng(fs.readFileSync(sheet.attack));
    assert.deepStrictEqual([idle.width, idle.height], [kind.frame * 4, kind.frame * 4], `${id} idle sheet is 4 frames × 4 directions`);
    assert.deepStrictEqual([attack.width, attack.height], [kind.frame * 6, kind.frame * 4], `${id} attack sheet is 6 frames × 4 directions`);
    assert.strictEqual(kind.attackMs.length, 6);
    const rows = idleRows(idle, kind.frame), feetOf = index => (sheet.feet ? (sheet.feet[kind.rows[index]] || sheet.feet) : kind.feet);
    assert.strictEqual(sheet.height, Math.max(...rows.map((row, index) => feetOf(index)[1] - row.top)), `${id} height matches the picture`);
    if (!sheet.feet || Array.isArray(sheet.feet)) continue; // 방향별 발 자리(뿌리촉수)만 밑동을 잰다
    rows.forEach((row, index) => assert(Math.abs(feetOf(index)[1] - 1 - row.bottom) <= 1,
        `${id} ${kind.rows[index]}: the feet sit on the root's lowest dots (${feetOf(index)[1]} vs ${row.bottom})`));
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
assert.strictEqual(run('monsterActors.isSheetMonster("underworld-beetle")'), true, 'realm sets draw from their own sheets');
assert.strictEqual(run('getEnemySkinId({ monsterVisualId: "ocean-crab" })'), 'ocean-crab', 'a realm kill unlocks that realm look');
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
// 영역 세트가 그림대로 싸우게 된 뒤(2026-10-03): 예전 무작위 공격 방식으로 저장된 영역 적은 불러올 때 다시 정한다. 보스는 그대로.
const realmSave = json(`(() => {
    const save = { currentZoneId: 0, enemies: [
        { id: 11, monsterVisualId: 'ocean-crab', attackKind: 'ranged', attackRange: 4, attackDelivery: 'projectileTarget' },
        { id: 12, monsterVisualId: 'underworld-wraith', attackKind: 'ranged', attackRange: 4 },
        { id: 13, monsterVisualId: 'sky-titan', isBoss: true, attackKind: 'ranged', attackRange: 99 }] };
    migrateRetiredWoodMonsters(save);
    return save.enemies.map(e => [e.attackKind || null, e.attackRange || null]);
})()`);
assert.deepStrictEqual(realmSave, [[null, null], ['ranged', 4], ['ranged', 99]], 'a melee crab saved as ranged rolls again; a ranged wraith and the boss stay');

console.log(`monster sprites: act pools with roots everywhere, picture attack kinds (realm sets too), ${Object.keys(sheets).length} sheets with measured feet, strike-aligned clips, wood save conversion: OK`);
