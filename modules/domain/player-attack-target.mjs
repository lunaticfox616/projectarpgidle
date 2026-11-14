// Ordered combat stages. c is cast-local; h is contact-local; dependencies are explicit at the classic boundary.

function readHitTarget(c, h) {
    h.targetEnemy = h.hit.enemy;
}

function pickRandomHitTarget(c, h) {
    if (c.pStats.sSkill.randomTargetEachHit) {
        let alive = c.options.restrictRandomTargets
            ? c.targets.map(entry => entry.enemy).filter(enemy => enemy && enemy.hp > 0)
            : (c.owner.enemies || []).filter(enemy => enemy && enemy.hp > 0);
        if (alive.length <= 0) return false;
        let eligible = alive.filter(enemy => (c.perEnemyHitCount.get(enemy.id) || 0) < 2);
        if (eligible.length > 0) h.targetEnemy = eligible[Math.floor(c.deps.random() * eligible.length)];
        else if (!c.randomTargetCapFallbackUsed) {
            c.randomTargetCapFallbackUsed = true;
            h.targetEnemy = alive[Math.floor(c.deps.random() * alive.length)];
        } else return false;
    }
}

function guardRepeatedTarget(c, h) {
    if (!h.targetEnemy || h.targetEnemy.hp <= 0) return false;
    c.deps.transferPassiveChaosErosionToTarget(h.targetEnemy, c.pStats);
    h.priorGuardedHits = Math.max(0, Math.floor(Number(c.attackHitGuardCounts.get(h.targetEnemy.id)) || 0));
    h.nextHitCount = (c.perEnemyHitCount.get(h.targetEnemy.id) || 0) + 1;
    if (c.pStats.passiveKeystoneFlags && c.pStats.passiveKeystoneFlags.projectileFormation && h.nextHitCount > 1) return false;
    c.perEnemyHitCount.set(h.targetEnemy.id, h.nextHitCount);
}

function readTargetResistance(c, h) {
    h.hitElement = c.swingElement;
    h.curseFx = c.deps.getEnemyConditionDebuffFactor(h.targetEnemy, c.pStats);
    h.enemyRes = c.deps.getHitEnemyResistance(h.hitElement, c.zoneTier, h.targetEnemy, c.pStats, h.curseFx) - c.deps.ascendancyNodeRules.armorBreak(h.targetEnemy, h.hitElement, c.deps.getCombatTime());
    if (c.deps.getPassiveChaosConversionShare(c.pStats, h.hitElement) > 0) {
        let chaosShare = c.deps.getPassiveChaosConversionShare(c.pStats, h.hitElement);
        let chaosRes = c.deps.getEffectiveEnemyMitigation('chaos', c.zoneTier, h.targetEnemy, c.pStats) - (h.curseFx.resChaosShred || 0);
        h.enemyRes = h.enemyRes * (1 - chaosShare) + chaosRes * chaosShare;
    }
}

function applyJudgmentResistance(c, h) {
    if (h.targetEnemy && Array.isArray(h.targetEnemy.ailments)) { let cj = h.targetEnemy.ailments.find(a => a && a.type === 'cosmosJudgment' && (a.time || 0) > 0); if (cj) h.enemyRes -= Math.max(0, Number(cj.power || 0)); }
}

function applyStackedResistance(c, h) {
    if (h.targetEnemy && Array.isArray(h.targetEnemy.ailments)) { let rs = h.targetEnemy.ailments.find(a => a && a.type === 'realmAllResDown' && (a.time || 0) > 0); if (rs) h.enemyRes -= Math.max(0, Math.floor(rs.stacks || 0)) * Math.max(0, Number((c.pStats.uniqueAllResDownOnHit && c.pStats.uniqueAllResDownOnHit.perHit) || 0)); }
}

function selectContactCritical(c, h) {
    h.hitCrit = c.isCrit;
    h.passiveGuaranteedCrit = false;
    if (c.pStats.passiveKeystoneFlags && (c.pStats.passiveKeystoneFlags.explosiveDistill
                    || c.pStats.passiveKeystoneFlags.taintedWarhead)) h.hitCrit = false;
    if (c.pStats.passiveKeystoneFlags && c.pStats.passiveKeystoneFlags.fullEvasion
                    && (c.pStats.sSkill.tags || []).includes('melee') && c.owner.passiveFullEvasionCritReady) {
        h.hitCrit = true;
        h.passiveGuaranteedCrit = true;
        c.owner.passiveFullEvasionCritReady = false;
    }
}

function invertTargetResistance(c, h) {
    h.invertEnemyResistance = false;
    if (['fire', 'cold', 'light'].includes(h.hitElement) && typeof c.deps.getPreciseTalentRatio === 'function'
                    && c.deps.random() < 0.15 * c.deps.getPreciseTalentRatio('hero3__inquisitor')) h.invertEnemyResistance = true;
    if (h.invertEnemyResistance) h.enemyRes = -h.enemyRes;
}

function stackTargetResistanceLoss(c, h) {
    if (c.pStats.uniqueAllResDownOnHit && h.targetEnemy) {
        c.deps.getCombatTime();
        h.targetEnemy.ailments = Array.isArray(h.targetEnemy.ailments) ? h.targetEnemy.ailments : [];
        let row = h.targetEnemy.ailments.find(a => a && a.type === 'realmAllResDown');
        if (!row) { row = { type: 'realmAllResDown', stacks: 0, time: 0 }; h.targetEnemy.ailments.push(row); }
        row.stacks = Math.min(Math.max(1, Math.floor(c.pStats.uniqueAllResDownOnHit.max || 4)), Math.max(0, Math.floor(row.stacks || 0)) + 1);
        row.time = Math.max(row.time || 0, Number(c.pStats.uniqueAllResDownOnHit.duration || 5));
    }
}

// Called once in the original order; false cancels only this cast/contact.
export function selectPlayerContact(c, h) {
    readHitTarget(c, h);
    if (pickRandomHitTarget(c, h) === false) return false;
    if (guardRepeatedTarget(c, h) === false) return false;
    readTargetResistance(c, h);
    applyJudgmentResistance(c, h);
    applyStackedResistance(c, h);
    selectContactCritical(c, h);
    invertTargetResistance(c, h);
    stackTargetResistanceLoss(c, h);
}
