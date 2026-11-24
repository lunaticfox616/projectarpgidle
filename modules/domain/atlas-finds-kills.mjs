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
    if (enemy.isBoss && atlasFindBossRewardAtKill(env, zone)) (yield* atlasFindGrantBossReward(env, enemy, zone));
}

/** 지도와 수호자의 보스는 처치 때 보상을 떨어뜨린다. 기억 싸움은 아니고, 천문도 일반 지도의 보스 보상은 첫 장비 상자로 완료 때
 * 열린다(atlas-run-spoils, 결과 카드의 장비 상자 칸). */
export function atlasFindBossRewardAtKill(env, zone) { return env.MAP_BOSS_KINDS.has(zone.atlasKind) && !zone.memoryTier && !zone.atlasGearBoxes; }
