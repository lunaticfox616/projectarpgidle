function describeTalentLine(input, deps, options) {
    const { stat, suffix } = options;
 let v = input.talentStatMap[stat]; return v ? deps.translate('재능 개화 +{value}{suffix} (위 합계에 포함)', { value: Math.round(v * 100) / 100, suffix: suffix || '%' }) : null;
}

// These labels intentionally group only these sources; support and star bonuses stay separate.
function descriptionSourceTotals(input, stat) {
    return {
        gear: (input.gearBase[stat] || 0) + (input.gearExplicit[stat] || 0),
        passive: (input.passive[stat] || 0) + (input.season[stat] || 0)
            + (input.ascend[stat] || 0) + (input.reward[stat] || 0)
    };
}

function describeMakeAilmentChanceBreakdown(input, deps, options) {
    const { title, statId, finalValue, critValue, note, effectLines } = options;
    const sources = descriptionSourceTotals(input, statId);

        return {
            title: deps.translate(title),
            lines: [
                deps.sourceLine('장비', sources.gear, '%', value => `${value.toFixed(1)}%`),
                deps.sourceLine('패시브', sources.passive, '%', value => `${value.toFixed(1)}%`),
                deps.sourceLine('보조스킬룬', input.support[statId] || 0, '%', value => `${value.toFixed(1)}%`),
                deps.sourceLine('성좌 각성', input.starBlessing[statId] || 0, '%', value => `${value.toFixed(1)}%`),
                note || deps.translate('치명타 시 해당 상태 이상 확률: {floor}%', { floor: Math.floor(critValue) }),
                note ? null : deps.translate('비치명타는 위 확률을 사용하며, 치명타는 해당 상태 이상 확률에 +25%가 추가됩니다.'),
                ...(effectLines || [])
            ].filter(Boolean),
            final: `${Math.max(0, finalValue).toFixed(1)}%`
        };
}

function describeMakeAilmentResistBreakdown(input, deps, options) {
    const { title, ailmentLabel, ailmentResValue, finalValue, mitigationLines } = options;

        return {
            title: deps.translate(title),
            lines: [
                deps.sourceLine(deps.translate('{ailmentLabel} 방지 확률', { ailmentLabel: deps.translate(ailmentLabel) }), finalValue, '%', value => `${Math.max(0, value).toFixed(1)}%`),
                deps.translate('계산 기준: {ailmentLabel} 방지 옵션 {ailmentResValue}% + 공통 방지 {floor}%', { ailmentLabel: deps.translate(ailmentLabel), ailmentResValue: Number(ailmentResValue || 0).toFixed(1), floor: Math.floor(input.ailmentResistBonusPct) }),
                input.medicineResistanceAilmentBonus.ignite > 0 || input.medicineResistanceAilmentBonus.freeze > 0 || input.medicineResistanceAilmentBonus.shock > 0
                    ? deps.translate('약품 내성: 최고 비-제한 원소 저항 상태이상 방지 +100% (점화 {ignite}% / 냉각/동결 {freeze}% / 감전 {shock}%)', { ignite: input.medicineResistanceAilmentBonus.ignite, freeze: input.medicineResistanceAilmentBonus.freeze, shock: input.medicineResistanceAilmentBonus.shock })
                    : null,
                ...(mitigationLines || []),
                deps.translate('피해 저항(화염/냉기/번개/카오스/물리 피해 감소)은 상태이상 방지 확률에 직접 합산되지 않습니다.')
            ].filter(Boolean),
            final: `${Math.max(0, finalValue).toFixed(1)}%`
        };
}

function describeMakeDamageAilmentEffectLines(input, deps, options) {
    const { specificLabel, specificPct } = options;

        let specificMultiplier = 1 + (Math.max(0, Number(specificPct || 0)) + input.finalAilmentDamagePct) / 100;
        let totalMultiplier = input.catalystAilmentSourceMultiplier * input.totalDotDamageMultiplier * specificMultiplier;
        return [
            deps.translate('지속 피해 배율 스탯: +{max}%', { max: Math.max(0, input.dotPctDmg).toFixed(1) }),
            input.catalystAilmentSourceMultiplier > 1 ? deps.translate('과잉 촉매 기준 피해: x{value}', { value: input.catalystAilmentSourceMultiplier.toFixed(2) }) : null,
            input.totalDotDamageMultiplier !== input.dotStatMultiplier ? deps.translate('키스톤/스킬 포함 지속 피해 배율: x{totalDotDamageMultiplier}', { totalDotDamageMultiplier: input.totalDotDamageMultiplier.toFixed(2) }) : null,
            specificPct > 0 ? `${deps.translate(specificLabel)}: +${Number(specificPct).toFixed(1)}%` : null,
            input.finalAilmentDamagePct > 0 ? deps.translate('상태이상 피해: +{finalAilmentDamagePct}%', { finalAilmentDamagePct: input.finalAilmentDamagePct.toFixed(1) }) : null,
            deps.translate('해당 상태이상 피해 총 배율: x{totalMultiplier} (기본 대비 +{max}%)', { totalMultiplier: totalMultiplier.toFixed(2), max: Math.max(0, (totalMultiplier - 1) * 100).toFixed(1) })
        ].filter(Boolean);
}

function describeMakeDamageAilmentMitigationLines(input, deps, options) {
    const { specificLabel, specificPct } = options;

        let common = Math.max(0, Math.min(90, Number(input.finalDotTakenDamageReducePct || 0)));
        let specific = Math.max(0, Math.min(90, Number(specificPct || 0)));
        let combined = (1 - ((1 - common / 100) * (1 - specific / 100))) * 100;
        return [
            deps.translate('받는 지속 피해 감소: {common}%', { common: common.toFixed(1) }),
            `${deps.translate(specificLabel)}: ${specific.toFixed(1)}%`,
            deps.translate('복합 적용 피해 감소: {combined}%', { combined: combined.toFixed(1) })
        ];
}

function describeFormatSignedPercentagePointLine(deps, options) {
    const { label, value } = options;

        let amount = Number(value || 0);
        if (!amount) return null;
        return `${deps.translate(label)} ${amount > 0 ? '+' : ''}${Math.floor(amount)}%p`;
}

function describeFormatResistanceSourceLine(deps, options) {
    const { label, value } = options;

        let amount = Number(value || 0);
        if (!amount) return null;
        let rendered = Number.isInteger(amount) ? `${Math.abs(amount)}` : Math.abs(amount).toFixed(1);
        return `${deps.translate(label)} ${amount > 0 ? '+' : '-'}${rendered}%`;
}

function describeMakeResistanceBreakdown(input, deps, options) {
    const { title, statId, maxStatId, finalValue, maxValue, extraLines, extraMaxLines } = options;

        const maximum = descriptionSourceTotals(input, maxStatId);
        const sources = descriptionSourceTotals(input, statId);
        return {
            title: deps.translate(title),
            lines: [
                describeFormatResistanceSourceLine(deps, { label: '장비', value: sources.gear }),
                describeFormatResistanceSourceLine(deps, { label: '패시브', value: sources.passive }),
                describeFormatResistanceSourceLine(deps, { label: '보조스킬룬', value: input.support[statId] || 0 }),
                ...(extraLines || []),
                describeFormatResistanceSourceLine(deps, { label: '캠페인 패널티', value: -input.resistPenalty }),
                deps.translate('최대 저항: {floor}% (기본 75%)', { floor: Math.floor(maxValue) }),
                describeFormatResistanceSourceLine(deps, { label: '최대 저항, 장비', value: maximum.gear }),
                describeFormatResistanceSourceLine(deps, { label: '최대 저항, 패시브', value: maximum.passive }),
                describeFormatResistanceSourceLine(deps, { label: '최대 저항, 보조스킬룬', value: input.support[maxStatId] || 0 }),
                ...(extraMaxLines || [])
            ].filter(Boolean),
            final: `${Math.floor(finalValue)}%`
        };
}

export function createStatDescriptionHelpers(input, deps) {
    return {
        talentLine: options => describeTalentLine(input, deps, options),
        makeAilmentChanceBreakdown: options => describeMakeAilmentChanceBreakdown(input, deps, options),
        makeAilmentResistBreakdown: options => describeMakeAilmentResistBreakdown(input, deps, options),
        makeDamageAilmentEffectLines: options => describeMakeDamageAilmentEffectLines(input, deps, options),
        makeDamageAilmentMitigationLines: options => describeMakeDamageAilmentMitigationLines(input, deps, options),
        formatSignedPercentagePointLine: options => describeFormatSignedPercentagePointLine(deps, options),
        formatResistanceSourceLine: options => describeFormatResistanceSourceLine(deps, options),
        makeResistanceBreakdown: options => describeMakeResistanceBreakdown(input, deps, options)
    };
}
