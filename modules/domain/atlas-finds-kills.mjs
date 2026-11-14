import { atlasFindGrantMemoryLeaf } from './atlas-finds-memory.mjs';
import { atlasFindBurstTreasure, atlasFindGrantBossReward } from './atlas-finds-treasure.mjs';
import { atlasFindGrantOmenDrop } from './atlas-finds-drops.mjs';

/** Every kill in an atlas map: the map omen's drops, a memory leaf now and then, and the treasure when the carrier falls. */
export function* atlasFindOnAtlasKill(env, owner, zone, enemy) {
    if (!zone || zone.type !== 'atlasMap') return;
    for (const drop of env.deps.lootOmens.killDrops(zone, enemy, owner, Math.random)) (yield* atlasFindGrantOmenDrop(env, owner, enemy, zone, drop));
    for (const drop of env.deps.lootOmens.strayDrops(zone, enemy, owner, Math.random)) (yield* atlasFindGrantOmenDrop(env, owner, enemy, zone, drop));
    const leaf = env.deps.memoryLeaves.rollKill(owner, zone, enemy, Math.random);
    if (leaf) (yield* atlasFindGrantMemoryLeaf(env, owner, enemy, leaf));
    if (enemy.treasureCarrier) (yield* atlasFindBurstTreasure(env, owner, enemy, zone));
    if (enemy.isBoss && env.MAP_BOSS_KINDS.has(zone.atlasKind) && !zone.memoryTier) (yield* atlasFindGrantBossReward(env, enemy, zone));
}
