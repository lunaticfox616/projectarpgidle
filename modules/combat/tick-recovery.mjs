

/** The tick's recovery: life regen (under a bloom trial's suppression), act rest, the delayed guard heal, leech, recoup, and the
 * energy shield. */
export function tickRecoverPlayerTick(env, pStats) {
    const recoveryHpCap = env.deps.getPlayerRecoveryHpCap(pStats);
    if (env.owner.playerHp > 0 && env.owner.playerHp < recoveryHpCap) {
        const bloomRegenMul = Math.max(0.05, 1 - Math.max(0, Math.min(0.95, env.owner.bloomTrialRegenSuppress || 0)));
        env.owner.playerHp = Math.min(recoveryHpCap, env.owner.playerHp + (pStats.maxHp * (pStats.regen / 100)) * 0.1 * bloomRegenMul);
    }
    env.deps.applyActRestRecovery(pStats, recoveryHpCap);
    if ((env.owner.delayedGuardHealPool || 0) > 0) {
        const tickHeal = Math.max(0, (env.owner.delayedGuardHealPool / 4) * 0.1);
        env.owner.playerHp = Math.min(recoveryHpCap, env.owner.playerHp + tickHeal);
        env.owner.delayedGuardHealPool = Math.max(0, env.owner.delayedGuardHealPool - tickHeal);
    }
    env.deps.tickPlayerLeech(pStats, 0.1);
    env.deps.tickPlayerRecoup(pStats, 0.1);
    tickRechargeEnergyShieldTick(env, pStats);
}

export function tickRechargeEnergyShieldTick(env, pStats) {
    const cap = env.deps.getPlayerEnergyShieldRecoveryCap(pStats);
    tickSanitizeEnergyShieldTick(env, pStats, cap);
    if ((pStats.energyShield || 0) > 0 && env.owner.playerEnergyShield < cap) tickRefillEnergyShieldTick(env, pStats, cap);
}

export function tickSanitizeEnergyShieldTick(env, pStats, cap) {
    if (!Number.isFinite(env.owner.playerEnergyShield)) env.owner.playerEnergyShield = Math.floor(pStats.energyShield || 0);
    env.owner.playerEnergyShield = Math.max(0, Math.min(env.owner.playerEnergyShield, cap));
    if (!Number.isFinite(env.owner.playerEsLastHitAt)) env.owner.playerEsLastHitAt = 0;
}

/** cr5 turns life regen into shield, the crusader window adds 25% a second, and the shield's own recharge when it runs now. */
export function tickRefillEnergyShieldTick(env, pStats, cap) {
    const add = perSec => { env.owner.playerEnergyShield = Math.min(cap, env.owner.playerEnergyShield + perSec * 0.1); };
    if (env.deps.hasKeystone('cr5')) add((pStats.maxHp || 0) * ((pStats.regen || 0) / 100));
    if ((env.owner.crusaderEsRegenUntil || 0) > env.deps.getCombatTime()) add((pStats.energyShield || 0) * 0.25);
    if (tickEnergyShieldRechargesNow(env, pStats)) add((pStats.energyShield || 0) * ((pStats.energyShieldRegenRate || 12.5) / 100));
}

/** Whether the energy shield refills this tick: no interruption (e3, a broken-shield unique window), moving with no delay, or the
 * recharge delay passed since the last hit. */
export function tickEnergyShieldRechargesNow(env, pStats) {
    const sinceHit = (env.deps.getCombatTime() - (env.owner.playerEsLastHitAt || 0)) / 1000;
    const noInterruptEsRegen = (env.deps.hasKeystone('e3')) || tickUniqueShieldWindowOpen(env, pStats);
    const allowRechargeWhileMoving = (env.owner.moveTimer || 0) > 0 && (pStats.energyShieldRechargeDelay || 0) <= 0;
    return Boolean(noInterruptEsRegen || allowRechargeWhileMoving || sinceHit >= (pStats.energyShieldRechargeDelay || 3));
}

export function tickUniqueShieldWindowOpen(env, pStats) { return Boolean(pStats.uniqueEnergyShieldBreakRecharge && (env.owner.uniqueEnergyShieldBreakRechargeUntil || 0) > env.deps.getCombatTime()); }
