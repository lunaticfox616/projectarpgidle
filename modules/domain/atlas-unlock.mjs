import { atlasCoreOpensNow } from './atlas-access.mjs';
import { atlasCoreBonusOf } from './atlas-bonuses.mjs';
import { atlasCoreBestTier } from './atlas-graph.mjs';
import { atlasCoreStore } from './atlas-inventory.mjs';
import { atlasCoreRollMap } from './atlas-map-drops.mjs';

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
