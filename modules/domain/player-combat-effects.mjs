/** Combat mutations use the supplied owner. Times/deadlines are milliseconds; no state is retained here. */
function effectTime(now, clock) {
    return Number.isFinite(Number(now)) ? Number(now) : clock();
}

export function situationalTakenReduction(damage, stats, aliveEnemies, regionMultiplierOf) {
    const crowdPct = aliveEnemies >= 2 ? stats.takenDamageReduceWhen2EnemiesPct : stats.takenDamageReduceWhen1EnemyPct;
    const reduced = aliveEnemies >= 1 ? Math.max(1, Math.floor(damage * (1 - Math.max(0, Math.min(0.9, (crowdPct || 0) / 100))))) : damage;
    const regionMultiplier = regionMultiplierOf();
    return regionMultiplier === 1 ? reduced : Math.max(1, Math.floor(reduced * regionMultiplier));
}

export function recoverBlockShield(owner, stats, recoveryCap) {
    if (!((stats.uniqueBlockRecoverEnergyShieldPct || 0) > 0 && (stats.energyShield || 0) > 0)) return;
    const recovered = Math.max(1, Math.floor((stats.energyShield || 0) * Math.max(0, Number(stats.uniqueBlockRecoverEnergyShieldPct || 0)) / 100));
    owner.playerEnergyShield = Math.min(recoveryCap(stats), Math.max(0, Number(owner.playerEnergyShield) || 0) + recovered);
}

export function consumeEvasionCounter(owner, stats, at) {
    const counter = stats && stats.uniqueLoneEvasionCounter;
    if (!counter || (owner.uniqueLoneEvasionCounterUntil || 0) <= at) return 1;
    owner.uniqueLoneEvasionCounterUntil = 0;
    return 1 + Math.max(0, Number(counter.damageMorePct || 20)) / 100;
}

function rechargeBlocked(owner, cap, at) {
    return cap <= 0 || (owner.playerEnergyShield || 0) >= cap || (owner.uniqueCritEsAdvanceReadyAt || 0) > at;
}

function advanceShieldRecharge(owner, stats, now, deps) {
    const config = stats && stats.uniqueCritAdvanceEsRecharge;
    const at = effectTime(now, deps.clock);
    const cap = stats ? deps.recoveryCap(stats) : 0;
    if (!config || rechargeBlocked(owner, cap, at)) return false;
    const previousHitAt = Number.isFinite(owner.playerEsLastHitAt) ? owner.playerEsLastHitAt : at;
    owner.playerEsLastHitAt = Math.max(0, previousHitAt - Math.max(0, Number(config.advanceSec || 0.25)) * 1000);
    owner.uniqueCritEsAdvanceReadyAt = at + Math.max(0, Number(config.cooldownSec || 0.6)) * 1000;
    return true;
}

function triggerShieldBreakRecharge(owner, stats, shieldBeforeHit, now, clock) {
    const config = stats && stats.uniqueEnergyShieldBreakRecharge;
    const at = effectTime(now, clock);
    if (!config || shieldBeforeHit <= 0 || (owner.playerEnergyShield || 0) > 0 || (owner.uniqueEnergyShieldBreakRechargeReadyAt || 0) > at) return false;
    owner.uniqueEnergyShieldBreakRechargeUntil = at + Math.max(0.1, Number(config.duration || 3)) * 1000;
    owner.uniqueEnergyShieldBreakRechargeReadyAt = at + Math.max(0.1, Number(config.cooldown || 12)) * 1000;
    return true;
}

/** Returns the accepted trait for the caller's log boundary; invalid targets do not read the clock. */
export function stealEliteTrait(owner, enemy, stats, clock) {
    if (!enemy || !enemy.isElite || !stats || !stats.uniqueStealEliteTrait) return;
    const trait = enemy.trait || null;
    if (!trait) return;
    const durationMs = Math.max(1000, Math.floor(Number(stats.uniqueStealEliteTrait.duration || 30) * 1000));
    owner.uniqueEliteTraitBuff = { trait: { ...trait }, expiresAt: clock() + durationMs };
    return trait;
}

export function createPlayerCombatEffects(deps) {
    return Object.freeze({
        taken: (damage, stats, attacker, alive) => situationalTakenReduction(damage, stats, alive, () => deps.regionMultiplier(stats, attacker)),
        recoverBlock: (owner, stats) => recoverBlockShield(owner, stats, deps.recoveryCap),
        consumeCounter: (owner, stats, now) => {
            const at = effectTime(now, deps.clock);
            return consumeEvasionCounter(owner, stats, at) * deps.consumeBlockEmpower(at);
        },
        advanceRecharge: (owner, stats, now) => advanceShieldRecharge(owner, stats, now, deps),
        breakRecharge: (owner, stats, shield, now) => triggerShieldBreakRecharge(owner, stats, shield, now, deps.clock),
        stealTrait: (owner, enemy, stats) => stealEliteTrait(owner, enemy, stats, deps.clock)
    });
}
