// Ordered combat stages. c is cast-local; h is contact-local; dependencies are explicit at the classic boundary.

export function finishAttackRecovery(c) {
    c.instantLeechRecovered = c.deps.applyPlayerHitLeech(c.pStats, c.totalLeechableDamage, c.totalChaosDamage);
    recoverAttackCriticalShield(c);
    c.firstResolvedSkillHit = !c.isStageReplay || Number(c.options.stageIndex) === 0;
    if (c.firstResolvedSkillHit && c.isCrit && c.hitSummary.totalDamage > 0) c.deps.advanceEnergyShieldRechargeOnCrit(c.pStats, c.deps.getCombatTime());
    c.hitLog = c.deps.getPlayerHitCombatLog(c.hitSummary, { skillName: c.skillName, swingElement: c.swingElement, isCrit: c.isCrit, isDotSkill: c.isDotSkill, targets: c.targets, pStats: c.pStats, instantLeechRecovered: c.instantLeechRecovered });
}

function recoverAttackCriticalShield(c) {
    if (!c.isStageReplay && c.isCrit && (c.pStats.uniqueEsRecoverOnCritPct || 0) > 0 && (c.pStats.energyShield || 0) > 0) {
        let recover = Math.max(1, Math.floor((c.pStats.energyShield || 0) * ((c.pStats.uniqueEsRecoverOnCritPct || 0) / 100)));
        c.owner.playerEnergyShield = Math.min(c.deps.getPlayerEnergyShieldRecoveryCap(c.pStats), Math.max(0, (c.owner.playerEnergyShield || 0) + recover));
    }
}
