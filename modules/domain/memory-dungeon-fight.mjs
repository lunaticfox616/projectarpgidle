import { memoryArenaValidTier } from './memory-dungeon-access.mjs';

/** Boss multipliers of a memory map (1 for any other map). */
export function memoryArenaBoost(env, map) {
    const tier = map && map.memory;
    return memoryArenaValidTier(env, tier) ? { hp: env.M.fight.hpMul[tier - 1], damage: env.M.fight.damageMul[tier - 1] } : { hp: 1, damage: 1 };
}

export function memoryArenaZoneName(env, map, node) { return memoryArenaValidTier(env, map.memory) ? env.deps._t('{name}: 기억 {memory}단계', { name: node.name, memory: map.memory }) : node.name; }

/** A memory fight's boss (js/combat-encounters.js createActExplorationPack): its name says whose memory, tinted; a boss without its own special
 * (map bosses, guardians, the shadow) takes the memory special. */
export function memoryArenaTuneBoss(env, enemy, tier) {
    enemy.name = `${enemy.name}의 기억`;   // 한국어 원문으로 둔다: 보여 줄 때 옮긴다(js/i18n.js enemyName)
    enemy.bossVisualTint = env.M.fight.tint;
    if (!enemy.apexMechanic) Object.assign(enemy, { patternMode: 'apex', apexMechanic: env.M.fight.mechanic });
    // 보스 변이체(루프 33): 3단계부터 기억의 보스가 변이체로 다시 불려 나올 수 있다(js/boss-variants.js recall).
    if (typeof env.deps.bossVariants === 'object') env.deps.bossVariants.recall(enemy, tier);
    return enemy;
}
