export function upgradeEffect(runtime, series, rank) {
    const spec = runtime.deps.CONTENT_UNLOCK_SERIES.find(row => row.series === series);
    if (series === 'offlineHours') return (0, runtime.deps._t)('{value}시간', { value: runtime.deps.OFFLINE_PROGRESS_RECOGNITION_HOURS[rank] });
    if (series === 'offlineRate') return `${Math.round(runtime.deps.OFFLINE_PROGRESS_EFFICIENCY_RATES[rank] * 100)}%`;
    if (series === 'bagPage') return (0, runtime.deps._t)('{value}페이지', { value: 1 + rank });
    if (series === 'stumpSeal') return (0, runtime.deps._t)('{rank}칸', { rank });
    if (series === 'stumpQuality') return `${130 + rank * 10}%`;
    if (series === 'stumpNurseryRate') return `${Math.round((runtime.deps.STUMP_BOX_NURSERY.rate + rank * runtime.deps.STUMP_BOX_NURSERY.ratePerRank) * 100)}%`;
    return `+${rank * spec.storage}`;
}

export function gainOf(runtime, def) {
    if (!def.series) return (0, runtime.deps._t)(def.gain || '');
    const after = upgradeEffect(runtime, def.series, def.rank);
    if (def.series === 'stumpSeal') return (0, runtime.deps._t)('봉인 칸 {after}', { after });
    if (def.series === 'stumpQuality') return def.rank > 1 ? (0, runtime.deps._t)('품질 상한 {after}, 접붙이기 {value}단계', { after, value: def.rank + 4 }) : (0, runtime.deps._t)('품질 상한 {after}', { after });
    if (def.series === 'stumpStorage') return (0, runtime.deps._t)('보관함 {after}칸', { after });
    return `${upgradeEffect(runtime, def.series, def.rank - 1)} → ${after}`;
}

export function cardGain(runtime, def) { return gainOf(runtime, def) || (def.cost ? '' : (0, runtime.deps._t)('자동')); }

export function view_cardName(runtime, def) { return (0, runtime.deps._t)(def.rail ? runtime.deps.CONTENT_UNLOCK_RAILS.find(row => row.rail === def.rail).name : def.name); }
