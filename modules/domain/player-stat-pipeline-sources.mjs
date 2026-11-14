import { applyStatsToBucket, getTaggedDamageBreakdown, TAGGED_DAMAGE_STAT_BY_TAG } from '../common/stat-bucket.mjs';
// Ordered, per-evaluation stages; c is private scratch state, never saved or shared between calls.

export function prepareSources(c, s, deps) {
    deps.refreshTwinKeystones();
    ({ safePassives: c.safePassives, safeSeasonNodes: c.safeSeasonNodes, safeAscendNodes: c.safeAscendNodes, safeRewardBonuses: c.safeRewardBonuses, safeJournalBonuses: c.safeJournalBonuses, safeEquippedSupports: c.safeEquippedSupports,
        baseDmg: c.baseDmg, baseHp: c.baseHp, baseMove: c.baseMove, glovePairAspdBonus: c.glovePairAspdBonus, passive: c.passive, support: c.support, season: c.season, ascend: c.ascend, reward: c.reward, starBlessing: c.starBlessing,
        colonyWardBonus: c.colonyWardBonus } = s.inputs.begin(c.owner));
    ({ resolvedStats: c.resolvedStats, barbarismKeystone: c.barbarismKeystone, gearBase: c.gearBase, gearExplicit: c.gearExplicit, localDefenseTotals: c.localDefenseTotals, globalDefensePct: c.globalDefensePct,
        shieldArmorForDamage: c.shieldArmorForDamage, shieldBaseBlockChance: c.shieldBaseBlockChance, shieldBlockChancePct: c.shieldBlockChancePct, shieldBlockChanceFlat: c.shieldBlockChanceFlat,
        equippedUniqueEffects: c.equippedUniqueEffects, equippedUniqueJewels: c.equippedUniqueJewels, activeUniqueIds: c.activeUniqueIds } = s.inputs.equipment(c.owner, c.tick, c.reward));
    Object.assign(c, s.uniqueEffects.evaluate(c.owner, { effects: c.equippedUniqueEffects, activeUniqueIds: c.activeUniqueIds, equippedUniqueJewels: c.equippedUniqueJewels, baseHp: c.baseHp, reward: c.reward }));
    c.weaponStance = s.growth.passives(c.owner, c.passive, c.safePassives);
    ({ runeCorpseExplodeChance: c.runeCorpseExplodeChance, runeCorpseExplodeLifePct: c.runeCorpseExplodeLifePct, runeResonancePower: c.runeResonancePower, talismanSummary: c.talismanSummary } = s.growth.rewards(c.owner, { season: c.season, ascend: c.ascend, reward: c.reward, starBlessing: c.starBlessing }, c.tick,
            { season: c.safeSeasonNodes, ascend: c.safeAscendNodes, act: c.safeRewardBonuses, journal: c.safeJournalBonuses }));
    c.statBuckets = { gearBase: c.gearBase, gearExplicit: c.gearExplicit, passive: c.passive, season: c.season, ascend: c.ascend, reward: c.reward, starBlessing: c.starBlessing, support: c.support };
    ({ sumNonSupportStat: c.sumNonSupportStat, sumStatAcrossBuckets: c.sumStatAcrossBuckets } = s.inputs.readers(c.statBuckets));
}

export function prepareRunes(c, s) {
    ({ gemEvaluation: c.gemEvaluation, gemSources: c.gemSources, skill: c.skill, supportValues: c.supportValues, summonCapTotal: c.summonCapTotal, auraValues: c.auraValues } = s.inputs.skills({
        owner: c.owner, buckets: c.statBuckets, resolvedStats: c.resolvedStats, safeEquippedSupports: c.safeEquippedSupports, sumNonSupportStat: c.sumNonSupportStat, projectilePatternEffect: c.projectilePatternEffect
    }));
    c.authoredPassiveRules = s.inputs.passiveRules(c.statBuckets, c.skill, c.tick);
    ({ totalStrength: c.totalStrength, totalDexterity: c.totalDexterity, totalIntelligence: c.totalIntelligence } = s.inputs.attributes(c.sumStatAcrossBuckets, c.reward, c.attributesOnly));
}

export function prepareTargetBudget(c, s, deps) {
    ({ flatAccuracy: c.flatAccuracy, accuracyBonusPct: c.accuracyBonusPct, playerAccuracy: c.playerAccuracy, bladeBundleShots: c.bladeBundleShots, skillBaseTargets: c.skillBaseTargets,
        totalProjectileExtraShots: c.totalProjectileExtraShots, cappedTargets: c.cappedTargets } = s.inputs.targets({
        owner: c.owner, skill: c.skill, buckets: c.statBuckets, totalStrength: c.totalStrength, totalDexterity: c.totalDexterity, weaponStance: c.weaponStance, sumStatAcrossBuckets: c.sumStatAcrossBuckets
    }));
    c.talentStatMap = (typeof deps.talentStatMap === 'function') ? deps.talentStatMap() : {};
    if (typeof deps.talentCardStats === 'function') applyStatsToBucket(c.reward, deps.talentCardStats(c.tick));
    c.bonusResonancePower = deps.resonancePower(c.runeResonancePower, c.reward, c.passive, c.gearExplicit);
    c.supportBudget = s.passive.supportBudget(c.owner, { baseSlots: 2 + c.gearBase.suppCap + c.gearExplicit.suppCap + c.passive.suppCap + c.season.suppCap + c.ascend.suppCap + c.reward.suppCap, cosmos: c.cosmosTwinStarResonance, unique: c.uniqueResonanceAndSuppCap || {}, runePower: c.bonusResonancePower, flags: c.authoredPassiveRules.flags });
    ({ suppCap: c.suppCap, inquisitorResonanceBonus: c.inquisitorResonanceBonus, uniqueResonanceFloor: c.uniqueResonanceFloor } = c.supportBudget);
    c.supportResonanceOverflow = s.passive.applyResonance(c.passive, c.supportBudget, c.owner);
}

export function prepareTaggedDamage(c, s, deps) {
    c.taggedSkill = c.authoredPassiveRules.flags.duel ? { ...c.skill, tags: [...c.skill.tags, 'spell'] } : c.skill;
    c.strongestElement = c.authoredPassiveRules.flags.threeBranchLight ? s.passive.strongestElement(c.sumStatAcrossBuckets) : null;
    c.damageSkill = s.passive.taggedSkill(c.taggedSkill, c.strongestElement);
    c.gearTagged = getTaggedDamageBreakdown(c.gearBase, c.damageSkill);
    c.gearExplicitTagged = getTaggedDamageBreakdown(c.gearExplicit, c.damageSkill);
    c.passiveTagged = getTaggedDamageBreakdown(c.passive, c.damageSkill);
    c.seasonTagged = getTaggedDamageBreakdown(c.season, c.damageSkill);
    c.ascendTagged = getTaggedDamageBreakdown(c.ascend, c.damageSkill);
    c.supportTagged = getTaggedDamageBreakdown(c.support, c.damageSkill);
    c.rewardTagged = getTaggedDamageBreakdown(c.reward, c.damageSkill);
    c.starTagged = getTaggedDamageBreakdown(c.starBlessing, c.damageSkill);
    c.taggedTotal = c.gearTagged.total + c.gearExplicitTagged.total + c.passiveTagged.total + c.seasonTagged.total + c.ascendTagged.total + c.supportTagged.total + c.rewardTagged.total + c.starTagged.total;
    c.taggedParts = [].concat(c.gearTagged.parts, c.gearExplicitTagged.parts, c.passiveTagged.parts, c.seasonTagged.parts, c.ascendTagged.parts, c.supportTagged.parts, c.rewardTagged.parts, c.starTagged.parts);
    c.taggedMap = {};
    c.taggedParts.forEach(part => {
        let tag = Object.keys(TAGGED_DAMAGE_STAT_BY_TAG).find(key => TAGGED_DAMAGE_STAT_BY_TAG[key] === part.statId);
        if (!tag) return;
        c.taggedMap[tag] = (c.taggedMap[tag] || 0) + part.value;
    });
    c.taggedSummary = Object.keys(c.taggedMap).map(tag => `${deps.tagLabel(tag)} ${Math.floor(c.taggedMap[tag])}%`);
    c.baseTaggedTotal = c.taggedTotal;
}

export function applyElementalDoctrine(c, s, deps) {
    ({ coreCubeAddedDamagePct: c.coreCubeAddedDamagePct, coreCubeFlatElementDamage: c.coreCubeFlatElementDamage, coreCubeTakenFlatReduce: c.coreCubeTakenFlatReduce, coreCubePhysTakenAs: c.coreCubePhysTakenAs, coreCubeDoubleDamageChance: c.coreCubeDoubleDamageChance, coreCubeSlamEchoDamagePct: c.coreCubeSlamEchoDamagePct } = s.math.coreModifiers(c));
    c.crusaderThunderDoctrinePct = 0;
    if (deps.keystone('cr2') && c.skill.ele === 'light') {
        let firePct = c.sumStatAcrossBuckets('firePctDmg');
        let coldPct = c.sumStatAcrossBuckets('coldPctDmg');
        c.crusaderThunderDoctrinePct = Math.max(0, firePct + coldPct);
        if (c.crusaderThunderDoctrinePct > 0) {
            c.taggedTotal += c.crusaderThunderDoctrinePct;
            c.taggedSummary.push(deps.translate('천뢰 교리: 화염/냉기 피해 {floor}%를 번개 피해에 추가 적용', { floor: Math.floor(c.crusaderThunderDoctrinePct) }));
        }
    }
}

export function prepareRandomElementDamage(c, deps) {
    c.hasRandomElementConversion = Array.isArray(c.skill.randomElementPool) && c.skill.randomElementPool.length > 0;
    c.skillHasElementalConversion = c.hasRandomElementConversion || ['fire','cold','light','chaos'].includes(c.skill.ele);
    c.randomElementDamagePct = c.hasRandomElementConversion ? {
        fire: c.strongestElement?.bonus ?? c.sumStatAcrossBuckets('firePctDmg'),
        cold: c.strongestElement?.bonus ?? c.sumStatAcrossBuckets('coldPctDmg'),
        light: c.strongestElement?.bonus ?? c.sumStatAcrossBuckets('lightPctDmg')
    } : null;
    appendRandomElementSummary(c, deps);
}

function appendRandomElementSummary(c, deps) {
    if (!c.randomElementDamagePct) return;
    const summary = Object.entries(c.randomElementDamagePct)
        .filter(([, value]) => value)
        .map(([ele, value]) => `${ele === 'fire' ? deps.translate('화염') : (ele === 'cold' ? deps.translate('냉기') : deps.translate('번개'))} ${Math.floor(value)}%`);
    if (summary.length > 0) c.taggedSummary.push(deps.translate('무작위 원소별 적용: {summary}', { summary: summary.join(' / ') }));
}

export function prepareAilmentChances(c, s, deps) {
    ({ gearFlatDmg: c.gearFlatDmg, passiveFlatDmg: c.passiveFlatDmg, generalPctDmg: c.generalPctDmg, summonSharedGeneralPctDmg: c.summonSharedGeneralPctDmg, dotPctDmg: c.dotPctDmg } = s.math.weaponDamage(c));
    c.sumAilmentChanceStat = function(statId) {
        return (c.gearBase[statId] || 0) + (c.gearExplicit[statId] || 0) + (c.passive[statId] || 0) + (c.season[statId] || 0) + (c.ascend[statId] || 0) + (c.support[statId] || 0) + (c.reward[statId] || 0) + (c.starBlessing[statId] || 0);
    };
    c.finalIgniteChance = c.sumAilmentChanceStat('igniteChance');
    c.finalChillChance = c.sumAilmentChanceStat('chillChance');
    c.finalFreezeChance = c.sumAilmentChanceStat('freezeChance');
    c.finalShockChance = c.sumAilmentChanceStat('shockChance');
    c.finalPoisonChance = c.sumAilmentChanceStat('poisonChance');
    c.finalBleedChance = c.sumAilmentChanceStat('bleedChance');
    c.ailmentCritChance = { ignite: 25, chill: 25, freeze: 25, shock: 25, poison: 25, bleed: 25 };
    c.bleedChanceMultiplier = c.authoredPassiveRules.flags.bloodCradle ? 0.7 : 1;
    c.finalBleedChance *= c.bleedChanceMultiplier;
    c.ailmentCritChance.bleed *= c.bleedChanceMultiplier;
    c.isSpellSkill = Array.isArray(c.skill.tags) && c.skill.tags.includes('spell');
    if (c.isSpellSkill) c.reward.ds += c.sumStatAcrossBuckets('spellRepeatChance');
    c.isDotSkill = deps.nativeDot(c.skill);
}

export function prepareBaseDamage(c, s) {
    ({ spellFlatDmg: c.spellFlatDmg, totalFlatDmg: c.totalFlatDmg, codexBonusRatio: c.codexBonusRatio } = s.math.spellDamage(c));
    ({ flatElementHitDamage: c.flatElementHitDamage } = s.math.elementHits(c));
    ({ gearFlatHp: c.gearFlatHp, passiveFlatHp: c.passiveFlatHp, totalPctHp: c.totalPctHp, finalMaxHp: c.finalMaxHp, hpScaleRatio: c.hpScaleRatio, hpFlatBonus: c.hpFlatBonus, scaledFlatDmg: c.scaledFlatDmg } = s.math.lifeDamage(c));
    c.talentDamageResult = s.math.talentDamage(c);
    ({ talentSourceStats: c.talentSourceStats, baseDamageIncreaseMultiplier: c.baseDamageIncreaseMultiplier, finalBaseDmg: c.finalBaseDmg } = c.talentDamageResult);
    ({ taggedTotal: c.taggedTotal } = c.talentDamageResult);
    ({ gearAspd: c.gearAspd, passiveAspd: c.passiveAspd, totalAspdPct: c.totalAspdPct, rawAspd: c.rawAspd, finalAspd: c.finalAspd, skillDelayPct: c.skillDelayPct } = s.math.attackSpeed(c));
}
