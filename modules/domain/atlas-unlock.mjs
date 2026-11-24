import { atlasCoreOpensNow, atlasCoreLockReason } from './atlas-access.mjs';
import { atlasCoreBonusOf } from './atlas-bonuses.mjs';
import { atlasCoreBestTier } from './atlas-graph.mjs';
import { atlasCoreStore, atlasCoreDeliver } from './atlas-inventory.mjs';
import { atlasCoreRollMap, atlasCoreGrantStone } from './atlas-map-drops.mjs';

/** Once per loop, the first look after this loop's chaos 20 clear: the atlas opens for good and a few maps start the loop. */
export function atlasCoreSync(env, state, random = Math.random) {
    if (!env.deps.hasCurrentLoopChaos20Clear(state) || !atlasCoreOpensNow(env, state)) return [];
    state.atlas.unlocked = true;
    const season = Math.max(1, Math.floor(state.season || 1));
    if (state.atlas.starterSeason === season) return [];
    state.atlas.starterSeason = season;
    const bonus = atlasCoreBonusOf(env, state), tier = Math.max(1, atlasCoreBestTier(env, state) - env.deps.ATLAS.starter.belowBest);
    const maps = Array.from({ length: env.deps.ATLAS.starter.count + bonus.starter }, () => atlasCoreRollMap(env, state, tier, random, bonus)).filter(Boolean);
    atlasCoreStore(env, state, maps);
    return maps;
}

/** 시작 육분의를 켤 수 없는 까닭('' = 켤 수 있다): 지도를 여는 관문(루프와 이번 루프의 혼돈 20)을 넘었고, 이번 시대에 아직 켜지 않았을 때.
 * 받는 지도석은 보관함 한도를 넘어도 들어온다(atlasCoreDeliver). */
export function atlasCoreSextantReason(env, state) {
    const lock = atlasCoreLockReason(env, state);
    if (lock) return lock;
    return state.atlas.sextant === true ? env.deps._t('시작 육분의는 이미 켜져 있습니다.') : '';
}

/** 시대마다 한 번(시대 재생이 되돌린다): 1등급 지도 넷이 열리고 일반 1등급 지도석을 입구 지도마다 하나씩 받는다(기운은 떨어진 지도석처럼 붙는다).
 * @returns {{reason?:string, maps?:object[]}} */
export function atlasCoreActivateSextant(env, state, random = Math.random) {
    const reason = atlasCoreSextantReason(env, state);
    if (reason) return { reason };
    const rule = env.deps.ATLAS.sextant, entries = env.MAP_NODES.filter(node => node.parent === 'entry');
    state.atlas.sextant = true;
    const maps = Array.from({ length: rule.stones }, (_, index) => atlasCoreGrantStone(env, state, entries[index % entries.length].id, rule.tier, random));
    atlasCoreDeliver(state, maps);
    return { maps };
}
