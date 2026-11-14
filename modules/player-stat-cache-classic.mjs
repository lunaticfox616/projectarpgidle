import { createPlayerStatTick } from './domain/player-stat-tick.mjs';
import { createPlayerStatCache } from './domain/player-stat-cache.mjs';

// Buff-specific helpers still use the current calculation owner; ordinary tick fields are read from explicit state in the module.
const tick = createPlayerStatTick({
    now: () => getCombatTime(), cycleBuffEffects: (owner, now) => getActivePassiveCycleBuffEffects(now),
    specialization: () => ensurePassiveSpecializationState(), rageStacks: (owner, now) => getWarriorRageStacks(now),
    rageMultiplier: (owner, now) => getWarriorRagePhysicalDamageMultiplier(now), overload: () => getElementalistOverloadStacks(),
    mistralStacks: (owner, now) => getTalentMistralStackCount(now), mossRecovery: () => getMossRecoveryOccupied(),
    regionAffixEffects: { moveBonus: (owner, now) => regionAffixEffects.moveBonus(now) },
    ascendancyNodeRules: { unyieldingActive: (owner, now) => ascendancyNodeRules.unyieldingActive(now),
        flowStacks: (owner, now) => ascendancyNodeRules.flowStacks(now), rooted: (owner, now) => ascendancyNodeRules.rooted(now) }
});
const playerStatTick = Object.freeze({ ...tick, create: () => tick.create(game) });
const cache = createPlayerStatCache({ contextFields: PLAYER_STAT_CONTEXT_FIELDS, selfCheckAnswers: PLAYER_STAT_SELF_CHECK_ANSWERS }, {
    tick, zone: id => getZone(id), signature: state => getPersistentBuildSignature(state),
    calculate: (state, includeBreakdowns, inputTick) => equipmentStatCalculator(includeBreakdowns, false, true, inputTick),
    finish: (core, includeBreakdowns) => finishPlayerStats(core, includeBreakdowns),
    defer: callback => Promise.resolve().then(callback), warn: (...args) => console.warn(...args)
});
const playerStatCache = Object.freeze({ ...cache, read: (includeBreakdowns, memo, status, state = game) => cache.read(includeBreakdowns, memo, status, state) });
safeExposeGlobals({ playerStatTick, playerStatCache });
