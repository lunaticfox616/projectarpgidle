/** 시대 재생 (docs/atlas-endgame-20260930.md 1 · 5절): 아틀라스 위의 환생 층. 씨앗 4개를 모으면 아틀라스 진행(완료 · 보너스 · 패시브 ·
 * 씨앗)을 되돌리고 세계수 정수를 받아 영구 특전(지도 드롭 · 수량 · 패시브 포인트 · 시작 지도석 · 각인 홈 · 루프 시작 보급)을 산다.
 * 상태는 game.atlas.epoch {count, essence, perks:{id: rank}} — 루프와 시대를 넘어 남는다.
 */
import { atlasEraRank, atlasEraReason, atlasEraEssenceFor, atlasEraRebirth, atlasEraCost, atlasEraBuyReason, atlasEraBuy, atlasEraEffects, atlasEraPoints, atlasEraOffline, atlasEraSupply, atlasEraNormalize } from './atlas-epoch-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createAtlasEpoch(deps) {
    const env = { deps };
    env.PERKS = new Map(env.deps.ATLAS.epoch.perks.map(perk => [perk.id, perk]));
    return Object.freeze({ perks: env.PERKS, rank: atlasEraRank, reason: (...args) => atlasEraReason(env, ...args), essenceFor: (...args) => atlasEraEssenceFor(env, ...args), rebirth: (...args) => atlasEraRebirth(env, ...args), cost: (...args) => atlasEraCost(env, ...args), buyReason: (...args) => atlasEraBuyReason(env, ...args), buy: (...args) => atlasEraBuy(env, ...args), effects: (...args) => atlasEraEffects(env, ...args), points: (...args) => atlasEraPoints(env, ...args), offline: (...args) => atlasEraOffline(env, ...args), supply: (...args) => atlasEraSupply(env, ...args), normalize: (...args) => atlasEraNormalize(env, ...args) });
}
