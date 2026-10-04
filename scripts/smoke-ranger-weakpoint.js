// 급소 표식(레인저 키스톤 r5, 2026-10-04): 같은 적을 세 번 맞힐 때마다 최대 생명력의 3%를 더 준다. 보스에게는 그 세 번째 적중
// 피해까지만 준다 — 생명력 비례라 나무꾼(9,350만)도 세 번마다 280만씩 깎여, 낮은 단계 레인저가 11초 만에 3분의 1을 지웠다.
// 실제 공격(performPlayerAttack)으로 확인한다. 공격력 · 명중은 고정한다(난수 경계).
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');

function strike(isBoss, keystone = true) {
    const { runtime: r, run, state } = fixture(7);
    state.currentZoneId = 1;
    state.gridPlayer = { gx: 3, gy: 4, gridMoveTimer: 0 };
    state.ascendClass = 'ranger'; state.ascendKeystones = keystone ? ['r5'] : [];
    const enemy = r.createEnemy(r.getZone(1), { at: 20, count: 1 }, 0);
    Object.assign(enemy, { id: 100, gx: 4, gy: 4, hp: 10000000, maxHp: 10000000, isBoss, armor: 0, evasion: 0, evasionChance: 0,
        dr: 0, resF: 0, resC: 0, resL: 0, resChaos: 0, firstHitGuard: 0, hitRateGuard: 0, comboTakenLessPct: 0, attackTimer: 0,
        regenRate: 0, attackKind: 'melee', attackRange: 1 });
    state.enemies = [enemy];
    const stats = r.getPlayerStats();
    Object.assign(stats, { baseDmg: 1000, minDmgRoll: 100, maxDmgRoll: 100, accuracy: 1000000, crit: 0, passiveAlwaysHit: true,
        flatElementHitDamage: {}, addedDamagePctByElement: {}, finalDamageMultiplier: 1 });
    const hits = [];
    for (let n = 0; n < 3; n++) {
        const before = enemy.hp;
        r.performPlayerAttack(stats, { forcedCrit: false });
        run('pendingSkillStageHits.forEach(row=>{row.at=0;});processPendingSkillStageHits();');
        hits.push(before - enemy.hp);
    }
    return hits;
}

const plain = strike(false, false), normal = strike(false), boss = strike(true);
assert.ok(plain.every(hit => hit > 0 && hit === plain[0]), 'without the keystone every hit is the same');
const hit = plain[0];
assert.deepEqual(normal.slice(0, 2), [hit, hit], 'the first two hits add nothing');
assert.equal(normal[2], hit + 300000, 'the third hit on an ordinary enemy adds 3% of its maximum life');
assert.deepEqual(boss.slice(0, 2), [hit, hit]);
assert.equal(boss[2], hit * 2, 'the third hit on a boss adds at most that hit again');
console.log('ranger weakpoint: 3% of maximum life on ordinary enemies, capped at the hit on bosses: OK');
