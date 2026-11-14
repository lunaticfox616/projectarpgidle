

export function itemTooltipStatOrder(env, statId) {
    const key = String(statId || '').toLowerCase();
    const index = env.STAT_GROUPS.findIndex(([names, parts]) => names.includes(key) || parts.some(part => key.includes(part)));
    return index < 0 ? 99 : index + 1;
}

/** Sort comparator for explicit affixes: group order, then stat id. */
export function itemTooltipCompareStats(env, a, b) {
    const aKey = a && (a.id || a.stat), bKey = b && (b.id || b.stat);
    return itemTooltipStatOrder(env, aKey) - itemTooltipStatOrder(env, bKey) || String(aKey || '').localeCompare(String(bKey || ''));
}

export function itemTooltipDefenseTable() {
    return { armor: 0, evasion: 0, energyShield: 0 };
}

// 잠식 특수 옵션과 복합 옵션도 실제 전투 계산과 같은 방식으로 베이스 방어 수치에 반영한다.
export function itemTooltipDefenseSources(env, item) {
    const lines = (Array.isArray(item.stats) ? item.stats : []).concat(item.chaosInfusion ? [item.chaosInfusion] : [], env.deps.getImmutableItemSpecialStats(item));
    return lines.filter(Boolean).flatMap(stat => [stat].concat(Array.isArray(stat.extraStats) ? stat.extraStats : [])).filter(Boolean);
}

/** Base and final armour, evasion and energy shield: (base + flat) × (1 + %/100), floored. The base counts a unique's
 * 기본 옵션 배율 (getUniqueImplicitMultiplier) like the stat calculation. */
export function itemTooltipDefenseView(env, item) {
    const base = itemTooltipDefenseTable(), flat = itemTooltipDefenseTable(), pct = itemTooltipDefenseTable(), implicit = env.deps.getUniqueImplicitMultiplier(item);
    (Array.isArray(item.baseStats) ? item.baseStats : []).forEach(stat => { if (stat && Object.hasOwn(base, stat.id)) base[stat.id] += Number(stat.val || 0) * implicit; });
    itemTooltipDefenseSources(env, item).forEach(stat => {
        if (Object.hasOwn(flat, stat.id)) flat[stat.id] += Number(stat.val || 0);
        if (Object.hasOwn(env.DEFENSE_PCT, stat.id)) pct[env.DEFENSE_PCT[stat.id]] += Number(stat.val || 0);
    });
    const view = Object.fromEntries(env.DEFENSE_IDS.map(id => [id, Math.floor((base[id] + flat[id]) * (1 + pct[id] / 100))]));
    return { ...view, base };
}
