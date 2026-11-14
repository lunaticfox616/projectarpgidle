import { GRAND_BREACH_ROLE_TUNING, GRAND_BREACH_BASE_ROLE } from '../data/rift-kill-values.mjs';

export function killApplyGrandBreachMobTuning(zone, enemy) {
    if (!zone || zone.id !== 'grand_breach_run' || !enemy || enemy.isBoss) return;
    const role = GRAND_BREACH_ROLE_TUNING[enemy.monsterVisualId] || GRAND_BREACH_BASE_ROLE;
    enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * 5 * role.hp));
    enemy.atkMul *= 1.25;
    enemy.damageMul *= 1.25 * role.damage;
    enemy.attackSpeedVar *= role.speed;
    enemy.penetration += role.penetration;
    enemy.resChaos = Math.min(95, enemy.resChaos + role.chaosRes);
    enemy.ailmentChance += role.ailment;
    enemy.hp = enemy.maxHp;
}

// 공허 증원: 경험치·생명력 2배, 공격 속도 1.25배, 피해 1.3배.
/** Colony waves and a void rift on the 9×8 board hold the map's progress plan. A wide map needs no hold: its walk already pauses
 * while anything fights, and the hero must finish the step it is taking to reach the rift's monsters. */
export function killIsMapProgressHeld(env, zone, rift) {
    if (zone?.type === 'colony') return true;
    return killIsVoidRiftCombatZone(zone) && rift.active && !env.deps.actExplorationState.current(env.owner);
}

export function killIsVoidRiftCombatZone(zone) {
    return !!zone && zone.type === 'abyss';
}

export function killApplyVoidRiftMobTuning(enemy) {
    if (!enemy || enemy.isBoss) return;
    enemy.maxHp = Math.max(1, Math.floor((enemy.maxHp || 1) * 2));
    enemy.hp = enemy.maxHp;
    enemy.atkMul = (enemy.atkMul || 1) * 1.25;
    enemy.damageMul = (enemy.damageMul || 1) * 1.3;
    enemy.expMul = (enemy.expMul || 1) * 2;
}

/** From loop 9 in void rift zones: a kill counts toward an open rift's wave, and with no rift open may open one at random. */
export function* killRollRandomVoidRiftOnKill(env, enemy, zone) {
    // 루프 특수 보스 집계에는 일반 액트/혼돈 보스를 포함하지 않음.
    if ((env.owner.season || 1) < 9 || !killIsVoidRiftCombatZone(zone)) return;
    const v = env.owner.voidRift || (env.owner.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    if (v.active) {
        if (enemy.fromVoidRift) v.defeatedCount = Math.max(0, Math.floor(v.defeatedCount || 0)) + 1;
        return;
    }
    if (Math.random() >= (enemy.isElite ? 0.0003335 : 0.000075)) return;
    Object.assign(v, { active: true, activeKills: 0, requiredKills: 0, pendingWave: true, totalToSpawn: 6 + Math.floor(Math.random() * 4), spawnedCount: 0, defeatedCount: 0, spawnTick: 0 });
    (yield { kind: 'killSay', args: ['🕳️ 공허의 구멍이 랜덤으로 열렸습니다!', 'attack-monster', { noToast: true }] });
}
