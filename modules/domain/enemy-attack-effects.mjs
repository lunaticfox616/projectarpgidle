// Enemy turn stages. Explicit tick state and dependencies; existing rounding and short-circuit order.
export function applyHitAilment(c, e, h) {
    h.ailRoll = c.deps.random();
    if (c.deps.hasKeystone('h3')) h.ailRoll = Math.max(h.ailRoll, c.deps.random());
    h.enemyAilmentChance = Math.max(0, Number(e.enemy.ailmentChance) || 0);
    if (c.pStats.passiveAshura && typeof c.deps.getPassiveAshuraAilmentChance === 'function') {
        h.enemyAilmentChance = c.deps.getPassiveAshuraAilmentChance(h.enemyAilmentChance, c.pStats.cycle);
    }
    if (h.enemyAilmentChance > 0 && h.ailRoll < h.enemyAilmentChance) {
        inflictRolledAilment(c, e, h);
    }
}

function inflictRolledAilment(c, e, h) {
    let ail = h.attackElement === 'fire' ? 'ignite' : h.attackElement === 'cold' ? 'chill'
        : h.attackElement === 'light' ? 'shock' : h.attackElement === 'phys' ? 'bleed' : 'poison';
    let hitRatio = Math.max(0.001, Math.min(0.35, h.dmg / Math.max(1, c.pStats.maxHp || 1)));
    let damageAilment = c.deps.isDamageAilmentType(ail);
    let ailPower = damageAilment
        ? 0.90
        : Math.max(0.1, Math.min(1.5, (Math.sqrt(Math.max(1, h.dmg)) * 0.01) + (hitRatio * 1.8)));
    c.deps.ailments.apply(c.owner, { type: ail, duration: e.enemy.isBoss ? 5 : 3, power: ailPower, pStats: c.pStats, sourceHitDamage: h.dmg, options: {
        ailmentSourceDamage: h.ailmentSourceDamageBeforeCrit,
        critDotBonusPct: h.enemyCritDotBonusPct,
        sourceEnemyId: e.enemy.id,
        sourceEnemyName: e.enemy.name
    } });
    noteRolledAilment(c, e, h, ail);
}

function noteRolledAilment(c, e, h, ail) {
    let ailmentLabel = c.deps._t(ail === 'ignite' ? '점화' : ail === 'chill' ? '냉각'
        : ail === 'shock' ? '감전' : ail === 'bleed' ? '출혈' : '중독');
    if (c.owner.settings.showCombatLog) c.deps.addLog(c.deps._t('☣️ 상태이상: {ailment} ({seconds}초)', { ailment: ailmentLabel, seconds: e.enemy.isBoss ? 5 : 3 }), 'attack-monster', { element:h.attackElement });
}

export function recoverBeforeHit(c, e, h) {
    c.deps.grantWarriorRageOnHit(c.deps.getCombatTime());
    c.deps.ascendancyNodeRules.storeArmorBlow(c.pStats, h.physicalPortion);
    if (typeof c.deps.getPreciseTalentRatio === 'function' && c.deps.getPreciseTalentLevel('hero5__guardian')) {
        let missingLife = Math.max(0, c.deps.getPlayerRecoveryHpCap(c.pStats) - Math.max(0, c.owner.playerHp || 0));
        let preHitRecovery = missingLife * 0.04 * c.deps.getPreciseTalentRatio('hero5__guardian');
        if (preHitRecovery > 0) {
            c.owner.playerHp = Math.min(c.deps.getPlayerRecoveryHpCap(c.pStats), c.owner.playerHp + preHitRecovery);
        }
    }
}

export function showReceivedHit(c, e, h) {
    h.topDamageEntry = h.damageBreakdown
        .filter(row => row && row.amount > 0)
        .sort((a, b) => (b.amount || 0) - (a.amount || 0))[0] || { ele: h.attackElement, amount: h.dmg };
    h.damageSource = c.deps.enemyAttackRules.damageName(e.enemy, h.bossPattern);
    h.damageBreakdown.forEach(row => c.deps.recordIncomingDamage(row.ele, row.amount, h.damageSource, {
        sourceType: 'monster', sourceId: e.enemy.id, sourceName: e.enemy.name
    }));
    c.deps.addBattleFx('playerHit', { enemyId: e.enemy.id, color: c.deps.getElementColor(h.topDamageEntry.ele), damage: h.dmg, duration: 220, deflected: h.deflected,
        targetMaxHp: c.deps.getPlayerHpCap(c.pStats) });
    if (c.owner.settings.showCombatLog && h.dmg > 0) {
        let damageLog = c.deps._t('{icon} {source}의 공격으로 {amount} 피해', { icon: c.deps.getDamageElementIcon(h.topDamageEntry.ele), source: h.damageSource, amount: c.deps.formatNumberKR(h.dmg) });
        if (c.owner.settings.showDetailedDamageLog === true) {
            let breakdownText = h.damageBreakdown
                .filter(row => row.amount > 0)
                .sort((a, b) => b.amount - a.amount)
                .map(row => `${c.deps.getDamageElementLabel(row.ele)} ${c.deps.formatNumberKR(row.amount)}`)
                .join(' / ');
            let deflectText = h.deflected ? c.deps._t(', 🪶비껴냄 -{deflectReducePct}%', { deflectReducePct: h.deflectReducePct }) : '';
            damageLog = c.deps._t('🩸 [{ele}] {damageSource}에게 피격 ({dmg} 피해, {breakdownText}{deflectText})', { ele: c.deps.getDamageElementLabel(h.topDamageEntry.ele), damageSource: h.damageSource, dmg: c.deps.formatNumberKR(h.dmg), breakdownText, deflectText });
        }
        c.deps.addLog(damageLog, "attack-monster", { element:h.topDamageEntry.ele });
    }
    if (c.owner.playerHp <= 0) {
        c.deps.lose(c.owner, c.zone, c.pStats, null, { fatalElement: h.topDamageEntry.ele, sourceName: h.damageSource });
        return 'stop';
    }
}
