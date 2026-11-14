export function describeStatResF(input, helpers) {
    return helpers.makeResistanceBreakdown({ title: '화염 저항', statId: 'resF', maxStatId: 'maxResF', finalValue: input.finalResF, maxValue: input.finalMaxResF, extraLines: [
            helpers.formatResistanceSourceLine({ label: '약품 내성', value: input.resistanceBlendBonus }),
            helpers.formatResistanceSourceLine({ label: '분광 외피', value: input.elementalistResistanceShift.resF }),
            helpers.formatResistanceSourceLine({ label: '군락 수호구', value: input.colonyWardBonus.resAll || 0 })
        ], extraMaxLines: [
            helpers.formatResistanceSourceLine({ label: '최대 저항, 공통 효과', value: input.sharedElementalMaxRes }),
            helpers.formatResistanceSourceLine({ label: '최대 저항, 영역 고유 효과', value: input.uniqueAllMaxRes }),
            helpers.formatResistanceSourceLine({ label: '최대 저항, 약품 내성', value: input.resistanceBlendMaxBonus }),
            helpers.formatResistanceSourceLine({ label: '최대 저항, 분광 외피', value: input.hasElementalistPrismaticShell ? 3 : 0 }),
            helpers.formatResistanceSourceLine({ label: '최대 저항, 군락 수호구', value: input.colonyWardBonus.maxResF || 0 })
        ] });
}

export function describeStatResC(input, helpers) {
    return helpers.makeResistanceBreakdown({ title: '냉기 저항', statId: 'resC', maxStatId: 'maxResC', finalValue: input.finalResC, maxValue: input.finalMaxResC, extraLines: [
            helpers.formatResistanceSourceLine({ label: '약품 내성', value: input.resistanceBlendBonus }),
            helpers.formatResistanceSourceLine({ label: '분광 외피', value: input.elementalistResistanceShift.resC }),
            helpers.formatResistanceSourceLine({ label: '군락 수호구', value: input.colonyWardBonus.resAll || 0 })
        ], extraMaxLines: [
            helpers.formatResistanceSourceLine({ label: '최대 저항, 공통 효과', value: input.sharedElementalMaxRes }),
            helpers.formatResistanceSourceLine({ label: '최대 저항, 영역 고유 효과', value: input.uniqueAllMaxRes }),
            helpers.formatResistanceSourceLine({ label: '최대 저항, 약품 내성', value: input.resistanceBlendMaxBonus }),
            helpers.formatResistanceSourceLine({ label: '최대 저항, 분광 외피', value: input.hasElementalistPrismaticShell ? 3 : 0 }),
            helpers.formatResistanceSourceLine({ label: '최대 저항, 군락 수호구', value: input.colonyWardBonus.maxResC || 0 })
        ] });
}

export function describeStatResL(input, helpers) {
    return helpers.makeResistanceBreakdown({ title: '번개 저항', statId: 'resL', maxStatId: 'maxResL', finalValue: input.finalResL, maxValue: input.finalMaxResL, extraLines: [
            helpers.formatResistanceSourceLine({ label: '약품 내성', value: input.resistanceBlendBonus }),
            helpers.formatResistanceSourceLine({ label: '분광 외피', value: input.elementalistResistanceShift.resL }),
            helpers.formatResistanceSourceLine({ label: '군락 수호구', value: input.colonyWardBonus.resAll || 0 })
        ], extraMaxLines: [
            helpers.formatResistanceSourceLine({ label: '최대 저항, 공통 효과', value: input.sharedElementalMaxRes }),
            helpers.formatResistanceSourceLine({ label: '최대 저항, 영역 고유 효과', value: input.uniqueAllMaxRes }),
            helpers.formatResistanceSourceLine({ label: '최대 저항, 약품 내성', value: input.resistanceBlendMaxBonus }),
            helpers.formatResistanceSourceLine({ label: '최대 저항, 분광 외피', value: input.hasElementalistPrismaticShell ? 3 : 0 }),
            helpers.formatResistanceSourceLine({ label: '최대 저항, 전하 보루', value: input.crusaderLightningMaxResBonus }),
            helpers.formatResistanceSourceLine({ label: '최대 저항, 군락 수호구', value: input.colonyWardBonus.maxResL || 0 })
        ] });
}

export function describeStatResChaos(input, helpers) {
    return helpers.makeResistanceBreakdown({ title: '카오스 저항', statId: 'resChaos', maxStatId: 'maxResChaos', finalValue: input.finalResChaos, maxValue: input.finalMaxResChaos, extraLines: [
            helpers.formatResistanceSourceLine({ label: '약품 내성', value: input.resistanceBlendBonus }),
            helpers.formatResistanceSourceLine({ label: '암흑 치환', value: input.warlockElementalOvercapToChaos }),
            helpers.formatResistanceSourceLine({ label: '분광 외피', value: input.elementalistResistanceShift.resChaos }),
            helpers.formatResistanceSourceLine({ label: '공허 결합', value: input.elementalistChaosConversionBonus }),
            helpers.formatResistanceSourceLine({ label: '군락 수호구', value: input.colonyWardBonus.resChaos || 0 })
        ], extraMaxLines: [
            helpers.formatResistanceSourceLine({ label: '최대 저항, 약품 내성', value: input.resistanceBlendMaxBonus }),
            helpers.formatResistanceSourceLine({ label: '최대 저항, 군락 수호구', value: input.colonyWardBonus.maxResChaos || 0 })
        ] });
}

export function describeStatAilmentResist(input, deps) {
    return {
            title: deps.translate('상태이상 방지 확률'),
            lines: [
                deps.translate('점화 방지: {value}%', { value: input.finalAilmentResistIgniteChance.toFixed(1) }),
                deps.translate('냉각 방지: {value}%', { value: input.finalAilmentResistChillChance.toFixed(1) }),
                deps.translate('동결 방지: {value}%', { value: input.finalAilmentResistFreezeChance.toFixed(1) }),
                deps.translate('감전 방지: {value}%', { value: input.finalAilmentResistShockChance.toFixed(1) }),
                deps.translate('중독 방지: {value}%', { value: input.finalAilmentResistPoisonChance.toFixed(1) }),
                deps.translate('출혈 방지: {value}%', { value: input.finalAilmentResistBleedChance.toFixed(1) })
            ],
            final: deps.translate('{floor}% 공통 방지', { floor: Math.floor(input.ailmentResistBonusPct) })
        };
}

export function describeStatIgniteChance(input, helpers) {
    return helpers.makeAilmentChanceBreakdown({ title: '점화 확률', statId: 'igniteChance', finalValue: input.finalIgniteChance, critValue: input.ailmentCritChance.ignite, note: null, effectLines: helpers.makeDamageAilmentEffectLines({ specificLabel: '점화 피해 증가', specificPct: input.finalIgniteDamageMultiplierPct }) });
}

export function describeStatChillChance(input, deps, helpers) {
    return helpers.makeAilmentChanceBreakdown({ title: '냉각 확률', statId: 'chillChance', finalValue: input.finalChillChance, critValue: input.ailmentCritChance.chill, note: null, effectLines: [deps.translate('냉각은 피해형 상태이상이 아니며 적의 행동 속도를 감소시킵니다.')] });
}

export function describeStatFreezeChance(input, deps, helpers) {
    return helpers.makeAilmentChanceBreakdown({ title: '동결 확률', statId: 'freezeChance', finalValue: input.finalFreezeChance, critValue: input.ailmentCritChance.freeze, note: deps.translate('냉기 피해 치명타는 동결 시도를 보장합니다. 그 외에는 해당 확률로 동결을 시도하며, 시도 성공 후 적의 최대 생명력 대비 타격 피해로 동결 적용 판정을 합니다.'), effectLines: [deps.translate('동결은 피해형 상태이상이 아니며 적의 행동을 정지시킵니다.')] });
}

export function describeStatShockChance(input, deps, helpers) {
    return helpers.makeAilmentChanceBreakdown({ title: '감전 확률', statId: 'shockChance', finalValue: input.finalShockChance, critValue: input.ailmentCritChance.shock, note: null, effectLines: [deps.translate('감전 효과 증가: +{max}%', { max: Math.max(0, input.finalShockEffectBonusPct).toFixed(1) }), deps.translate('감전은 직접 피해를 주지 않고 대상이 받는 피해를 증가시킵니다.')] });
}

export function describeStatAilmentResistIgniteChance(input, helpers) {
    return helpers.makeAilmentResistBreakdown({ title: '점화 저항 확률', ailmentLabel: '점화', ailmentResValue: input.ailResIgniteTotal, finalValue: input.finalAilmentResistIgniteChance, mitigationLines: helpers.makeDamageAilmentMitigationLines({ specificLabel: '점화 피해 감소', specificPct: input.finalIgniteDamageReducePct }) });
}

export function describeStatAilmentResistChillChance(input, deps, helpers) {
    return helpers.makeAilmentResistBreakdown({ title: '냉각 저항 확률', ailmentLabel: '냉각', ailmentResValue: input.ailResFreezeTotal, finalValue: input.finalAilmentResistChillChance, mitigationLines: [deps.translate('냉각 효과 감소: {max}%', { max: Math.max(0, input.finalChillEffectReducePct).toFixed(1) })] });
}

export function describeStatAilmentResistFreezeChance(input, deps, helpers) {
    return helpers.makeAilmentResistBreakdown({ title: '동결 저항 확률', ailmentLabel: '동결', ailmentResValue: input.ailResFreezeTotal, finalValue: input.finalAilmentResistFreezeChance, mitigationLines: [deps.translate('동결 지속시간 감소: {max}%', { max: Math.max(0, input.finalFreezeDurationReducePct).toFixed(1) })] });
}

export function describeStatAilmentResistShockChance(input, deps, helpers) {
    return helpers.makeAilmentResistBreakdown({ title: '감전 저항 확률', ailmentLabel: '감전', ailmentResValue: input.ailResShockTotal, finalValue: input.finalAilmentResistShockChance, mitigationLines: [deps.translate('감전 효과 감소: {max}%', { max: Math.max(0, input.finalShockEffectReducePct).toFixed(1) })] });
}

export function describeStatAilmentResistPoisonChance(input, helpers) {
    return helpers.makeAilmentResistBreakdown({ title: '중독 저항 확률', ailmentLabel: '중독', ailmentResValue: input.ailResPoisonTotal, finalValue: input.finalAilmentResistPoisonChance, mitigationLines: helpers.makeDamageAilmentMitigationLines({ specificLabel: '중독 피해 감소', specificPct: input.finalPoisonDamageReducePct }) });
}

export function describeStatAilmentResistBleedChance(input, helpers) {
    return helpers.makeAilmentResistBreakdown({ title: '출혈 저항 확률', ailmentLabel: '출혈', ailmentResValue: input.ailResBleedTotal, finalValue: input.finalAilmentResistBleedChance, mitigationLines: helpers.makeDamageAilmentMitigationLines({ specificLabel: '출혈 피해 감소', specificPct: input.finalBleedDamageReducePct }) });
}

export function describeStatPoisonChance(input, helpers) {
    return helpers.makeAilmentChanceBreakdown({ title: '중독 확률', statId: 'poisonChance', finalValue: input.finalPoisonChance, critValue: input.ailmentCritChance.poison, note: null, effectLines: helpers.makeDamageAilmentEffectLines({ specificLabel: '중독 피해 증가', specificPct: input.finalPoisonDamageMultiplierPct }) });
}

export function describeStatBleedChance(input, helpers) {
    return helpers.makeAilmentChanceBreakdown({ title: '출혈 확률', statId: 'bleedChance', finalValue: input.finalBleedChance, critValue: input.ailmentCritChance.bleed, note: null, effectLines: helpers.makeDamageAilmentEffectLines({ specificLabel: '출혈 전용 피해 증가', specificPct: 0 }) });
}
