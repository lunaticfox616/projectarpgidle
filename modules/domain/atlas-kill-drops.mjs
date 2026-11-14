import { atlasCoreLockReason } from './atlas-access.mjs';
import { atlasCoreRollMap, atlasCoreGuardianDrop, atlasCorePreferredDrops, atlasCoreNodeForTier, atlasCoreStamp } from './atlas-map-drops.mjs';
import { atlasCoreBonusOf } from './atlas-bonuses.mjs';
import { atlasCoreStore } from './atlas-inventory.mjs';
import { atlasCoreBestTier, atlasCoreEffectiveTier } from './atlas-graph.mjs';

// ---------------------------------------------------------------- drops
export function atlasCoreIsBoardRun(state) { return !!state.atlas.run?.board; }

export function atlasCoreDropTier(env, tier, random, bonus) {
    const drops = env.deps.ATLAS.drops, roll = random(), up = drops.tierUp + bonus.mapTierUp / 100;
    if (roll < up) return tier + 1;
    return roll < up + drops.tierSame ? tier : tier - 1 - Math.floor(random() * 3);
}

/** A kill in a map: elites and bosses drop more, item quantity and the sustain passives count; drops wait in the run until the
 * boss falls. Outside the atlas, bosses of chaos 20 and deeper sometimes drop a low map straight to the stash (the way back in). */
export function atlasCoreDropFromKill(env, state, zone, enemy, random = Math.random) {
    if (atlasCoreIsBoardRun(state)) return [];
    if (!zone || !enemy || atlasCoreLockReason(env, state)) return [];
    if (zone.type === 'atlasMap' && state.atlas.run) return atlasCoreDropInMap(env, state, zone, enemy, random);
    return atlasCoreDropOutside(env, state, zone, enemy, random);
}

export function atlasCoreDropOutside(env, state, zone, enemy, random) {
    const drops = env.deps.ATLAS.drops;
    if (zone.type !== 'abyss' || !enemy.isBoss || !(zone.depth >= drops.outsideDepth) || random() >= drops.outsideBoss) return [];
    const map = atlasCoreRollMap(env, state, 1 + Math.floor(random() * drops.outsideTier), random, atlasCoreBonusOf(env, state));
    return map && atlasCoreStore(env, state, [map]) ? [map] : [];
}

export function atlasCoreDropInMap(env, state, zone, enemy, random) {
    const run = state.atlas.run, drops = env.deps.ATLAS.drops, bonus = run.bonus;
    const base = enemy.isBoss ? 1 : (enemy.isElite ? drops.elite : drops.regular);
    const chance = base * (1 + zone.atlasLootQuantity / 100) * (1 + bonus.mapDrop / 100);
    const extra = Number(!!enemy.isBoss && random() < drops.bossExtra + bonus.bossMap / 100);
    const count = Math.floor(chance) + Number(random() < chance % 1) + extra;
    const maps = Array.from({ length: count }, () => atlasCoreRollMap(env, state, atlasCoreDropTier(env, run.map.tier, random, bonus), random, bonus)).filter(Boolean);
    if (enemy.isBoss) maps.push(...atlasCoreGuardianDrop(env, state, run.map, random, bonus));
    if (maps.length) run.drops = atlasCorePreferredDrops(env, state, [...run.drops, ...maps], env.deps.ATLAS.stashCap);
    return maps;
}

/** Knitting map stones: `count` of `rarity` on the best node at or under the best tier + tierUp,
 * stamped like drops (omen, quality). @returns {object[]} the ones the stash took */
export function atlasCoreRewardMaps(env, state, rule, random = Math.random) {
    const bonus = atlasCoreBonusOf(env, state), tier = Math.min(env.deps.ATLAS.tierCap, Math.max(1, atlasCoreBestTier(env, state)) + (rule.tierUp || 0));
    const maps = Array.from({ length: rule.count }, () => {
        const node = atlasCoreNodeForTier(env, state, tier, random);
        return node && atlasCoreStamp(env, state, env.deps.atlasMaps.create(node.id, atlasCoreEffectiveTier(env, state, node), rule.rarity, random), random, bonus);
    }).filter(Boolean);
    return maps.slice(0, atlasCoreStore(env, state, maps));
}

/** One more map for the run (an emptied content room's find). */
export function atlasCoreExtraMap(env, state, random = Math.random) {
    const run = state.atlas.run, map = run && atlasCoreRollMap(env, state, run.map.tier, random, run.bonus);
    if (map && run.drops.length < env.deps.ATLAS.stashCap) run.drops.push(map);
    return map ? [map] : [];
}

/** A fragment drops and shows from its loop: its own minLoop, else its content room's (data/atlas.js fragments, encounters). */
export function atlasCoreFragmentOpen(env, fragment, loop, owner) {
    const room = fragment.encounter ? env.deps.ATLAS.encounters[fragment.encounter] : null;
    if (room && room.unlock && !env.deps.contentProgression.holds(room.unlock, owner, Number(loop) || 1)) return false;
    return (Number(loop) || 1) >= Math.max(fragment.minLoop || 0, (room && room.minLoop) || 0);
}

/** Elites and bosses in a map sometimes drop a fragment (one open this loop); like maps it waits in the run until the boss falls. */
export function atlasCoreFragmentFromKill(env, state, zone, enemy, random = Math.random) {
    if (atlasCoreIsBoardRun(state)) return [];
    const run = state.atlas.run, rules = env.deps.ATLAS.fragmentRules;
    if (!run || !zone || zone.type !== 'atlasMap' || run.found.length >= rules.held) return [];
    const base = enemy.isBoss ? rules.boss : (enemy.isElite ? rules.elite : 0);
    if (random() >= base * (1 + run.bonus.fragmentDrop / 100)) return [];
    const pool = env.deps.ATLAS.fragments.filter(fragment => atlasCoreFragmentOpen(env, fragment, state.season, state));
    const id = pool[Math.floor(random() * pool.length)].id;
    run.found.push(id);
    return [id];
}
