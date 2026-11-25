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
    if (enemy.isBoss && atlasFindBossRewardAtKill(env, zone, enemy)) (yield* atlasFindGrantBossReward(env, enemy, zone));
}

/** 지도와 수호자의 보스는 처치 때 보상을 떨어뜨린다. 기억 싸움은 아니고, 천문도 일반 지도의 제 보스 보상은 첫 장비 상자로 완료 때
 * 열린다(atlas-run-spoils, 결과 카드의 장비 상자 칸). 보스 방의 불청객(난입 보스, 하나 더 선 보스, combat/room-invader-bodies)은 그 지도의
 * 보스가 아니라 장비 상자가 대신하지 않으므로 처치 때 떨어뜨린다. */
export function atlasFindBossRewardAtKill(env, zone, enemy) {
    if (!env.MAP_BOSS_KINDS.has(zone.atlasKind) || zone.memoryTier) return false;
    return !zone.atlasGearBoxes || !!(enemy.roomInvader || enemy.uninvited || enemy.bossTwin);
}
