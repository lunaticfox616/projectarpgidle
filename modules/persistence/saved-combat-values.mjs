/** A saved currency that is text other than a number, negative or not a number counts as none: such a value stayed and showed as
 * NaN, -7 or [object Object] (only the legacy-merged keys were cleaned). Numeric text becomes a number. */
export function normalizeSavedCurrencies(currencies) {
    for (const key of Object.keys(currencies)) {
        const raw = currencies[key], amount = Number(raw);
        currencies[key] = (typeof raw === 'number' || typeof raw === 'string') && Number.isFinite(amount) && amount > 0 ? amount : 0;
    }
}

/** Talisman curse rows per enemy (transient combat state): each a list, else dropped (coreLoop's expiry threw on every tick). */
export function normalizeConditionDebuffMap(map) {
    const rows = map && typeof map === 'object' && !Array.isArray(map) ? map : {};
    return Object.fromEntries(Object.entries(rows).filter(([, list]) => Array.isArray(list)));
}

/** A saved ailment on the hero: its clock and power, and for a damage ailment its source (the hit, a crit's DoT bonus, the score that
 * picks the stronger one, the monster that dealt it). Load kept only the first four and dropped the rest (2026-10-20 hunt: a crit
 * ignite lost its bonus for its last seconds). */
export function normalizePlayerAilmentRow(row, clampFiniteNumber) { // clampFiniteNumber: mergeDefaults's own clamp
    const time = Math.max(0, clampFiniteNumber(row.time, 0, 0, 30));
    const out = { type: row.type, time, duration: Math.max(time, clampFiniteNumber(row.duration, time, 0, 30)),
        power: Math.max(0, clampFiniteNumber(row.power, 0.1, 0, 1.5)), sourceHitDamage: Math.max(0, Math.floor(clampFiniteNumber(row.sourceHitDamage || row.hitDamage, 0, 0))) };
    if (Number.isFinite(Number(row.critDotBonusPct))) out.critDotBonusPct = Math.max(0, Number(row.critDotBonusPct));
    if (Number.isFinite(Number(row.ailmentDotScore))) out.ailmentDotScore = Math.max(0, Number(row.ailmentDotScore));
    if (row.sourceEnemyName) Object.assign(out, { sourceEnemyId: row.sourceEnemyId === undefined ? null : row.sourceEnemyId, sourceEnemyName: String(row.sourceEnemyName) });
    return out;
}

/** 변이시간선(js/loop-mutation.js): the marked loop number (else 0, so a broken one meets the rule from the next loop). */
export function normalizeLoopMutationState(merged) {
    const season = Number(merged.loopMutationSeason);
    merged.loopMutationSeason = Number.isInteger(season) && season > 0 ? season : 0;
}

// 요정의 고리 실패 잠금은 이번 루프 동안 저장에 남는다. 잠기지 않은 소켓에는 칸을 만들지 않는다.
export function voidPassiveLockField(rawEntry) {
    return rawEntry.fairyLocked ? { fairyLocked: true } : {};
}
