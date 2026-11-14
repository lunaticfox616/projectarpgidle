import { itemFlowGetBaseUpgradeCandidates } from './item-base-candidates.mjs';

export function itemFlowBuildBaseChainInfoCache(env) {
    env._baseChainInfoCache = {};
    let pool = env.deps.BASE_ITEM_DB.filter(b => b && b.id && !b.dropOnly && !b.realmBase);
    let succ = {};
    let preds = {};
    pool.forEach(b => { preds[b.id] = []; });
    pool.forEach(b => {
        let cands = itemFlowGetBaseUpgradeCandidates(env, b);
        let next = (cands && cands.length > 0) ? cands[0] : null;
        succ[b.id] = next ? next.id : null;
        if (next && preds[next.id]) preds[next.id].push(b.id);
    });
    let upMemo = {};
    function up(id) {
        if (upMemo[id] != null) return upMemo[id];
        upMemo[id] = 1; // 사이클 가드(실제로는 reqTier가 엄격히 증가해 사이클 없음)
        let s = succ[id];
        return (upMemo[id] = s ? 1 + up(s) : 1);
    }
    let downMemo = {};
    function down(id) {
        if (downMemo[id] != null) return downMemo[id];
        downMemo[id] = 1;
        let best = 0;
        (preds[id] || []).forEach(p => { best = Math.max(best, down(p)); });
        return (downMemo[id] = best + 1);
    }
    pool.forEach(b => {
        let d = down(b.id);
        let u = up(b.id);
        env._baseChainInfoCache[b.id] = { step: d, total: d + u - 1 };
    });
}

export function itemFlowGetBaseChainInfo(env, base) {
    if (!base || !base.id) return null;
    if (!env._baseChainInfoCache) itemFlowBuildBaseChainInfoCache(env);
    return env._baseChainInfoCache[base.id] || null;
}

export function itemFlowGetBaseChainRank(info) {
    return info ? info.step - Math.max(0, info.total - 6) : 0;
}

export function itemFlowGetItemBaseChainInfo(env, item) {
    if (!item) return null;
    let base = env.deps.BASE_ITEM_DB.find(b => b && item.baseId && b.id === item.baseId)
        || env.deps.BASE_ITEM_DB.find(b => b && b.name === item.baseName && b.slot === item.slot);
    if (!base) return null;
    return itemFlowGetBaseChainInfo(env, base);
}

export function itemFlowGetBaseUpgradeCost(env, nextBase) {
    if (!nextBase) throw new Error('베이스 업그레이드 비용을 계산할 다음 베이스가 없습니다.');
    let exchange = env.deps.MARKET_EXCHANGES.find(row => row && row.from === 'formlessDew'
        && row.to === 'goldenRule' && Number(row.need) > 0 && Number(row.gain) > 0);
    if (!exchange) throw new Error('형체 없는 이슬과 황금률의 기준 교환 비율을 찾을 수 없습니다.');
    let dewPerGoldenRule = Number(exchange.need) / Number(exchange.gain);
    if (!Number.isInteger(dewPerGoldenRule)) throw new Error('베이스 업그레이드 교환 비율은 정수여야 합니다.');
    let targetTier = Math.max(1, Math.floor(Number(nextBase.reqTier) || 1));
    let totalDewValue = Math.max(10,
        Math.ceil((5 + targetTier + targetTier * targetTier * 0.5) / 5) * 5);
    let chainRank = itemFlowGetBaseChainRank(itemFlowGetBaseChainInfo(env, nextBase));
    // 6단계 체인의 맨 위, 그리고 20단계 무기(다섯 단계 체인인 플라스크 · 향로 포함)는 같은 625.
    if (chainRank >= 6 || (nextBase.slot === '무기' && targetTier >= 20)) totalDewValue = Math.max(totalDewValue, 625);
    else if (chainRank === 5) totalDewValue = Math.max(totalDewValue, 225);
    let goldenRule = Math.floor(totalDewValue / dewPerGoldenRule);
    return {
        formlessDew: totalDewValue - goldenRule * dewPerGoldenRule,
        goldenRule,
        totalDewValue,
        dewPerGoldenRule
    };
}
