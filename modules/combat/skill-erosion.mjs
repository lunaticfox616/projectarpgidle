

export function hitApplySupportChaosErosionOnHit(enemy, pStats, hitElement) {
    let erosionPerHit = pStats.chaosErosion || 0;
    if (erosionPerHit <= 0 || hitElement !== 'chaos' || !enemy || enemy.hp <= 0) return;
    let cap = pStats.chaosErosionCap || 20;
    enemy.chaosErosionShred = Math.min(cap, (enemy.chaosErosionShred || 0) + erosionPerHit);
}

export function hitTransferPassiveChaosErosionToTarget(env, enemy, pStats) {
    let flags = pStats && pStats.passiveKeystoneFlags;
    let pending = Math.max(0, Number(env.owner.passiveChaosErosionTransfer) || 0);
    if (!flags || !flags.erosionLegacy || pending <= 0 || !enemy || enemy.hp <= 0) return false;
    enemy.chaosErosionShred = Math.min(pStats.chaosErosionCap || 40, (enemy.chaosErosionShred || 0) + pending);
    env.owner.passiveChaosErosionTransfer = 0;
    return true;
}
