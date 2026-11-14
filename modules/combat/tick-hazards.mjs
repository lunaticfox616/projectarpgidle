

/** The zone's own tick: the colony run, and from underworld floor 15 the life drain. */
export function tickTickZoneHazards(env, zone, pStats) {
    if (zone?.type === 'colony' && env.owner.colony.inRun) env.deps.tickColonyRun(pStats);
    if (!zone || zone.type !== 'underworld' || env.owner.playerHp <= 0) return;
    const floor = Math.max(1, Math.floor(zone.floor || 1));
    if (floor < 15) return;
    let tickDmg = env.deps.getUnderworldLifeDrainPerTick(pStats.maxHp, floor, env.deps.getSkyStoneReductionPct());
    tickDmg = env.deps.floorIncomingDamage(tickDmg);
    tickDmg = env.deps.absorbDamageWithTalentStoneShield(tickDmg);
    env.owner.playerHp = Math.max(0, Math.floor(env.owner.playerHp - tickDmg));
}

/** 20 ticks with no map progress where progress is tracked: the run is rebuilt and nudged forward. */
export function tickTrackProgressStall(env, progressBefore) {
    if (!env.deps.actExplorationProgress.shouldTrackStall()) { env.runtime.progressStallTicks = 0; return; }
    if (env.owner.runProgress <= progressBefore + 0.0001) env.runtime.progressStallTicks++;
    else env.runtime.progressStallTicks = 0;
    if (env.runtime.progressStallTicks < 20) return;
    env.deps.ensureEncounterRun();
    env.owner.runProgress = Math.min(99.9, progressBefore + 0.4);
    env.runtime.progressStallTicks = 0;
}
