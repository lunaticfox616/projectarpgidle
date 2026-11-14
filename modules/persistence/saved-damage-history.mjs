import { clampFiniteNumber } from './saved-number.mjs';

export function normalizeDeathDamageSummaryRows(deps, rows) {
    let damageSummary = Array.isArray(rows) ? rows.map(entry => {
        if (!entry || typeof entry !== 'object') return null;
        let ele = (0, deps.normalizeDamageElementKey)(entry.ele);
        let value = Math.max(0, Math.floor(clampFiniteNumber(entry.value, entry.amount, 0)));
        return { ele: ele, value: value };
    }).filter(Boolean) : [];
    let totals = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0, other: 0 };
    damageSummary.forEach(entry => {
        totals[entry.ele] += Math.max(0, Math.floor(entry.value || 0));
    });
    return Object.keys(totals)
        .map(ele => ({ ele: ele, value: totals[ele] }))
        .filter(entry => entry.value > 0)
        .sort((a, b) => b.value - a.value);
}

export function normalizeDeathMonsterSummaryRows(deps, rows) {
    return Array.isArray(rows) ? rows.map(row => {
        if (!row || typeof row !== 'object') return null;
        let byElement = {};
        ['phys', 'fire', 'cold', 'light', 'chaos', 'other'].forEach(ele => {
            let value = Math.max(0, Math.floor(clampFiniteNumber(row.byElement && row.byElement[ele], 0, 0)));
            if (value > 0) byElement[ele] = value;
        });
        return {
            sourceId: typeof row.sourceId === 'string' || Number.isFinite(row.sourceId) ? row.sourceId : null,
            name: typeof row.name === 'string' && row.name ? row.name : '알 수 없는 몬스터',
            value: Math.max(0, Math.floor(clampFiniteNumber(row.value, 0, 0))),
            byElement: byElement,
            primaryElement: (0, deps.normalizeDamageElementKey)(row.primaryElement)
        };
    }).filter(row => row && row.value > 0).sort((a, b) => b.value - a.value) : [];
}

/** {frontierZoneId: story act id 1-9, level: positive integer} or null for anything else. */
export function normalizeActRetreat(deps, value) {
    if (!value || typeof value !== 'object') return null;
    const zone = (0, deps.getZone)(value.frontierZoneId);
    const level = Math.floor(Number(value.level));
    if (zone?.type !== 'act' || !(zone.id > 0) || !Number.isFinite(level) || level < 1) return null;
    return { frontierZoneId: zone.id, level };
}

/** 사망 기록의 전투 전체 피해(걸린 초, 속성별, 상태이상, 몬스터별). 없던 예전 기록은 null. */
export function normalizeDeathFight(deps, fight) {
    if (!fight || typeof fight !== 'object') return null;
    return {
        seconds: Math.max(1, Math.round(clampFiniteNumber(fight.seconds, 1, 1, 86400))),
        damageSummary: normalizeDeathDamageSummaryRows(deps, fight.damageSummary),
        ailmentDamageSummary: normalizeDeathDamageSummaryRows(deps, fight.ailmentDamageSummary),
        monsterSummary: normalizeDeathMonsterSummaryRows(deps, fight.monsterSummary)
    };
}

export function normalizeDeathLog(deps, log) {
    if (!log || typeof log !== 'object') return null;
    let primaryElement = (0, deps.normalizeDamageElementKey)(log.primaryElement);
    let damageSummary = normalizeDeathDamageSummaryRows(deps, log.damageSummary);
    let ailmentDamageSummary = normalizeDeathDamageSummaryRows(deps, log.ailmentDamageSummary);
    let monsterSummary = normalizeDeathMonsterSummaryRows(deps, log.monsterSummary);
    let activeAilments = Array.isArray(log.activeAilments) ? log.activeAilments.map(row => {
        if (!row || typeof row !== 'object') return null;
        let type = typeof row.type === 'string' && row.type ? row.type : 'unknown';
        return {
            type: type,
            label: typeof row.label === 'string' && row.label ? row.label : (0, deps.getAilmentDisplayLabel)(type),
            time: Math.max(0, Math.ceil(clampFiniteNumber(row.time, 0, 0, 30))),
            power: Math.max(0, clampFiniteNumber(row.power, 0, 0, 1.5)),
            sourceHitDamage: Math.max(0, Math.floor(clampFiniteNumber(row.sourceHitDamage || row.hitDamage, 0, 0))),
            sourceEnemyName: typeof row.sourceEnemyName === 'string' ? row.sourceEnemyName : ''
        };
    }).filter(Boolean) : [];
    return {
        primaryElement: primaryElement,
        fatalElement: Object.keys(deps.DAMAGE_ELEMENT_LABELS).find(ele => ele === log.fatalElement) ?? null,
        reasonText: typeof log.reasonText === 'string' && log.reasonText.trim() ? log.reasonText : (deps.DEATH_REASON_TEXT[primaryElement] || deps.DEATH_REASON_TEXT.phys),
        expLost: Math.max(0, Math.floor(clampFiniteNumber(log.expLost, 0, 0))),
        damageSummary: damageSummary,
        ailmentDamageSummary: ailmentDamageSummary,
        monsterSummary: monsterSummary,
        activeAilments: activeAilments,
        sourceName: typeof log.sourceName === 'string' ? log.sourceName : '',
        lostItems: Math.max(0, Math.floor(clampFiniteNumber(log.lostItems, 0, 0))),
        lostCurrencies: Math.max(0, Math.floor(clampFiniteNumber(log.lostCurrencies, 0, 0))),
        retreatZoneName: typeof log.retreatZoneName === 'string' ? log.retreatZoneName : '',
        maxLife: Math.max(0, Math.floor(clampFiniteNumber(log.maxLife, 0, 0))),
        fight: normalizeDeathFight(deps, log.fight),
        at: clampFiniteNumber(log.at, Date.now(), 0)
    };
}
