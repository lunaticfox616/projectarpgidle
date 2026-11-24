import { atlasCoreReachable, atlasCoreEffectiveTier, atlasCoreMapGameTier, atlasCoreCompleted } from './atlas-graph.mjs';

/** The highest reachable chart tier at or below `tier`, a random map of it. Before 시작 육분의 is activated no map is open: a stone
 * earned then (the loop's starter stones, a chaos boss's drop) is one of the four entry maps, used once the sextant is on. */
export function atlasCoreNodeForTier(env, state, tier, random) {
    const reached = env.MAP_NODES.filter(node => atlasCoreReachable(env, state, node.id));
    const open = reached.length ? reached : env.MAP_NODES.filter(node => node.parent === 'entry');
    const tiers = open.map(node => node.tier), wanted = Math.min(env.CHART_TIERS, Math.max(1, tier));
    const below = tiers.filter(t => t <= wanted), target = below.length ? Math.max(...below) : Math.min(...tiers);
    const pool = open.filter((node, i) => tiers[i] === target);
    return pool[Math.floor(random() * pool.length)];
}

export function atlasCoreRollMap(env, state, tier, random, bonus) {
    const node = atlasCoreNodeForTier(env, state, tier, random);
    if (!node) return null;
    const drops = env.deps.ATLAS.drops, roll = random(), better = 1 + bonus.mapRarity / 100;
    const rarity = roll < drops.rare * better ? 'rare' : (roll < (drops.rare + drops.magic) * better ? 'magic' : 'normal');
    return atlasCoreStamp(env, state, env.deps.atlasMaps.create(node.id, node.tier, rarity, random), random, bonus);
}

/** A dropped or starter map stone: quality now and then, its uid, and on a map node its omen (js/loot-omens.js). */
export function atlasCoreStamp(env, state, map, random, bonus) {
    if (random() < env.deps.ATLAS.drops.qualityChance + bonus.mapQuality / 100) map.quality = 1 + Math.floor(random() * env.deps.ATLAS.drops.quality);
    if (env.BY_ID.get(map.node)?.kind === 'map') map.omen = env.deps.lootOmens.roll(state, random);
    map.uid = state.atlas.nextUid++;
    return map;
}

/** 주는 지도석(시작 육분의, 첫 완료로 새로 열린 지도, 포털 환급): 그 지도를 가리키는 일반 지도석, 품질 없음, 기운은 떨어진 지도석처럼 붙는다. */
export function atlasCoreGrantStone(env, state, nodeId, tier, random) {
    const map = env.deps.atlasMaps.create(nodeId, tier, 'normal', random);
    return Object.assign(map, { omen: env.deps.lootOmens.roll(state, random), uid: state.atlas.nextUid++ });
}

/** A boss of a map whose fight tier is 13+ (seeds and corruption count) in a region whose old guardian is open sometimes drops
 * that guardian's map. The old guardians are closed until stage C, so nothing drops now. */
export function atlasCoreGuardianDrop(env, state, map, random, bonus) {
    const node = env.BY_ID.get(map.node), guardian = env.BY_ID.get(`${node.region}_g`), rules = env.deps.ATLAS.guardianRules;
    if (node.kind !== 'map' || atlasCoreMapGameTier(env, state, map) < rules.minTier || !atlasCoreReachable(env, state, guardian.id)) return [];
    if (random() >= rules.dropChance * (1 + bonus.bossMap / 100)) return [];
    return [atlasCoreStamp(env, state, env.deps.atlasMaps.create(guardian.id, atlasCoreEffectiveTier(env, state, guardian), 'normal', random), random, bonus)];
}

/** Only newly earned maps compete for room. Preserve unfinished guardian access before repeat guardians and ordinary maps. */
export function atlasCorePreferredDrops(env, state, maps, room) {
    if (room <= 0) return [];
    if (maps.length <= room) return maps.slice();
    const priority = map => env.BY_ID.get(map.node)?.kind === 'guardian' ? Number(atlasCoreCompleted(state, map.node)) : 2;
    return [...maps].sort((a, b) => priority(a) - priority(b)).slice(0, room);
}
