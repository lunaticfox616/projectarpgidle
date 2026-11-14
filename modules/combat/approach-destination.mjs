// Keep the destination stable through a pathfinding detour. Re-picking the nearest enemy
// at every cell can reverse that detour forever; attackable enemies still take precedence.
export function killResolvePlayerApproachTarget(env, alive) {
    let target = alive.find(enemy => enemy.id === env.deps.combatTacticsRuntime.approachTargetId);
    if (!target) target = env.deps.findNearestGridEnemy(env.owner.gridPlayer, alive);
    env.deps.combatTacticsRuntime.approachTargetId = target ? target.id : null;
    return target;
}
