// 벌 그림을 쓰는 아틀라스 콘텐츠의 겉모습과 능력치(2026-10-07 검토):
// - 벌집 방의 벌은 그 밑에 위습, 뿌리, 액트 몬스터를 굴리지 않는다(위습으로 굴린 방어 보정이 벌 그림 아래 남았다).
// - 정예의 이름과 그림이 벌집 세트에서 같은 외형이다(정예 수호벌이 여왕 근위벌 그림이라 외형 기록 이름이 달랐다).
// - 나이테를 엮는 자의 메아리로 나온 벌집 여왕은 여왕 그림이다(액트 9 보스 그림으로 나왔다).
// - 몬스터 외형 목록에 같은 외형이 두 번 나오지 않는다(군락지 세트가 다른 세트의 개미, 웜, 벌을 다시 쓴다).
const assert = require('node:assert/strict');
const { runtime: r, run } = require('./audit-combat-20260905').prepare();
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

// ── 벌집 방: 위습이 될 씨앗이어도 벌은 벌이다 ───────────────────────────────────────────────
const zone = r.getZone(1);
const wispAt = Array.from({ length: 400 }, (_, at) => at).find(at => {
    const enemy = r.createEnemy(zone, { at, count: 1 }, 0);
    return String(enemy.spriteVariantId || '').startsWith('wisp-');
});
assert.ok(Number.isInteger(wispAt), 'some spawn offset rolls a wisp');
const wisp = r.createEnemy(zone, { at: wispAt, count: 1 }, 0);
const bee = r.createEnemy(zone, { at: wispAt, count: 1, ownLook: true }, 0);
assert.equal(bee.spriteVariantId, null, 'a room with its own look rolls no variant under it');
assert.ok(bee.maxHp > wisp.maxHp, 'so the wisp life cut is not on the bee');
assert.ok(bee.evasion < wisp.evasion || bee.armor > wisp.armor, 'nor the wisp evasion and armor');
assert.equal(r.atlasEncounters.hasOwnLook('hive'), true);
assert.equal(r.atlasEncounters.hasOwnLook('breach'), false);
assert.equal(r.atlasEncounters.hasOwnLook(null), false);
const tuned = r.atlasEncounters.tuneEnemy(bee, 'hive');
assert.equal(tuned.monsterVisualId, 'hive-worker');

// ── 이름과 그림이 같은 외형 ────────────────────────────────────────────────────────────
const looks = json(`Object.entries(ATLAS.encounters).filter(([, rule]) => rule.visuals).map(([type, rule]) => ({ type, names: rule.names,
    pictures: rule.visuals.map(id => (REALM_MONSTER_VISUAL_SETS.hive.members.find(member => member.id === id) || {}).name) }))`);
for (const look of looks) assert.deepEqual(look.pictures, look.names, `${look.type}: each name draws the picture of that name`);

// ── 메아리로 나온 리그 보스는 제 그림 ─────────────────────────────────────────────────────
const echoZone = { atlasStages: 'apex_weaver', atlasEchoes: [['벌집 여왕', 8], ['다른 보스', 5]], bossStageNames: ['나이테', '메아리 1', '메아리 2', '나이테'] };
const echoQueen = r.atlasEndgame.tuneStage(r.createEnemy(zone, { at: 0, count: 1, boss: true }, 0), echoZone, 1);
assert.equal(echoQueen.monsterVisualId, 'hive-queen', "the weaver's echo of the beehive queen draws her own sheet");
const echoOther = r.atlasEndgame.tuneStage(r.createEnemy(zone, { at: 0, count: 1, boss: true }, 0), echoZone, 2);
assert.notEqual(echoOther.monsterVisualId, 'hive-queen', 'other echoes keep their act boss art');
assert.equal(echoOther.bossAssetKey, json('ACT_BOSS_ASSET_KEYS[5]') || echoOther.bossAssetKey);

// ── 외형 목록은 외형마다 한 줄 ───────────────────────────────────────────────────────────
const skinIds = json('getMonsterSkinDefs().map(def => def.id)');
assert.equal(new Set(skinIds).size, skinIds.length, 'every monster look is listed once');
assert.ok(skinIds.includes('hive-guard') && skinIds.includes('act5-ant'), 'the borrowed looks are still there');

console.log('smoke-atlas-hive-looks: ok');
