import { coreHasKeystone } from '../combat/core-keystones.mjs';

export function coreApplyLeechSoftcap(env, rawLeech) {
    return env.deps.combatResources.caps.softcap(rawLeech);
}

export function coreGetPlayerHitLeechTarget(env, pStats) {
    return env.deps.combatResources.player.hitTarget(pStats);
}

/** Only direct hit damage enters leech; spell and attack sources are independent. Returns immediate recovery. */
export function coreApplyPlayerHitLeech(env, pStats, hitDamage, chaosDamage) {
    return env.deps.combatResources.player.hit(env.owner, pStats, hitDamage, chaosDamage);
}

export function coreGetLeechCaps(env, pStats, target) {
    return env.deps.combatResources.caps.leech(pStats, target);
}

export function coreGetLeechOutstandingTotal(env) {
    return env.deps.combatResources.player.outstanding(env.owner);
}

export function coreAddPlayerLeechInstance(env, rawAmount, pStats, target) {
    return env.deps.combatResources.player.store(env.owner, rawAmount, pStats, target);
}

export function coreApplyInstantPlayerLeech(env, rawAmount, pStats, target) {
    return env.deps.combatResources.player.instant(env.owner, rawAmount, pStats, target);
}

export function coreTickPlayerLeech(env, pStats, dt) {
    return env.deps.combatResources.player.tick(env.owner, pStats, dt);
}

export function coreAddPlayerRecoupInstance(env, rawAmount, durationSec) {
    return env.deps.combatResources.player.recoup(env.owner, rawAmount, durationSec);
}

export function coreTickPlayerRecoup(env, pStats, dt) {
    return env.deps.combatResources.player.tickRecoupQueue(env.owner, pStats, dt);
}

export function* coreRefreshRealmDeathWard(env, pStats) {
    const refresh = env.deps.combatResources.wards.refresh(env.owner, pStats);
    let step = refresh.next();
    while (!step.done) {
        const maxAmount = step.value;
        if (env.owner.settings && env.owner.settings.showCombatLog !== false) (yield { kind: 'addLog', args: [env.deps._t('🪨 망자 감시 보호막 재생: {maxAmount}', { maxAmount }), 'loot-magic', { noToast: true }] });
        step = refresh.next();
    }
    return step.value;
}

export function* coreAbsorbDamageWithRealmDeathWard(env, amount, pStats) {
    const remaining = Math.max(0, Math.floor(Number(amount) || 0));
    if (remaining <= 0) return 0;
    const ward = yield* coreRefreshRealmDeathWard(env, pStats);
    if (!ward || (ward.amount || 0) <= 0) return remaining;
    const result = env.deps.combatResources.wards.absorb(ward, remaining, pStats);
    const absorbed = result.absorbed;
    if (absorbed > 0) (yield { kind: 'addBattleFx', args: ['statusText', { text: env.deps._t('감시 보호막 -{absorbed}', { absorbed }), color: '#b9c8d8', duration: 300 }] });
    return result.remaining;
}

export function* coreAbsorbDamageWithTalentStoneShield(env, amount) {
    const result = env.deps.combatResources.wards.stone(env.owner, amount);
    const absorbed = result.absorbed;
    if (absorbed > 0) (yield { kind: 'addBattleFx', args: ['statusText', { text: env.deps._t('돌 보호막 -{absorbed}', { absorbed }), color: '#d8b77a', duration: 300 }] });
    return result.remaining;
}

/** 받는 피해를 0 이상의 정수로 맞춘다. */
export function coreFloorIncomingDamage(env, amount) {
    return env.deps.combatResources.caps.floorDamage(amount);
}

export function coreGetPlayerHpCap(env, pStats) {
    if (!pStats) return 0;
    return env.deps.combatResources.caps.hp(pStats, coreHasKeystone(env, 'w8'));
}

/** @param {{get: (name: string) => unknown}} [tick] The stat calculator's tick (js/player-stat-cache.js); others read live. */
export function coreGetPlayerRecoveryHpCap(env, pStats, tick) {
    const baseCap = coreGetPlayerHpCap(env, pStats);
    if (coreHasKeystone(env, 'w8')) return baseCap;
    const occupied = tick ? tick.get('mossRecoveryOccupied') : coreGetMossRecoveryOccupied(env);
    return env.deps.combatResources.caps.recovery(baseCap, pStats, occupied);
}

export function coreGetMossRecoveryOccupied(env) {
    let mossRows = env.owner.talentCardRuntime && Array.isArray(env.owner.talentCardRuntime.mossRecoveries)
        ? env.owner.talentCardRuntime.mossRecoveries : [];
    return mossRows.reduce((sum, row) => sum + Math.max(0, Number(row && row.amount) || 0), 0);
}

export function coreGetPlayerEnergyShieldRecoveryCap(env, pStats) {
    return env.deps.combatResources.caps.shield(pStats);
}
