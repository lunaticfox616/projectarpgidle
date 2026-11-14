import { createEmptyStatBucket, addStatToBucket, sumOrderedPlayerStatSources } from '../common/stat-bucket.mjs';

function pairedGloveSpeed(owner) {
    const first = owner.equipment ? owner.equipment['장갑1'] : null;
    const second = owner.equipment ? owner.equipment['장갑2'] : null;
    return first && second && first.baseId && second.baseId && first.baseId === second.baseId ? 0.1 : 0;
}

function beginPlayerStatInputs(owner) {
    return {
        safePassives: Array.isArray(owner.passives) ? owner.passives : [],
        safeSeasonNodes: Array.isArray(owner.seasonNodes) ? owner.seasonNodes : [],
        safeAscendNodes: Array.isArray(owner.ascendNodes) ? owner.ascendNodes : [],
        safeRewardBonuses: Array.isArray(owner.actRewardBonuses) ? owner.actRewardBonuses : [],
        safeJournalBonuses: Array.isArray(owner.journalBonuses) ? owner.journalBonuses : [],
        safeEquippedSupports: Array.isArray(owner.equippedSupports) ? owner.equippedSupports : [],
        baseDmg: 16 + owner.level * 1.5, baseHp: 90 + owner.level * 8, baseMove: 100,
        glovePairAspdBonus: pairedGloveSpeed(owner),
        passive: createEmptyStatBucket(), support: createEmptyStatBucket(), season: createEmptyStatBucket(),
        ascend: createEmptyStatBucket(), reward: createEmptyStatBucket(), starBlessing: createEmptyStatBucket(),
        colonyWardBonus: {}
    };
}

function addJewelInventoryBonuses(activeIds, tick, reward) {
    if (activeIds.has('uj_old_box')) {
        const rarity = tick.get('inventoryRarity');
        addStatToBucket(reward, 'aspd', Math.min(30, rarity.magic * 0.5));
        addStatToBucket(reward, 'pctDmg', Math.min(60, rarity.rare * 1.2));
        addStatToBucket(reward, 'dr', Math.min(12, rarity.unique * 1.5));
    }
    if (activeIds.has('uj_condensed_curse')) addStatToBucket(reward, 'curseCap', 1);
}

/** Resolve the validated equipment view. Only fresh contribution buckets and the supplied reward bucket change. */
function prepareEquipmentInputs(owner, tick, reward, deps) {
    const resolvedSources = deps.itemEntries(owner).map(([slot, item]) => [slot, item, deps.resolveLists(slot, item, owner)]);
    const resolvedStats = resolvedSources.map(([, , stats]) => stats);
    const excludedSlots = new Set();
    const barbarismKeystone = deps.passiveNode('야만');
    if (barbarismKeystone) excludedSlots.add('all:무기');
    if (deps.keystone('cr3', owner) && !deps.keystone('cr9', owner)) excludedSlots.add('무기');
    const contributions = deps.equipmentContributions(resolvedSources, excludedSlots, owner);
    const { gearExplicit, equippedUniqueEffects } = contributions;
    deps.talentEffects().forEach(effect => equippedUniqueEffects.push(effect));
    const equippedUniqueJewels = deps.uniqueJewels(owner);
    const activeUniqueIds = new Set(equippedUniqueJewels.map(entry => entry.jewel.uniqueId));
    const globalDefensePct = { ...contributions.globalDefensePct };
    deps.mirroredJewels(owner).forEach(jewel => deps.jewelStats(jewel).forEach(stat => {
        addStatToBucket(gearExplicit, stat.id, stat.val);
        deps.addDefensePct(globalDefensePct, stat.id, stat.val);
    }));
    addJewelInventoryBonuses(activeUniqueIds, tick, reward);
    deps.appendKeystoneEffects(equippedUniqueEffects, owner);
    return { ...contributions, resolvedStats, barbarismKeystone, equippedUniqueJewels, activeUniqueIds, globalDefensePct };
}

/** Buckets stay live within one evaluation; they are never stored on game. Missing core fields retain legacy NaN behavior. */
function createPlayerSourceReaders(buckets) {
    const { gearBase, gearExplicit, passive, season, ascend, reward, starBlessing, support } = buckets;
    return {
        sumNonSupportStat: stat => gearBase[stat] + gearExplicit[stat] + passive[stat]
            + season[stat] + ascend[stat] + reward[stat] + (starBlessing[stat] || 0),
        sumStatAcrossBuckets: stat => gearBase[stat] + gearExplicit[stat] + passive[stat]
            + season[stat] + ascend[stat] + support[stat] + reward[stat] + (starBlessing[stat] || 0)
    };
}

function prepareSkillInputs(input, deps) {
    const { owner, buckets, resolvedStats, safeEquippedSupports, sumNonSupportStat, projectilePatternEffect } = input;
    const gemEvaluation = deps.buildMemo(owner) ? undefined : deps.gemEvaluation(resolvedStats);
    const gemSources = deps.gemSources(owner.activeSkill, undefined, resolvedStats, gemEvaluation);
    let skill = deps.activeSkill(gemSources.total);
    const bonus = name => deps.gemSources(name, undefined, resolvedStats, gemEvaluation).total;
    const supportValues = deps.supportValues(skill, {
        names: safeEquippedSupports, bonus, ownStat: sumNonSupportStat,
        add: (stat, value) => addStatToBucket(buckets.support, stat, value)
    });
    deps.constellation(buckets.reward, owner);
    const summonCapTotal = () => sumOrderedPlayerStatSources(buckets, 'summonCap');
    // Sole-minion limits attacking summons; guardian golems and blessings keep their existing allowance.
    const blessingCap = deps.passiveNode('단 하나의 사역') ? Infinity : deps.summonCap(summonCapTotal());
    const auraValues = deps.auraValues(owner, bonus, blessingCap);
    Object.entries(auraValues).forEach(([stat, value]) => addStatToBucket(buckets.reward, stat, value));
    if (projectilePatternEffect && !skill.projectilePatternSource) {
        skill = deps.projectileMode(skill, projectilePatternEffect.mode, projectilePatternEffect.source, projectilePatternEffect.damageMultiplier);
    }
    return { gemEvaluation, gemSources, skill, supportValues, summonCapTotal, auraValues };
}

function prepareAuthoredPassiveInputs(buckets, skill, tick, deps) {
    if (typeof deps.authoredRules === 'function') return deps.authoredRules({ buckets, skillElement: skill.ele, skillTags: skill.tags, tick });
    return { mystique: { ailment: 'bleed', damagePct: 0, potencyPct: 0 }, devotion: 0, cycle: 0,
        revelation: 'combat', revelationLabel: '전투의 계시', wisdomElement: 'fire',
        combatDamageMorePct: 0, guardTakenLessPct: 0, lifeBonusPct: 0,
        cycleAddedFireFromPhysicalPct: 0, fanaticismStacks: 0, activeCycleBuffEffects: [], flags: {} };
}

function prepareAttributeInputs(sum, reward, attributesOnly) {
    const totalStrength = Math.max(0, sum('strength'));
    const totalDexterity = Math.max(0, sum('dexterity'));
    const totalIntelligence = Math.max(0, sum('intelligence'));
    if (!attributesOnly) {
        if (totalStrength > 0) {
            addStatToBucket(reward, 'flatHp', totalStrength * 2);
            addStatToBucket(reward, 'physPctDmg', Math.floor(totalStrength / 5));
        }
        if (totalDexterity > 0) {
            addStatToBucket(reward, 'evasion', totalDexterity * 3);
            addStatToBucket(reward, 'projectilePctDmg', Math.floor(totalDexterity / 5));
        }
        if (totalIntelligence > 0) {
            addStatToBucket(reward, 'energyShield', totalIntelligence * 2);
            addStatToBucket(reward, 'spellPctDmg', Math.floor(totalIntelligence / 5));
        }
    }
    return { totalStrength, totalDexterity, totalIntelligence };
}

// Target additions exclude support and star blessings; unlike summon totals, these are raw source sums.
function sumTargetInputSources(buckets, stat) {
    return buckets.gearBase[stat] + buckets.gearExplicit[stat] + buckets.passive[stat]
        + buckets.season[stat] + buckets.ascend[stat] + buckets.reward[stat];
}

function applyTargetInputCap(skill, bonus) {
    if (bonus > 0) {
        skill.targets = Math.min(Array.isArray(skill.tags) && skill.tags.includes('projectile') ? 12 : 6,
            Math.max(1, (skill.targets || 1) + Math.floor(bonus)));
    } else skill.targets = Math.min(6, Math.max(1, skill.targets || 1));
}

function prepareTargetInputs(input, deps) {
    const { owner, skill, buckets, totalStrength, totalDexterity, weaponStance, sumStatAcrossBuckets } = input;
    const flatAccuracy = Math.max(0, sumStatAcrossBuckets('accuracy'));
    const accuracyBonusPct = Math.max(0, sumStatAcrossBuckets('accuracyBonusPct'));
    const playerAccuracy = deps.accuracy(owner.level, totalDexterity, flatAccuracy, accuracyBonusPct);
    const bladeBundleShots = deps.bladeShots(totalStrength, totalDexterity, weaponStance);
    buckets.passive.projectileExtraShots += bladeBundleShots;
    let targetBonus = sumTargetInputSources(buckets, 'targetAny');
    const skillBaseTargets = skill.targets;
    const totalProjectileExtraShots = sumTargetInputSources(buckets, 'projectileExtraShots') + sumStatAcrossBuckets('projectileExtraChance') / 100;
    if (Array.isArray(skill.tags) && skill.tags.includes('projectile')) targetBonus += sumTargetInputSources(buckets, 'targetProjectile');
    if (Array.isArray(skill.tags) && skill.tags.includes('slam')) targetBonus += sumTargetInputSources(buckets, 'targetSlam');
    applyTargetInputCap(skill, targetBonus);
    const cappedTargets = skill.targets;
    deps.uncappedTargets(skill, owner.activeSkill);
    skill.projectileChain = (skill.tags || []).includes('projectile') ? sumStatAcrossBuckets('projectileChain') : 0;
    return { flatAccuracy, accuracyBonusPct, playerAccuracy, bladeBundleShots, skillBaseTargets, totalProjectileExtraShots, cappedTargets };
}

export function createPlayerStatInputs(deps) {
    return Object.freeze({
        begin: beginPlayerStatInputs,
        equipment: (owner, tick, reward) => prepareEquipmentInputs(owner, tick, reward, deps),
        readers: createPlayerSourceReaders,
        skills: input => prepareSkillInputs(input, deps),
        passiveRules: (buckets, skill, tick) => prepareAuthoredPassiveInputs(buckets, skill, tick, deps),
        attributes: prepareAttributeInputs,
        targets: input => prepareTargetInputs(input, deps)
    });
}
