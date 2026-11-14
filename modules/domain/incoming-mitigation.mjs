const CRUSADER_LIGHTNING_TAKEN_ELEMENTS = Object.freeze(['fire', 'cold', 'chaos']);

function getEnemyCritTakenMul(deps, enemy, pStats) {
    const mul = enemy.critDamageMul || deps.ENEMY_CRITICAL_DAMAGE_MULTIPLIER;
    return 1 + Math.max(0, mul - 1) * (1 - deps.clampNumber(pStats.critTakenDamageReducePct || 0, 0, 90) / 100);
}

function getEmpoweredPhysicalDamage(empowered) {
    return empowered && empowered.ele === 'phys' ? empowered.amount : 0;
}

function getEmpoweredRawDamage(empowered) {
    return empowered ? empowered.amount : 0;
}

function getEmpoweredElementRows(deps, empowered, pStats, enemy, balancedRes) {
    if (!empowered || empowered.ele === 'phys' || pStats.cosmosEqualDamageSplit) return [];
    const resOf = row => (pStats.cosmosBalanceMitigation ? balancedRes : getPlayerResistanceAfterEnemyModifiers(deps, pStats, row.ele, enemy));
    return mitigateTakenRows(splitCrusaderLightningTaken(deps, [{ ele: empowered.ele, amount: empowered.amount }]), resOf);
}

function splitCrusaderLightningTaken(deps, rows) {
    if (!deps.hasKeystone('cr4')) return rows;
    return rows.flatMap(row => {
        if (!CRUSADER_LIGHTNING_TAKEN_ELEMENTS.includes(row.ele)) return [row];
        const shift = Math.floor(row.amount * 0.3);
        return [{ ele: row.ele, amount: row.amount - shift }, { ele: 'light', amount: shift }];
    });
}

function splitHelmChaosTaken(rows, pStats) {
    if (!pStats.uniqueBleedBlockHelm) return rows;
    return rows.flatMap(row => {
        if (row.ele !== 'phys') return [row];
        const chaos = Math.floor(row.amount * 0.15);
        return [{ ele: 'phys', amount: row.amount - chaos }, { ele: 'chaos', amount: chaos }];
    });
}

function convertTakenRowsRaw(deps, rows, pStats) {
    return splitHelmChaosTaken(splitCrusaderLightningTaken(deps, rows), pStats);
}

function mitigateTakenRows(rows, resOf) {
    return rows.map(row => ({ ele: row.ele, amount: Math.max(0, Math.floor(row.amount * (1 - resOf(row) / 100))) })).filter(row => row.amount > 0);
}

function shiftPhysicalTakenAs(deps, physical, pStats, enemy) {
    const takenAs = pStats.physTakenAs || {};
    const entries = ['fire', 'cold', 'light', 'chaos'].map(ele => [ele, Math.max(0, Number(takenAs[ele]) || 0)]);
    const total = entries.reduce((sum, row) => sum + row[1], 0);
    const scale = total > 75 ? 75 / total : 1;
    const rows = [];
    let shiftedTotal = 0;
    for (const [ele, raw] of entries) {
        const pct = raw * scale;
        const shifted = Math.min(physical - shiftedTotal, Math.floor(physical * pct / 100));
        if (shifted <= 0) continue;
        shiftedTotal += shifted;
        rows.push({ ele, amount: shifted });
    }
    const resOf = row => getPlayerResistanceAfterEnemyModifiers(deps, pStats, row.ele, enemy);
    return { physical: Math.max(0, physical - shiftedTotal), rows: mitigateTakenRows(splitCrusaderLightningTaken(deps, rows), resOf) };
}

/** Preserve uncapped resistance before reduction, then cap before penetration. */
function playerResistanceBounds(pStats, suffix) {
    let finalResistance = Number((pStats && pStats[`res${suffix}`]) || 0);
    let uncappedResistance = Number.isFinite(Number(pStats && pStats[`rawRes${suffix}`]))
        ? Number(pStats[`rawRes${suffix}`])
        : finalResistance;
    let maxResistance = Number.isFinite(Number(pStats && pStats[`maxRes${suffix}`]))
        ? Number(pStats[`maxRes${suffix}`])
        : 75;
    return { uncappedResistance, maxResistance };
}

function getPlayerResistanceAfterEnemyModifiers(deps, pStats, element, enemy, effectMultiplier) {
    const suffix = { fire: 'F', cold: 'C', light: 'L', chaos: 'Chaos' }[element];
    if (!suffix) return 0;
    const { uncappedResistance, maxResistance } = playerResistanceBounds(pStats, suffix);
    const multiplier = Math.max(0, Number(effectMultiplier == null ? 1 : effectMultiplier) || 0);
    let resistanceReduction = Math.max(0, Number((enemy && enemy.resistanceReduction) || 0)) * multiplier;
    let penetration = Math.max(0, Number((enemy && enemy.penetration) || 0)) * multiplier;
    let reducedResistance = Math.min(maxResistance, uncappedResistance - resistanceReduction);
    return Math.max(deps.MIN_PENETRATED_RESISTANCE, reducedResistance - penetration);
}

function getCosmosBalancedMitigationPct(deps, pStats, enemy, physRes) {
    let resValues = ['fire', 'cold', 'light', 'chaos'].map(ele => getPlayerResistanceAfterEnemyModifiers(deps, pStats, ele, enemy));
    let total = Math.max(-60, Number(physRes) || 0) + resValues.reduce((sum, value) => sum + (Number(value) || 0), 0);
    return Math.max(-60, Math.min(90, total / 5));
}

function getCosmosEqualSplitDamageBreakdown(deps, rawDamage, pStats, enemy) {
    let total = Math.max(1, Math.floor(Number(rawDamage) || 1));
    let elements = ['phys', 'fire', 'cold', 'light', 'chaos'];
    let remaining = total, mitigationOf = {};
    let rows = elements.map((ele, idx) => {
        let portion = idx === elements.length - 1 ? remaining : Math.floor(total / elements.length);
        remaining = Math.max(0, remaining - portion);
        let mitigation = ele === 'phys'
            ? Math.max(-60, (pStats.dr || 0) + deps.getArmorPhysicalReductionPct(pStats.armor || 0, portion))
            : getPlayerResistanceAfterEnemyModifiers(deps, pStats, ele, enemy);
        mitigationOf[ele] = pStats.cosmosBalanceMitigation ? getCosmosBalancedMitigationPct(deps, pStats, enemy, mitigation) : mitigation;
        return { ele, amount: portion };
    });
    // 받는 피해 전환(cr4, 출혈 봉쇄 투구)은 나눈 몫에 저항 전에: 옮긴 몫은 새 속성 몫의 경감을 받는다.
    return mitigateTakenRows(convertTakenRowsRaw(deps, rows, pStats), row => mitigationOf[row.ele]);
}

export function createIncomingMitigation(deps) {
    return Object.freeze({
        getEnemyCritTakenMul: getEnemyCritTakenMul.bind(null, deps),
        getEmpoweredPhysicalDamage: getEmpoweredPhysicalDamage,
        getEmpoweredRawDamage: getEmpoweredRawDamage,
        getEmpoweredElementRows: getEmpoweredElementRows.bind(null, deps),
        splitCrusaderLightningTaken: splitCrusaderLightningTaken.bind(null, deps),
        splitHelmChaosTaken: splitHelmChaosTaken,
        convertTakenRowsRaw: convertTakenRowsRaw.bind(null, deps),
        mitigateTakenRows: mitigateTakenRows,
        shiftPhysicalTakenAs: shiftPhysicalTakenAs.bind(null, deps),
        getPlayerResistanceAfterEnemyModifiers: getPlayerResistanceAfterEnemyModifiers.bind(null, deps),
        getCosmosBalancedMitigationPct: getCosmosBalancedMitigationPct.bind(null, deps),
        getCosmosEqualSplitDamageBreakdown: getCosmosEqualSplitDamageBreakdown.bind(null, deps),
    });
}
