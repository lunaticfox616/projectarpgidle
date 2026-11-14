import { atlasCoreReachable, atlasCoreEffectiveTier, atlasCoreCompleted } from './atlas-graph.mjs';

/** The highest reachable map tier at or below `tier`, a random node of it (guardians drop by their own rule). Seeds lift
 * every node, so below the lowest reachable tier the drop takes that lowest tier (the way back in never comes up empty). */
export function atlasCoreNodeForTier(env, state, tier, random) {
    const open = env.MAP_NODES.filter(node => atlasCoreReachable(env, state, node.id));
    if (!open.length) return null;
    const tiers = open.map(node => atlasCoreEffectiveTier(env, state, node)), wanted = Math.min(env.deps.ATLAS.tierCap, Math.max(1, tier));
    const below = tiers.filter(t => t <= wanted), target = below.length ? Math.max(...below) : Math.min(...tiers);
    const pool = open.filter((node, i) => tiers[i] === target);
    return pool[Math.floor(random() * pool.length)];
}

export function atlasCoreRollMap(env, state, tier, random, bonus) {
    const node = atlasCoreNodeForTier(env, state, tier, random);
    if (!node) return null;
    const drops = env.deps.ATLAS.drops, roll = random(), better = 1 + bonus.mapRarity / 100;
    const rarity = roll < drops.rare * better ? 'rare' : (roll < (drops.rare + drops.magic) * better ? 'magic' : 'normal');
    return atlasCoreStamp(env, state, env.deps.atlasMaps.create(node.id, atlasCoreEffectiveTier(env, state, node), rarity, random), random, bonus);
}

/** A dropped or starter map stone: quality now and then, its uid, and on a map node its omen (js/loot-omens.js). */
export function atlasCoreStamp(env, state, map, random, bonus) {
    if (random() < env.deps.ATLAS.drops.qualityChance + bonus.mapQuality / 100) map.quality = 1 + Math.floor(random() * env.deps.ATLAS.drops.quality);
    if (env.BY_ID.get(map.node)?.kind === 'map') map.omen = env.deps.lootOmens.roll(state, random);
    map.uid = state.atlas.nextUid++;
    return map;
}

/** A boss of a 13+ map (its tier: seeds and corruption count) in a region whose guardian is open sometimes drops that
 * guardian's map. */
export function atlasCoreGuardianDrop(env, state, map, random, bonus) {
    const node = env.BY_ID.get(map.node), guardian = env.BY_ID.get(`${node.region}_g`), rules = env.deps.ATLAS.guardianRules;
    if (node.kind !== 'map' || map.tier < rules.minTier || !atlasCoreReachable(env, state, guardian.id)) return [];
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
