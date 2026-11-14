// Ordered combat stages. c is cast-local; h is contact-local; dependencies are explicit at the classic boundary.

export function showAttackFeedback(c, enemy, cue) {
    if (!cue || !cue.key || !cue.text || c.attackFeedbackKeys.has(cue.key)) return;
    c.attackFeedbackKeys.add(cue.key);
    c.deps.addBattleFx('statusText', {
        enemyId: enemy && enemy.id,
        text: cue.text,
        color: cue.color || '#f3d9a4',
        duration: 900,
        dedupeKey: c.attackFeedbackGroup ? `attack:${c.attackFeedbackGroup}:${cue.key}` : '',
        dedupeWindowMs: 1400
    });
}

export function applyPierceOverkillCarry(c, carry) {
    const hunterSingle = c.deps.hasKeystone('h4') && (c.owner.enemies || []).filter(e => e && e.hp > 0).length === 1;
    if ((!c.pStats.sSkill.pierceOverkillCarry && !hunterSingle) || carry.carryDamage <= 0) return;
    runPierceCarry(c, carry);
}

function runPierceCarry(c, carry) {
    const { sourceEnemy, carryDamage, ailmentCarrySourceDamage } = carry;
    const chain = {
        remaining: Math.max(0, Math.floor(carryDamage)),
        ailment: Math.max(0, Math.floor(Number(ailmentCarrySourceDamage !== undefined ? ailmentCarrySourceDamage : carryDamage) || 0)),
        visited: new Set(sourceEnemy && sourceEnemy.id ? [sourceEnemy.id] : []),
        source: sourceEnemy
    };
    const limit = Math.max(1, Math.min(12, Math.floor(c.pStats.sSkill.targets || 1)));
    for (let index = 0; index < limit && chain.remaining > 0; index++) {
        const target = pickCarryTarget(c, chain.visited);
        if (!target) return;
        chain.visited.add(target.id);
        const damage = resolveCarryDamage(c, carry.hitElement, target, chain.remaining);
        const dealt = c.deps.applyDamageToEnemyResource(target, Math.max(1, damage));
        recordCarryHit(c, carry, chain, target, dealt);
        advanceCarry(chain, target, dealt);
    }
}

function pickCarryTarget(c, visited) {
    return (c.owner.enemies || []).find(enemy => enemy && enemy.hp > 0 && !visited.has(enemy.id)
        && (!c.pStats.sSkill.pierceOverkillCarry || !c.originalPierceTargets.has(enemy)));
}

function resolveCarryDamage(c, element, target, remaining) {
    const zone = c.deps.getZone(c.owner.currentZoneId);
    const resistance = c.deps.getEffectiveEnemyMitigation(element, zone.tier, target, c.pStats);
    let damage = Math.floor(remaining * (1 - resistance / 100) * c.deps.mutationHitScale(target, element));
    if ((c.pStats.sSkill.tags || []).includes('projectile')) damage = Math.floor(damage * (target.projectileDamageTakenMul || 1));
    if (element === 'phys') damage = Math.floor(damage * (target.physicalDamageTakenMul || 1));
    return damage;
}

function recordCarryHit(c, carry, chain, target, dealt) {
    c.deps.maybeUnlockChaosRealmFromWoodsman(target);
    target.recentHitsTaken = (target.recentHitsTaken || 0) + 1;
    target.recentHitsTimer = 1.8;
    c.totalLeechableDamage += dealt * (target && target.leechEffMul !== undefined ? target.leechEffMul : 1);
    c.hits.push(dealt);
    c.deps.notePlayerHitSummary(c.hitSummary, target, dealt);
    c.deps.addBattleFx('hit', {
        enemyId: target.id, color: c.deps.getElementColor(carry.hitElement), crit: carry.hitCrit,
        projectile: true, chain: true, stageKind: 'chainJump', chainFromEnemyId: chain.source && chain.source.id,
        skillName: c.skillName, damage: dealt, duration: 320, element: carry.hitElement, syncToSwing: true
    });
    c.deps.applyEnemyAilmentFromHit(target, { ...c.pStats, sSkill: { ...c.pStats.sSkill, ele: carry.hitElement } }, chain.remaining, carry.hitCrit, {
        ailmentSourceDamage: chain.ailment, critDotBonusPct: carry.hitCrit ? 50 : 0
    });
}

function advanceCarry(chain, target, dealt) {
    if (target.hp <= 0) {
        const previous = chain.remaining;
        chain.remaining = Math.max(0, Math.floor((chain.remaining - dealt) * 0.8));
        const ratio = previous > 0 ? chain.remaining / previous : 0;
        chain.ailment = Math.max(0, Math.floor(chain.ailment * ratio));
    } else {
        chain.remaining = 0;
        chain.ailment = 0;
    }
    chain.source = target;
}
