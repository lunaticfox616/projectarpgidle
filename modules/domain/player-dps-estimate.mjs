// Display estimates preserve the hit/stack/sequence distinction used by combat.
// damageScales is the caller's fresh per-evaluation record; no saved state is changed.
function buildWisdomPreview(input, deps) {
    const { skill, coreCubeAddedDamagePct, passiveWisdomElement, authoredPassiveRules, wisdomLeapActive } = input;
    const coreCubeAddedDamageTotalPct = Math.max(0, Object.values(coreCubeAddedDamagePct)
        .reduce((sum, value) => sum + (Number(value) || 0), 0));
    const wisdomPreviewStats = { passiveWisdomElement, passiveKeystoneFlags: authoredPassiveRules.flags };
    const conversion = wisdomLeapActive && typeof deps.talentConversion === 'function'
        ? deps.talentConversion(skill.ele) : { element: skill.ele, mainPct: 1, added: {} };
    const previewSkillElement = conversion.element || skill.ele;
    const wisdomSkillDamageMultiplier = Math.max(0, Number(conversion.mainPct) || 0)
        * deps.wisdomMultiplier(wisdomPreviewStats, previewSkillElement);
    const previewAddedDamagePct = { ...coreCubeAddedDamagePct };
    Object.entries(conversion.added || {}).forEach(([element, value]) => {
        previewAddedDamagePct[element] = (Number(previewAddedDamagePct[element]) || 0) + (Number(value) || 0);
    });
    const wisdomAddedDamageMultiplier = Object.entries(previewAddedDamagePct).reduce((sum, [element, value]) => {
        const addedRatio = Math.max(0, Number(value) || 0) / 100;
        return sum + addedRatio * deps.wisdomMultiplier(wisdomPreviewStats, element);
    }, 0);
    return { coreCubeAddedDamageTotalPct, wisdomPreviewStats, previewSkillElement, wisdomSkillDamageMultiplier,
        expectedAddedDamageMultiplier: 1 + coreCubeAddedDamageTotalPct / 100,
        expectedWisdomDamageMultiplier: wisdomSkillDamageMultiplier + wisdomAddedDamageMultiplier };
}

function buildHitPreview(input, state, deps) {
    const { skill, wisdomLeapActive, warriorPhysDamageMultiplier, damageScales, finalDps, finalBaseDmg,
        finalAspd, finalDamageMultiplier, instantDamageMultiplier, chaosDamageMultiplier, flatElementHitDamage, avgHit } = input;
    const avgRollMultiplier = Math.max(0.05, (input.finalMinDmgRoll + input.finalMaxDmgRoll) / 200);
    const expectedDoubleStrikeMultiplier = Math.max(1, 1 + (Math.max(0, input.finalDs) / 100));
    if (state.expectedAddedDamageMultiplier > 1) damageScales.coreCubeAddedDamageMultiplier = state.expectedAddedDamageMultiplier;
    if (wisdomLeapActive) damageScales.wisdomLeapDamageMultiplier = state.expectedWisdomDamageMultiplier;
    let warriorPhysicalDpsMultiplier = skill.ele === 'phys' ? warriorPhysDamageMultiplier : 1;
    if (wisdomLeapActive) warriorPhysicalDpsMultiplier = state.previewSkillElement === 'phys' ? warriorPhysDamageMultiplier : 1;
    const dpsDamageMultiplier = instantDamageMultiplier * finalDamageMultiplier * warriorPhysicalDpsMultiplier
        * (state.previewSkillElement === 'chaos' ? chaosDamageMultiplier : 1);
    let finalDpsAdjusted = finalDps * avgRollMultiplier * expectedDoubleStrikeMultiplier * dpsDamageMultiplier * state.expectedWisdomDamageMultiplier;
    const flatElementAverage = Object.entries(flatElementHitDamage).reduce((sum, [element, value]) => sum + value
        * deps.wisdomMultiplier(state.wisdomPreviewStats, element) * (element === 'phys' ? warriorPhysDamageMultiplier : 1), 0);
    finalDpsAdjusted += flatElementAverage * (avgHit / Math.max(1, finalBaseDmg)) * finalAspd * avgRollMultiplier
        * expectedDoubleStrikeMultiplier * finalDamageMultiplier;
    return { avgRollMultiplier, expectedDoubleStrikeMultiplier, warriorPhysicalDpsMultiplier, finalDpsAdjusted };
}

function buildProjectilePreview(input, deps) {
    const { skill, totalProjectileExtraShots } = input;
    const isProjectileSkillForDps = Array.isArray(skill.tags) && skill.tags.includes('projectile');
    const projectileExtraShotsForDps = isProjectileSkillForDps ? Math.max(0, totalProjectileExtraShots || 0) : 0;
    const projectileBonusShotDamagePct = Math.max(0, Number(skill.extraProjectileDamagePct) || deps.projectileBonusPct);
    return { isProjectileSkillForDps, projectileExtraShotsForDps, projectileBonusShotDamagePct,
        projectileExtraShotDpsMul: deps.projectileMultiplier(skill, projectileExtraShotsForDps),
        estimatedSkillDotDps: 0, nativeDotPattern: skill.nativeCastId === 46 ? skill.combatPattern : null };
}

function addStackPreview(input, state, deps) {
    if (!input.isDotSkill || state.nativeDotPattern) return;
    const { finalAspd, dotTickIntervalMultiplier, dotDurationMultiplier, avgHit,
        chaosDamageMultiplier, totalDotDamageMultiplier, damageScales } = input;
    const dotTickInterval = deps.dotInterval * Math.max(0.05, dotTickIntervalMultiplier);
    const dotDuration = deps.dotDuration * Math.max(0.05, dotDurationMultiplier);
    const expectedDotStackRate = finalAspd * state.expectedDoubleStrikeMultiplier;
    const expectedDotStacks = Math.max(1, Math.min(deps.dotStackMax, Math.floor(expectedDotStackRate * dotDuration)));
    const expectedDotStackMultiplier = deps.stackMultiplier(expectedDotStacks);
    const expectedDotSourceHit = avgHit * state.avgRollMultiplier * state.warriorPhysicalDpsMultiplier
        * (state.previewSkillElement === 'chaos' ? chaosDamageMultiplier : 1) * state.wisdomSkillDamageMultiplier;
    state.estimatedSkillDotDps = Math.max(0, expectedDotSourceHit * deps.dotHitRatio * totalDotDamageMultiplier
        * expectedDotStackMultiplier / Math.max(0.02, dotTickInterval));
    damageScales.estimatedDotStackRate = expectedDotStackRate;
    damageScales.estimatedDotStacks = expectedDotStacks;
    damageScales.estimatedDotStackMultiplier = expectedDotStackMultiplier;
    damageScales.estimatedSkillDotDps = state.estimatedSkillDotDps;
}

function buildSequencePreview(input, state, deps) {
    const { skill, owner, damageScales, finalBaseDmg, totalDotDamageMultiplier, finalAspd } = input;
    let skillSequenceDpsMultiplier = typeof deps.sequenceMultiplier === 'function'
        ? Math.max(1, Number(deps.sequenceMultiplier(owner.activeSkill, skill)) || 1) : 1;
    // A fan's side arrows count toward pack DPS, not the single-target estimate.
    const fanSpread = deps.splitFan(skill, state.projectileExtraShotDpsMul, skillSequenceDpsMultiplier);
    skillSequenceDpsMultiplier = fanSpread.sequenceDpsMul;
    const finalDpsWithProjectileShots = state.finalDpsAdjusted * fanSpread.extraShotDpsMul * deps.supportMultiplier(skill);
    if (skillSequenceDpsMultiplier > 1) damageScales.skillSequenceMultiplier = skillSequenceDpsMultiplier;
    // Native clock contacts cannot overlap casts; attack speed cannot accelerate ticks.
    const pattern = state.nativeDotPattern;
    const finalPlayerSkillDps = pattern
        ? finalBaseDmg * totalDotDamageMultiplier * pattern.ticks
            / Math.max(pattern.ticks * pattern.intervalMs / 1000, 1 / finalAspd)
        : finalDpsWithProjectileShots * skillSequenceDpsMultiplier + state.estimatedSkillDotDps;
    return { skillSequenceDpsMultiplier, fanSpread, finalDpsWithProjectileShots, finalPlayerSkillDps };
}

function computePlayerDpsPreview(input, deps) {
    const wisdom = buildWisdomPreview(input, deps);
    const state = { ...wisdom, ...buildHitPreview(input, wisdom, deps), ...buildProjectilePreview(input, deps) };
    addStackPreview(input, state, deps);
    return { ...state, ...buildSequencePreview(input, state, deps) };
}

export function createPlayerDpsEstimate(deps) {
    return Object.freeze({ estimate: input => computePlayerDpsPreview(input, deps) });
}
