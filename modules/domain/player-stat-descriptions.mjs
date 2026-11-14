import { describeStatAtk, describeStatAps, describeStatCrit, describeStatCritDmg, describeStatDs, describeStatPhysIgnore, describeStatResPen, describeStatDmgRoll, describeStatDps, describeStatGem } from './player-stat-combat-descriptions.mjs';
import { describeStatMove, describeStatHp, describeStatRegen, describeStatRegenSuppress, describeStatLeech, describeStatSpellLeech, describeStatDr, describeStatArmor, describeStatEvasion, describeStatEnergyShield, describeStatAccuracy, describeStatStrength, describeStatDexterity, describeStatIntelligence, describeStatBlockChance, describeStatBlockChanceMax, describeStatDeflectChance, describeStatDeflectDamageReduce } from './player-stat-vitals-descriptions.mjs';
import { describeStatResF, describeStatResC, describeStatResL, describeStatResChaos, describeStatAilmentResist, describeStatIgniteChance, describeStatChillChance, describeStatFreezeChance, describeStatShockChance, describeStatAilmentResistIgniteChance, describeStatAilmentResistChillChance, describeStatAilmentResistFreezeChance, describeStatAilmentResistShockChance, describeStatAilmentResistPoisonChance, describeStatAilmentResistBleedChance, describeStatPoisonChance, describeStatBleedChance } from './player-stat-resistance-descriptions.mjs';
import { createStatDescriptionHelpers } from './player-stat-description-helpers.mjs';
import { describeExtraGetPassiveSpecialStatBreakdowns, describeExtraGetProjectileTargetBreakdowns, describeExtraAppendPlayerDpsBreakdowns } from './player-stat-extra-descriptions.mjs';

function describeFlameDecay(input, deps) {
    return [
            deps.translate('화염 부패 기대 지속 DPS {floor} (생명력/초과 화염 저항/지속 피해 배율 적용, 적 저항 적용 전)', { floor: Math.floor(input.estimatedSkillDotDps) }),
            deps.translate('생명력 계수: 최대 생명력 {floor} → 내장 피해 +{floor2}', { floor: Math.floor(input.finalMaxHp), floor2: Math.floor(input.hpFlatBonus) }),
            (input.skill.regenDmgScale || 0) > 0 ? deps.translate('생명력 재생 계수: {regenScaledBonus}x (재생 {value}%)', { regenScaledBonus: input.regenScaledBonus.toFixed(2), value: deps.valueText('regen', input.finalRegen) }) : null,
            deps.translate('초과 화염 저항 계수: {fireResScaledBonus}x (미적용 화염 저항 {floor}% / 최대 {floor2}%, 초과 {fireResOvercap}% 중 적용 {effectiveFireResOvercap}%)', { fireResScaledBonus: input.fireResScaledBonus.toFixed(2), floor: Math.floor(input.fireResForOvercap), floor2: Math.floor(input.maxResFForOvercap), fireResOvercap: input.fireResOvercap.toFixed(1), effectiveFireResOvercap: input.effectiveFireResOvercap.toFixed(1) }),
            deps.translate('지속 피해 총 배율: {totalDotDamageMultiplier}x (스킬 {dotMultiplier}x, 스탯 {dotStatMultiplier}x)', { totalDotDamageMultiplier: input.totalDotDamageMultiplier.toFixed(2), dotMultiplier: input.dotMultiplier.toFixed(2), dotStatMultiplier: input.dotStatMultiplier.toFixed(2) }),
            deps.translate('화염 부패 대상 점화 피해 증폭: {value}x (생명력 100당 {value2}%, 최대 {max}x)', { value: input.flameDecayIgniteTakenMultiplierPreview.toFixed(2), value2: (Math.max(0, Number(input.skill.igniteTakenHpScalePer100 || 0)) * 100).toFixed(1), max: (Math.max(1, Number(input.skill.igniteTakenMaxMultiplier || 0)) || 1).toFixed(1) }),
            deps.translate('실제 적별 화염 부패 DPS는 적 상태이상 툴팁에서 저항/심연 배율까지 반영해 표시됩니다.')
        ].filter(Boolean);
}

function assembleStatDescriptions(input, deps) {
    const helpers = createStatDescriptionHelpers(input, deps);
    return {
        ...describeExtraGetPassiveSpecialStatBreakdowns(deps, input.authoredPassiveRules),
        ...describeExtraGetProjectileTargetBreakdowns(deps, { gearBase: input.gearBase, gearExplicit: input.gearExplicit, passive: input.passive, season: input.season, ascend: input.ascend, reward: input.reward }, { skill: input.skill, bladeShots: input.bladeBundleShots, baseTargets: input.skillBaseTargets, cappedTargets: input.cappedTargets, chancePct: input.sumStatAcrossBuckets('projectileExtraChance') }),
        atk: describeStatAtk(input, deps, helpers),
        aps: describeStatAps(input, deps, helpers),
        crit: describeStatCrit(input, deps, helpers),
        critDmg: describeStatCritDmg(input, deps, helpers),
        move: describeStatMove(input, deps, helpers),
        hp: describeStatHp(input, deps, helpers),
        regen: describeStatRegen(input, deps, helpers),
        regenSuppress: describeStatRegenSuppress(input, deps),
        leech: describeStatLeech(input, deps),
        spellLeech: describeStatSpellLeech(input, deps),
        ds: describeStatDs(input, deps, helpers),
        dr: describeStatDr(input, deps),
        armor: describeStatArmor(input, deps),
        evasion: describeStatEvasion(input, deps),
        energyShield: describeStatEnergyShield(input, deps),
        accuracy: describeStatAccuracy(input, deps),
        strength: describeStatStrength(input, deps),
        dexterity: describeStatDexterity(input, deps),
        intelligence: describeStatIntelligence(input, deps),
        blockChance: describeStatBlockChance(input, deps),
        blockChanceMax: describeStatBlockChanceMax(input, deps),
        deflectChance: describeStatDeflectChance(input, deps),
        deflectDamageReduce: describeStatDeflectDamageReduce(input, deps),
        physIgnore: describeStatPhysIgnore(input, deps),
        resPen: describeStatResPen(input, deps),
        resF: describeStatResF(input, helpers),
        resC: describeStatResC(input, helpers),
        resL: describeStatResL(input, helpers),
        resChaos: describeStatResChaos(input, helpers),
        ailmentResist: describeStatAilmentResist(input, deps),
        dmgRoll: describeStatDmgRoll(input, deps),
        igniteChance: describeStatIgniteChance(input, helpers),
        chillChance: describeStatChillChance(input, deps, helpers),
        freezeChance: describeStatFreezeChance(input, deps, helpers),
        shockChance: describeStatShockChance(input, deps, helpers),
        ailmentResistIgniteChance: describeStatAilmentResistIgniteChance(input, helpers),
        ailmentResistChillChance: describeStatAilmentResistChillChance(input, deps, helpers),
        ailmentResistFreezeChance: describeStatAilmentResistFreezeChance(input, deps, helpers),
        ailmentResistShockChance: describeStatAilmentResistShockChance(input, deps, helpers),
        ailmentResistPoisonChance: describeStatAilmentResistPoisonChance(input, helpers),
        ailmentResistBleedChance: describeStatAilmentResistBleedChance(input, helpers),
        poisonChance: describeStatPoisonChance(input, helpers),
        bleedChance: describeStatBleedChance(input, helpers),
        dps: describeStatDps(input, deps),
        gem: describeStatGem(input, deps)
    };
}

export function createPlayerStatDescriptions(deps) {
    return Object.freeze({
        build: input => assembleStatDescriptions(input, deps),
        flameDecay: input => describeFlameDecay(input, deps),
        special: rules => describeExtraGetPassiveSpecialStatBreakdowns(deps, rules),
        projectileTargets: (b, extra) => describeExtraGetProjectileTargetBreakdowns(deps, b, extra),
        appendDps: (stats, estimate) => describeExtraAppendPlayerDpsBreakdowns(deps, stats, estimate)
    });
}
