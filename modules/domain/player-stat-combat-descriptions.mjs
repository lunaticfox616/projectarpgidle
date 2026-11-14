function describeStatAtkLines1(input, deps, helpers) {
    return [
        input.isSpellSkill ? deps.translate('주문 내장 피해 {floor}', { floor: Math.floor(input.spellFlatDmg) }) : deps.translate('기본 공격력 {floor}', { floor: Math.floor(input.baseDmg) }),
        input.isSpellSkill ? null : deps.sourceLine('장비', input.gearFlatDmg),
        input.isSpellSkill ? null : deps.sourceLine('패시브', input.passiveFlatDmg),
        deps.sourceLine('성좌 각성', input.starBlessing.pctDmg, '%', value => `${Math.floor(value)}%`),
        deps.sourceLine('총 피해 증가', input.generalPctDmg, '%', value => `${Math.floor(value)}%`),
        deps.sourceLine('태그 보너스', input.baseTaggedTotal, '%', value => `${Math.floor(value)}%`),
        helpers.talentLine({ stat: 'pctDmg' }),
        input.crusaderThunderDoctrinePct > 0 ? deps.sourceLine('천뢰 교리(화염/냉기 → 번개)', input.crusaderThunderDoctrinePct, '%', value => `${Math.floor(value)}%`) : null,
        input.crusaderThunderDoctrinePct > 0 ? deps.sourceLine('피해 증가 합계', input.generalPctDmg + input.taggedTotal, '%', value => `${Math.floor(value)}%`) : null,
        input.taggedSummary.length > 0 ? deps.translate('적용 태그: {taggedSummary}', { taggedSummary: input.taggedSummary.join(' / ') }) : null,
        deps.translate('스킬 배율 {dmg}', { dmg: deps.percentMultiplier(input.skill.dmg || 1) }),
        (input.skill.hpDmgScale || 0) > 0 ? deps.translate('생명력 계수 내장 피해 +{floor} (최대 생명력 {floor2}, 피해 증가 적용)', { floor: Math.floor(input.hpFlatBonus), floor2: Math.floor(input.finalMaxHp) }) : null
    ];
}

function describeStatAtkLines2(input, deps) {
    return [
        input.crusaderHolyFlatDmg > 0 ? deps.translate('신성한 검 번개 기본 피해 +{floor} → {floor2} (피해 증가 적용)', { floor: Math.floor(input.crusaderHolyFlatDmg), floor2: Math.floor(input.crusaderHolyScaledDmg) }) : null,
        (input.skill.regenDmgScale || 0) > 0 ? deps.translate('재생 계수 배율 {regenScaledBonus}x (재생 {value}%)', { regenScaledBonus: input.regenScaledBonus.toFixed(2), value: deps.valueText('regen', input.finalRegen) }) : null,
        (input.skill.fireResDmgScale || 0) > 0 ? deps.translate('화염 저항 계수 배율 {fireResScaledBonus}x (화염 저항 {floor}%)', { fireResScaledBonus: input.fireResScaledBonus.toFixed(2), floor: Math.floor(input.finalResF) }) : null,
        (input.skill.fireResOvercapMulPerPct || 0) > 0 ? deps.translate('초과 화염 저항 계수 배율 {fireResScaledBonus}x (미적용 화염 저항 {floor}%/{floor2}%, 초과 {fireResOvercap}% 중 적용 {effectiveFireResOvercap}%)', { fireResScaledBonus: input.fireResScaledBonus.toFixed(2), floor: Math.floor(input.fireResForOvercap), floor2: Math.floor(input.maxResFForOvercap), fireResOvercap: input.fireResOvercap.toFixed(1), effectiveFireResOvercap: input.effectiveFireResOvercap.toFixed(1) }) : null,
        (input.skill.dotMultiplier || 1) !== 1 ? deps.translate('스킬 지속 피해 배율 {dotMultiplier}x', { dotMultiplier: input.dotMultiplier.toFixed(2) }) : null
    ];
}

function describeStatAtkLines3(input, deps) {
    return [
        input.dotPctDmg > 0 ? deps.translate('지속 피해 배율 스탯 {floor}% ({dotStatMultiplier}x)', { floor: Math.floor(input.dotPctDmg), dotStatMultiplier: input.dotStatMultiplier.toFixed(2) }) : null,
        input.instantDamageMultiplier !== 1 ? deps.translate('즉발 피해 배율 {instantDamageMultiplier}x', { instantDamageMultiplier: input.instantDamageMultiplier.toFixed(2) }) : null,
        input.finalDamageMultiplier !== 1 ? deps.translate('최종 피해 배율 {finalDamageMultiplier}x', { finalDamageMultiplier: input.finalDamageMultiplier.toFixed(2) }) : null,
        input.chaosDamageMultiplier !== 1 ? deps.translate('카오스 피해 배율 {chaosDamageMultiplier}x', { chaosDamageMultiplier: input.chaosDamageMultiplier.toFixed(2) }) : null,
        input.skill.convertedToChaos ? deps.translate('워록 심연 각인: 모든 공격 피해를 카오스 피해로 적용') : null,
        (deps.keystone('sb7') && input.sbSummonShareToPlayer > 0) ? deps.translate('상호 보완: 소환수 공격력 {floor}의 75% → 기본 피해 +{floor2}', { floor: Math.floor(input.sbSummonAttackPower), floor2: Math.floor(input.sbSummonShareToPlayer) }) : null
    ];
}

function describeStatAtkLines4(input, deps) {
    return [
        (deps.keystone('sb7') && !deps.keystone('sb5') && input.sbPlayerAttackPower > 0) ? deps.translate('상호 보완: 내 공격력 {floor}의 75%(+{floor2})를 각 소환수 타격에 전달', { floor: Math.floor(input.sbPlayerAttackPower), floor2: Math.floor(0.75 * input.sbPlayerAttackPower) }) : null,
        deps.translate('피해 범위 {floor}% ~ {floor2}%', { floor: Math.floor(input.finalMinDmgRoll), floor2: Math.floor(input.finalMaxDmgRoll) })
    ];
}

export function describeStatAtk(input, deps, helpers) {
    return {
            title: deps.translate('공격력'),
            lines: [...describeStatAtkLines1(input, deps, helpers), ...describeStatAtkLines2(input, deps), ...describeStatAtkLines3(input, deps), ...describeStatAtkLines4(input, deps)].filter(Boolean),
            final: `${Math.floor(input.finalBaseDmg)}`
        };
}

export function describeStatAps(input, deps, helpers) {
    return {
            title: deps.translate('공속'),
            lines: [
                deps.translate('기본 1.00'),
                deps.sourceLine('장비', input.gearAspd, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('패시브', input.passiveAspd, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('보조스킬룬', input.support.aspd, '%', value => `${Math.floor(value)}%`),
                helpers.talentLine({ stat: 'aspd' }),
                input.glovePairAspdBonus > 0 ? deps.translate('동형 장갑 세트 보너스 +{glovePairAspdBonus} 기본 공속', { glovePairAspdBonus: input.glovePairAspdBonus.toFixed(2) }) : null,
                deps.translate('공격 속도 배율 {spd}', { spd: deps.percentMultiplier(input.skill.spd || 1) }),
                input.skillDelayPct > 0 ? deps.translate('스킬 딜레이 감소 {skillDelayPct}%: 공격 횟수와 DPS {value}', { skillDelayPct: input.skillDelayPct, value: deps.percentMultiplier(1 / (1 - input.skillDelayPct / 100)) }) : null,
                input.rawAspd > 5 ? deps.translate('소프트캡 적용중 (원시 {rawAspd} → 최종 {finalAspd})', { rawAspd: input.rawAspd.toFixed(2), finalAspd: input.finalAspd.toFixed(2) }) : null
            ].filter(Boolean),
            final: `${input.finalAspd.toFixed(2)}`
        };
}

export function describeStatCrit(input, deps, helpers) {
    return {
            title: deps.translate('치명타 확률'),
            lines: [
                deps.translate('기본 2.5%'),
                deps.sourceLine('장비', input.gearCrit, '%', value => `${value.toFixed(1)}%`),
                deps.sourceLine('패시브', input.passiveCrit, '%', value => `${value.toFixed(1)}%`),
                deps.sourceLine('보조스킬룬', input.support.crit, '%', value => `${value.toFixed(1)}%`),
                deps.sourceLine('스킬', input.skill.crit || 0, '%', value => `${value.toFixed(1)}%`),
                helpers.talentLine({ stat: 'crit' })
            ].filter(Boolean),
            final: `${input.finalCrit.toFixed(1)}%`
        };
}

export function describeStatCritDmg(input, deps, helpers) {
    return {
            title: deps.translate('치명타 피해'),
            lines: [
                deps.translate('기본 {value}%', { value: deps.CRIT_DAMAGE_BASE_MULTIPLIER }),
                deps.sourceLine('장비', input.gearBase.critDmg + input.gearExplicit.critDmg, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('패시브', input.passive.critDmg + input.season.critDmg + input.ascend.critDmg + input.reward.critDmg, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('보조스킬룬', input.support.critDmg, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('스킬/특수 효과', (input.skill.critDmgBonus || 0) + (input.activeShadowStealth ? Math.max(0, Number(input.uniqueDeflectStealth.critDmg || 20)) : 0), '%', value => `${Math.floor(value)}%`),
                ...(input.critDmgSoftcapReduction > 0 ? [deps.sourceLine('소프트캡(200/400/800/1200)', -input.critDmgSoftcapReduction, '%', value => `${Math.floor(value)}%`)] : []),
                helpers.talentLine({ stat: 'critDmg' })
            ].filter(Boolean),
            final: `${Math.floor(input.finalCritDmg)}%`
        };
}

export function describeStatDs(input, deps, helpers) {
    return {
            title: deps.translate('연속 타격'),
            lines: [
                deps.sourceLine('장비', input.gearBase.ds + input.gearExplicit.ds, '%p', value => `${Math.floor(value)}%p`),
                deps.sourceLine('패시브', input.passive.ds + input.season.ds + input.ascend.ds + input.reward.ds, '%p', value => `${Math.floor(value)}%p`),
                deps.sourceLine('보조스킬룬', input.support.ds, '%p', value => `${Math.floor(value)}%p`),
                deps.sourceLine('스킬', input.skillDsBonus, '%p', value => `${Math.floor(value)}%p`),
                helpers.formatSignedPercentagePointLine({ label: '기타 효과', value: input.finalDs - input.baseDsFromSources - input.skillDsBonus }),
                deps.translate('각 수치는 연속 타격 확률에 합산되는 %p입니다.')
            ].filter(Boolean),
            final: `${Math.floor(input.finalDs)}%`
        };
}

export function describeStatPhysIgnore(input, deps) {
    return {
            title: deps.translate('물리 피해 감소 무시'),
            lines: [
                deps.sourceLine('장비', input.gearBase.physIgnore + input.gearExplicit.physIgnore, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('패시브', input.passive.physIgnore + input.season.physIgnore + input.ascend.physIgnore + input.reward.physIgnore, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('보조스킬룬', input.support.physIgnore, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('각인', input.skill.physIgnoreBonus || 0, '%', value => `${Math.floor(value)}%`),
                deps.translate('적의 양수 물리 피해 감소만 0%까지 깎습니다.')
            ].filter(Boolean),
            final: `${Math.floor(input.finalPhysIgnore)}%`
        };
}

export function describeStatResPen(input, deps) {
    return {
            title: deps.translate('저항 관통'),
            lines: [
                deps.sourceLine('장비', input.gearBase.resPen + input.gearExplicit.resPen, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('패시브', input.passive.resPen + input.season.resPen + input.ascend.resPen + input.reward.resPen, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('보조스킬룬', input.support.resPen, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('각인', input.skill.resPenBonus || 0, '%', value => `${Math.floor(value)}%`),
                deps.translate('원소/카오스 저항은 음수까지 떨어질 수 있으며, 음수만큼 추가 피해를 줍니다.')
            ].filter(Boolean),
            final: `${Math.floor(input.finalResPen)}%`
        };
}

export function describeStatDmgRoll(input, deps) {
    return {
            title: deps.translate('피해 보정 범위'),
            lines: [
                deps.sourceLine('최소', input.finalMinDmgRoll, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('최대', input.finalMaxDmgRoll, '%', value => `${Math.floor(value)}%`)
            ],
            final: `${Math.floor(input.finalMinDmgRoll)}% ~ ${Math.floor(input.finalMaxDmgRoll)}%`
        };
}

function describeStatDpsLines1(input, deps) {
    return [
        deps.translate('평균 한 방 {floor}', { floor: Math.floor(input.avgHit) }),
        deps.translate('공격 속도 {finalAspd}', { finalAspd: input.finalAspd.toFixed(2) }),
        deps.translate('치명 기대값 반영'),
        input.crusaderThunderDoctrinePct > 0 ? deps.translate('천뢰 교리 반영: 화염/냉기 피해 증가 +{floor}%가 번개 공격력/평균 한 방/DPS에 적용', { floor: Math.floor(input.crusaderThunderDoctrinePct) }) : null,
        input.inquisitorAbsoluteDoctrinePct > 0 ? deps.translate('절대 교리 반영: 저항 관통 +{floor}%가 원소 피해/평균 한 방/DPS에 적용', { floor: Math.floor(input.inquisitorAbsoluteDoctrinePct) }) : null,
        deps.translate('피해 보정 기대값 x{avgRollMultiplier} ({floor}~{floor2}%)', { avgRollMultiplier: input.avgRollMultiplier.toFixed(2), floor: Math.floor(input.finalMinDmgRoll), floor2: Math.floor(input.finalMaxDmgRoll) }),
        deps.translate('연속 타격 기대값 x{value} ({floor}%)', { value: input.expectedDoubleStrikeMultiplier.toFixed(2), floor: Math.floor(input.finalDs) }),
        input.coreCubeAddedDamageTotalPct > 0 ? deps.translate('추가 피해 x{value} (총 피해의 {floor}% → {coreCubeAddedDamageParts})', { value: input.expectedAddedDamageMultiplier.toFixed(2), floor: Math.floor(input.coreCubeAddedDamageTotalPct), coreCubeAddedDamageParts: input.coreCubeAddedDamageParts.join(' / ') }) : null,
        input.isProjectileSkillForDps && input.fanSpread.extraShotDpsMul > 1 ? deps.translate('투사체 추가 발사 기대값 x{value} (추가 확률 {value2}%, 발사 상한 반영, 발당 {round}% 피해)', { value: input.projectileExtraShotDpsMul.toFixed(2), value2: deps.valueText('projectileExtraChance', input.projectileExtraShotsForDps * 100), round: Math.round(input.projectileBonusShotDamagePct) }) : null,
        input.skillSequenceDpsMultiplier > 1 ? deps.translate('강타 여진 기대값 x{value} (본 타격 후 독립 여진)', { value: input.skillSequenceDpsMultiplier.toFixed(2) }) : null,
        input.estimatedSkillDotDps > 0 ? deps.translate('지속 피해 기대값 +{floor} DPS (틱 {value}% / {max}초, 예상 중첩 {floor2}/{DOT_STACK_MAX})', { floor: Math.floor(input.estimatedSkillDotDps), value: deps.DOT_TICK_FROM_HIT_RATIO * 100, max: Math.max(0.02, deps.DOT_TICK_INTERVAL * Math.max(0.05, input.dotTickIntervalMultiplier)).toFixed(2), floor2: Math.floor((input.damageScales.estimatedDotStacks || 1)), DOT_STACK_MAX: deps.DOT_STACK_MAX }) : null,
        input.warriorPhysicalDpsMultiplier > 1 ? deps.translate('격노 순환 x{value} ({get}/{WARRIOR_RAGE_STACK_MAX}중첩)', { value: input.warriorPhysicalDpsMultiplier.toFixed(2), get: input.tick.get('warriorRageStacks'), WARRIOR_RAGE_STACK_MAX: deps.WARRIOR_RAGE_STACK_MAX }) : null
    ];
}

function describeStatDpsLines2(input, deps) {
    return [
        (deps.keystone('sb7') && input.sbSummonShareToPlayer > 0) ? deps.translate('상호 보완: 소환수 공격력 공유로 기본 피해 +{floor} 반영 (DPS 포함)', { floor: Math.floor(input.sbSummonShareToPlayer) }) : null
    ];
}

export function describeStatDps(input, deps) {
    return {
            title: 'DPS',
            lines: input.nativeDotPattern ? [
                deps.translate('지속 피해 1회 {floor}', { floor: Math.floor(input.finalBaseDmg * input.totalDotDamageMultiplier) }),
                deps.translate('{value}초마다 {ticks}회', { value: input.nativeDotPattern.intervalMs / 1000, ticks: input.nativeDotPattern.ticks }),
                deps.translate('중복 시전 불가')
            ] : [...describeStatDpsLines1(input, deps), ...describeStatDpsLines2(input, deps)].concat(deps.fanLines(input.fanSpread, input.finalPlayerSkillDps), input.flameDecayDpsLines).filter(Boolean),
            final: `${Math.floor(input.finalPlayerSkillDps)}`
        };
}

export function describeStatGem(input, deps) {
    return {
            title: deps.translate('룬 레벨 보너스'),
            lines: [
                deps.sourceLine('패시브', input.gemSources.passive + input.gemSources.reward),
                deps.sourceLine('장비', input.gemSources.gear)
            ].filter(Boolean),
            final: deps.translate('총 +{total}', { total: input.gemSources.total })
        };
}
