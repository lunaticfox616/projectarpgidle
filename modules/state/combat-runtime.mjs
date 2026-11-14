/** Transient fight state. Snapshot references stay shared until the replay boundary clones them.
 * Times inside the queues/channel/tactics are milliseconds on the combat clock.
 * This object is never added to the persistent game save. */
export function createCombatRuntime(tactics) {
    return {
        pendingSkillStageHits: [],
        pendingEnemyCombatAttacks: [],
        combatTacticsRuntime: tactics,
        combatChannelRuntime: { id: 0, skillName: '', endAt: 0 },
        combatChannelResumeSkillName: '',
        nextCombatChannelId: 1,
        nextPlayerDamageTextGroupId: 1,
        trialHazardRuntime: { nextAt: 0, active: null },
        skillGemCombatRuntime: null
    };
}

export function captureCombatSnapshot(runtime, clock, participants) {
    const { pTimer, progressStallTicks, itemIdCounter, lastTime } = clock;
    const { pendingSkillStageHits, pendingEnemyCombatAttacks, combatTacticsRuntime,
        combatChannelRuntime, combatChannelResumeSkillName, nextCombatChannelId,
        nextPlayerDamageTextGroupId, trialHazardRuntime, skillGemCombatRuntime } = runtime;
    return { pTimer, progressStallTicks, itemIdCounter, lastTime, pendingSkillStageHits,
        pendingEnemyCombatAttacks, combatTacticsRuntime, combatChannelRuntime,
        combatChannelResumeSkillName, nextCombatChannelId, nextPlayerDamageTextGroupId,
        trialHazardRuntime, skillGemCombatRuntime,
        mobilitySkill: participants.mobilitySkill.capture(),
        wispSummons: participants.wispSummons.capture(),
        ascendancyNodeRules: participants.ascendancyNodeRules.capture() };
}

/** Restore the same references and participant order as captureCombatRuntime.
 * The caller owns cloning and try/finally restoration of a foreground snapshot. */
export function restoreCombatSnapshot(runtime, clock, participants, snapshot) {
    const { pTimer, progressStallTicks, itemIdCounter, lastTime, pendingSkillStageHits,
        pendingEnemyCombatAttacks, combatTacticsRuntime, combatChannelRuntime,
        combatChannelResumeSkillName, nextCombatChannelId, nextPlayerDamageTextGroupId,
        trialHazardRuntime, skillGemCombatRuntime } = snapshot;
    Object.assign(clock, { pTimer, progressStallTicks, itemIdCounter, lastTime });
    Object.assign(runtime, { pendingSkillStageHits, pendingEnemyCombatAttacks, combatTacticsRuntime,
        combatChannelRuntime, combatChannelResumeSkillName, nextCombatChannelId,
        nextPlayerDamageTextGroupId, trialHazardRuntime, skillGemCombatRuntime });
    participants.mobilitySkill.restore(snapshot.mobilitySkill);
    participants.wispSummons.restore(snapshot.wispSummons);
    participants.ascendancyNodeRules.restore(snapshot.ascendancyNodeRules);
}
