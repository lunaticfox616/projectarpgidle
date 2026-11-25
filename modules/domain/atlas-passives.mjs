/** 아틀라스 패시브 (천문도 표 passive, 개편 2026-11-24 B): 태양, 세계수, 달의 별 24개와 이음 37개. 별 하나에 1점, 시작 별 셋은 바로,
 * 다른 별은 이어진 별 하나가 할당돼 있으면 할당한다. 회수는 무료이고 남은 별이 할당된 시작 별에 이어져 있어야 한다. 열린 지도가 있는 동안은
 * 바꾸지 않는다. 포인트는 천문도 일반 지도의 첫 완료가 지난 이정표(최대 18)와 시대 재생 특전 오래된 수액(합해서 18까지).
 * 별의 효과는 그 별의 side와 같은 천문도 일반 지도에만 닿는다: 지도를 열 때 terms(state, side)를 런에 고정한다(js/atlas.js).
 */
import { atlasStarFirstClears, atlasStarPoints, atlasStarAvailable, atlasStarNextMilestone, atlasStarReason, atlasStarAllocate, atlasStarRefundReason, atlasStarRefund, atlasStarStatus, atlasStarTerms, atlasStarNormalize, atlasStarNormalizeTerms } from './atlas-passives-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createAtlasPassives(deps) {
    const chart = deps.ATLAS.starChart, passive = chart.passive, env = { deps };
    env.STARS = new Map(passive.stars.map(star => [star.id, star]));
    env.NEIGHBOURS = new Map(passive.stars.map(star => [star.id, new Set()]));
    for (const [a, b] of passive.links) { env.NEIGHBOURS.get(a).add(b); env.NEIGHBOURS.get(b).add(a); }
    env.STARTS = new Set(passive.starts);
    env.MILESTONES = passive.milestones;
    env.MAX = passive.maximumPoints;
    env.MAP_IDS = new Set(chart.maps.map(map => map.id));
    env.KEYS = Object.freeze([...new Set(passive.stars.flatMap(star => Object.keys(star.bonuses)))]);
    return Object.freeze({ stars: env.STARS, links: passive.links, branches: passive.branches, maximum: env.MAX,
        firstClears: state => atlasStarFirstClears(env, state), points: state => atlasStarPoints(env, state),
        available: state => atlasStarAvailable(env, state), nextMilestone: state => atlasStarNextMilestone(env, state),
        reason: (state, id) => atlasStarReason(env, state, id), allocate: (state, id) => atlasStarAllocate(env, state, id),
        refundReason: (state, id) => atlasStarRefundReason(env, state, id), refund: (state, id) => atlasStarRefund(env, state, id),
        status: (state, id) => atlasStarStatus(env, state, id), terms: (state, side) => atlasStarTerms(env, state, side),
        normalize: (raw, state) => atlasStarNormalize(env, raw, state), normalizeTerms: raw => atlasStarNormalizeTerms(env, raw) });
}
