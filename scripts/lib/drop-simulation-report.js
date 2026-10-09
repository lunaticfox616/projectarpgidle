// 드랍 시뮬레이터 집계(scripts/lib/drop-simulation.js의 지도 줄 → 종류 · 판마다 수 · 판 사이 겹침 · 발견의 순간). 화면과 명령줄이 같이 쓴다.
'use strict';

/** A drop's kind key: what a player would call "the same thing again" (a currency, an equipment rarity, one unique, …). */
function dropKinds(map) {
    const kinds = [];
    for (const drop of map.drops) {
        if (drop.kind === 'equipment') {
            kinds.push(drop.rarity === 'unique' ? `unique:${drop.name}` : `equipment:${drop.rarity}`);
            if (drop.corrupted) kinds.push('equipment:corrupted');
            if (drop.exceptional) kinds.push('equipment:exceptional');
            if (drop.socket) kinds.push('equipment:socket');
        } else if (drop.kind === 'gem') kinds.push(`gem:${drop.gemKind}${drop.awakened ? ':awakened' : ''}`);
        else kinds.push(`${drop.kind}:${drop.name || drop.currency || drop.rarity || ''}`);
    }
    for (const key of Object.keys(map.currencies)) kinds.push(`currency:${key}`);
    for (const entry of map.maps) kinds.push(`map:${entry.rarity}`);
    for (const id of Object.keys(map.fragments)) kinds.push(`fragment:${id}`);
    for (const id of Object.keys((map.leaves && map.leaves.gained) || {})) kinds.push(`leaf:${id}`);
    return [...new Set(kinds)];
}

/** Jaccard overlap of two kind sets (1 = the same things again, 0 = nothing in common). */
function overlap(a, b) {
    const left = new Set(a), right = new Set(b);
    const shared = [...left].filter(kind => right.has(kind)).length, union = new Set([...left, ...right]).size;
    return union ? shared / union : 1;
}

const mean = values => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

/** @returns per-map averages, variety and the moments worth a second look (drops with a `moment` tier from the game). */
function summarize(result) {
    const maps = result.maps, kinds = maps.map(dropKinds);
    const overlaps = kinds.slice(1).map((set, i) => overlap(kinds[i], set));
    const totals = {}, currencies = {}, moments = { good: 0, great: 0, jackpot: 0 }, firstSeen = new Map();
    maps.forEach((map, index) => {
        for (const drop of map.drops) {
            const key = drop.kind === 'equipment' ? `equipment:${drop.rarity}` : drop.kind;
            totals[key] = (totals[key] || 0) + 1;
            if (drop.moment) moments[drop.moment]++;
        }
        for (const tier of Object.keys(moments)) moments[tier] += (map.currencyMoments || {})[tier] || 0;
        // 보물 무리는 큰 발견, 황금 보물은 대박(그 안의 대박 재화나 체이싱 고유는 위에서 따로 센다).
        moments.great += (map.counts.treasure || 0) - (map.counts.golden || 0) + (map.leaves ? map.leaves.first.length + map.leaves.filled.length : 0);
        moments.jackpot += map.counts.golden || 0;
        for (const [key, gain] of Object.entries(map.currencies)) currencies[key] = (currencies[key] || 0) + gain;
        for (const kind of kinds[index]) if (!firstSeen.has(kind)) firstSeen.set(kind, index + 1);
    });
    const per = value => value / Math.max(1, maps.length);
    return {
        maps: maps.length,
        kindsPerMap: mean(kinds.map(set => set.length)),
        distinctKinds: firstSeen.size,
        overlapNext: mean(overlaps),
        dropsPerMap: per(maps.reduce((sum, map) => sum + map.drops.length, 0)),
        currencyKindsPerMap: mean(maps.map(map => Object.keys(map.currencies).length)),
        momentsPerMap: { good: per(moments.good), great: per(moments.great), jackpot: per(moments.jackpot) },
        treasurePerMap: per(maps.reduce((sum, map) => sum + (map.counts.treasure || 0), 0)),
        leavesPerMap: per(maps.reduce((sum, map) => sum + Object.values((map.leaves && map.leaves.gained) || {}).reduce((a, b) => a + b, 0), 0)),
        leafSeen: new Set(maps.flatMap(map => (map.leaves && map.leaves.first) || [])).size,
        kills: { regular: per(maps.reduce((s, m) => s + m.counts.regular, 0)), elite: per(maps.reduce((s, m) => s + m.counts.elite, 0)),
            objects: per(maps.reduce((s, m) => s + m.counts.objects, 0)) },
        totals: Object.fromEntries(Object.entries(totals).map(([key, count]) => [key, per(count)])),
        currencies: Object.fromEntries(Object.entries(currencies).sort((a, b) => b[1] - a[1]).map(([key, count]) => [key, per(count)])),
        firstSeen: [...firstSeen.entries()].map(([kind, map]) => ({ kind, map }))
    };
}

module.exports = { dropKinds, overlap, summarize };
