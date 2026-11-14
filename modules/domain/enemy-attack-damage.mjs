// Enemy turn stages. Explicit tick state and dependencies; existing rounding and short-circuit order.
function splitIncomingElements(c, e, h) {
    h.attackElement = c.deps.enemyAttackRules.element(e.enemy, h.bossPattern);
    h.physicalPortion = Math.floor(h.dmg * 0.5);
    h.elementalPortion = Math.max(0, h.dmg - h.physicalPortion);
    if (h.attackElement === 'phys') {
        h.physicalPortion = h.dmg;
        h.elementalPortion = 0;
    }
    h.empowered = c.deps.loopMutation.empoweredHit(e.enemy, h.dmg);
    h.physTaken = c.deps.shiftPhysicalTakenAs(h.physicalPortion + c.deps.getEmpoweredPhysicalDamage(h.empowered), c.pStats, e.enemy);
    h.physicalPortion = h.physTaken.physical;
    h.elementalRes = ['fire', 'cold', 'light', 'chaos'].includes(h.attackElement)
        ? c.deps.getPlayerResistanceAfterEnemyModifiers(c.pStats, h.attackElement, e.enemy)
        : 0;
    h.physRes = Math.max(-60, c.pStats.dr + c.deps.getArmorPhysicalReductionPct(c.pStats.armor, h.physicalPortion));
    if (c.pStats.cosmosBalanceMitigation) {
        let balanced = c.deps.getCosmosBalancedMitigationPct(c.pStats, e.enemy, h.physRes);
        h.physRes = balanced;
        h.elementalRes = balanced;
    }
    h.hitResOf = row => (row.ele === 'phys' ? h.physRes
        : (row.ele === h.attackElement || c.pStats.cosmosBalanceMitigation ? h.elementalRes : c.deps.getPlayerResistanceAfterEnemyModifiers(c.pStats, row.ele, e.enemy)));
    h.damageBreakdown = c.pStats.cosmosEqualDamageSplit
        ? c.deps.getCosmosEqualSplitDamageBreakdown(h.dmg + c.deps.getEmpoweredRawDamage(h.empowered), c.pStats, e.enemy)
        : c.deps.mitigateTakenRows(c.deps.convertTakenRowsRaw([{ ele: 'phys', amount: h.physicalPortion }, { ele: h.attackElement, amount: h.elementalPortion }], c.pStats), h.hitResOf);
    h.damageBreakdown = h.damageBreakdown.concat(h.physTaken.rows, c.deps.getEmpoweredElementRows(h.empowered, c.pStats, e.enemy, h.physRes));
}

function elementTakenLess(stats, element) {
    if (element === 'fire') return stats.fireTakenDamageReducePct || 0;
    if (element === 'cold') return stats.coldTakenDamageReducePct || 0;
    if (element === 'light') return stats.lightTakenDamageReducePct || 0;
    if (element === 'chaos') return (stats.chaosTakenDamageReducePct || 0) + (stats.uniqueChaosTakenDamageReducePct || 0);
    return 0;
}

function reduceElementShares(c, e, h) {
    h.damageBreakdown = h.damageBreakdown.map(row => {
        const less = elementTakenLess(c.pStats, row.ele);
        if (less > 0) return { ele: row.ele, amount: Math.max(0, Math.floor((row.amount || 0) * (1 - Math.max(0, Math.min(0.9, less / 100))))) };
        return row;
    }).filter(row => row.amount > 0);
    h.takenFlatReduce = (c.pStats && c.pStats.takenFlatReduce) || {};
    h.damageBreakdown = h.damageBreakdown.map(row => {
        if (!row || row.amount <= 0) return row;
        let elementFlatLess = Math.max(0, Number(h.takenFlatReduce[row.ele] || 0));
        if (elementFlatLess <= 0) return row;
        return { ele: row.ele, amount: Math.max(0, Math.floor((row.amount || 0) - elementFlatLess)) };
    }).filter(row => row && row.amount > 0);
}

function reduceCommonFlatDamage(c, e, h) {
    h.allFlatLess = Math.max(0, Number(h.takenFlatReduce.all || 0));
    while (h.allFlatLess > 0 && h.damageBreakdown.length > 0) {
        let targetIndex = h.damageBreakdown.reduce((largest, row, index) =>
            (row.amount || 0) > (h.damageBreakdown[largest].amount || 0) ? index : largest, 0);
        let spend = Math.min(h.allFlatLess, Math.max(0, Math.floor(h.damageBreakdown[targetIndex].amount || 0)));
        if (spend <= 0) break;
        h.damageBreakdown[targetIndex].amount = Math.max(0, Math.floor((h.damageBreakdown[targetIndex].amount || 0) - spend));
        h.allFlatLess -= spend;
        h.damageBreakdown = h.damageBreakdown.filter(row => row && row.amount > 0);
    }
}

function applyAshuraTakenElements(c, e, h) {
    if (c.pStats.passiveAshura && typeof c.deps.applyPassiveAshuraDamageBreakdown === 'function') {
        h.damageBreakdown = c.deps.applyPassiveAshuraDamageBreakdown(h.damageBreakdown, c.owner.playerAilments, c.pStats.cycle);
    }
    if (h.damageBreakdown.length === 0) h.damageBreakdown.push({ ele: h.attackElement, amount: 1 });
}

function reduceIncomingElements(c, e, h) {
    reduceElementShares(c, e, h);
    reduceCommonFlatDamage(c, e, h);
    applyAshuraTakenElements(c, e, h);
}

function prepareDamageScaling(c, e, h) {
    h.sumBreakdown = () => h.damageBreakdown.reduce((sum, row) => sum + Math.max(0, Math.floor(row.amount || 0)), 0);
    h.scaleBreakdown = (mul) => {
        h.damageBreakdown = h.damageBreakdown.map(row => ({ ele: row.ele, amount: Math.max(0, Math.floor((row.amount || 0) * mul)) })).filter(row => row.amount > 0);
        if (h.damageBreakdown.length === 0) h.damageBreakdown.push({ ele: h.attackElement, amount: 1 });
    };
    h.scaleBreakdownToTotal = (targetTotal) => {
        targetTotal = Math.max(1, Math.floor(targetTotal || 1));
        let sourceTotal = Math.max(1, h.sumBreakdown());
        let remainingTotal = targetTotal;
        h.damageBreakdown = h.damageBreakdown.map((row, idx) => {
            let amount = idx === h.damageBreakdown.length - 1
                ? remainingTotal
                : Math.max(0, Math.floor(((row.amount || 0) / sourceTotal) * targetTotal));
            remainingTotal = Math.max(0, remainingTotal - amount);
            return { ele: row.ele, amount };
        }).filter(row => row.amount > 0);
        if (h.damageBreakdown.length === 0) h.damageBreakdown.push({ ele: h.attackElement, amount: targetTotal });
        return Math.max(1, h.sumBreakdown());
    };
}

function scaleDistantHit(c, e, h) {
    h.dmg = Math.max(1, h.sumBreakdown());
    h.directHitDistanceMul = c.deps.getGridDirectHitDistanceMultiplier(e.enemy, c.owner.gridPlayer);
    h.scaleBreakdown(h.directHitDistanceMul);
    h.dmg = Math.max(1, h.sumBreakdown());
    h.playerShockTakenIncreasePct = Number(c.pStats.playerShockTakenDamageIncreasePct || 0);
    if (h.playerShockTakenIncreasePct !== 0) {
        let playerShockTakenMul = Math.max(0.1, 1 + h.playerShockTakenIncreasePct / 100);
        h.dmg = h.scaleBreakdownToTotal(Math.max(1, Math.floor(h.dmg * playerShockTakenMul)));
    }
}

function rollCriticalHit(c, e, h) {
    h.ailmentSourceDamageBeforeCrit = h.dmg;
    h.enemyCritDotBonusPct = 0;
    h.enemyCritChance = Math.max(0, (e.enemy.critChance || 0) - Math.max(0, Math.min(80, c.pStats.critResist || 0)));
    if (h.enemyCritChance > 0 && c.deps.random() < (h.enemyCritChance / 100)) {
        h.scaleBreakdown(c.deps.getEnemyCritTakenMul(e.enemy, c.pStats));
        h.dmg = Math.max(1, h.sumBreakdown());
        h.enemyCritDotBonusPct = 50;
    }
    if (e.enemy.hybridElement && c.deps.random() < 0.35) {
        let hybridRes = c.deps.getPlayerResistanceAfterEnemyModifiers(c.pStats, e.enemy.hybridElement, e.enemy, 0.7);
        let hybrid = Math.max(0, Math.floor(h.dmg * 0.32 * (1 - (hybridRes / 100))));
        if (hybrid > 0) h.damageBreakdown.push({ ele: c.deps.normalizeDamageElementKey(e.enemy.hybridElement), amount: hybrid });
        h.dmg = Math.max(1, h.sumBreakdown());
    }
}

function scaleCommonTakenHit(c, e, h) {
    h.dmg = h.scaleBreakdownToTotal(Math.max(1, Math.floor(h.dmg * c.deps.getWoodsmanCurseDamageTakenMul() * Math.max(0, Number(c.pStats.warriorTakenDamageMultiplier) || 1) * Math.max(0, Number(c.pStats.genericTakenDamageMultiplier) || 1))));
    if (e.enemy.isBoss) h.dmg = Math.max(1, Math.floor(h.dmg * Math.max(0, Number(c.pStats.bossTakenDamageMultiplier) || 1)));
    if (c.pStats.uniqueGuardianArmor) {
        let less = e.enemy.isBoss
            ? Math.max(0, Math.min(95, Number(c.pStats.uniqueGuardianArmor.bossTakenLessPct || 0)))
            : Math.max(0, Math.min(95, Number(c.pStats.uniqueGuardianArmor.takenLessPct || 0)));
        h.dmg = Math.max(1, Math.floor(h.dmg * (1 - less / 100)));
    }
}

function scalePhysicalTakenHit(c, e, h) {
    if (c.pStats.uniquePhysDrHalfTakenAsMore && h.attackElement === 'phys') {
        let ratio = Math.max(0, Number(c.pStats.uniquePhysDrHalfTakenAsMore.ratio || 0.5));
        let takenMore = Math.max(0, (Math.max(0, Number(c.pStats.dr) || 0) / 100) * ratio);
        h.dmg = Math.max(1, Math.floor(h.dmg * (1 + takenMore)));
    }
}

function scaleSituationalTakenHit(c, e, h) {
    if (c.deps.hasKeystone('g5') && c.owner.gladiatorSwiftGuardReady) {
        h.dmg = Math.max(1, Math.floor(h.dmg * Math.max(0, Number(c.pStats.swiftOpeningTakenMultiplier) || 0.70)));
        c.owner.gladiatorSwiftGuardReady = false;
    }
    h.aliveEnemies = (c.owner.enemies || []).filter(e => e && e.hp > 0).length;
    h.dmg = c.deps.applySituationalTakenReduction(h.dmg, c.pStats, e.enemy, h.aliveEnemies);
}

function scaleTakenHit(c, e, h) {
    scaleCommonTakenHit(c, e, h);
    scalePhysicalTakenHit(c, e, h);
    scaleSituationalTakenHit(c, e, h);
}

export function calculateEnemyHit(c, e, h) {
    splitIncomingElements(c, e, h);
    reduceIncomingElements(c, e, h);
    prepareDamageScaling(c, e, h);
    scaleDistantHit(c, e, h);
    rollCriticalHit(c, e, h);
    scaleTakenHit(c, e, h);
}
