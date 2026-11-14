export function describeStatMove(input, deps, helpers) {
    return {
            title: deps.translate('이동 속도'),
            lines: [
                deps.translate('기본 100%'),
                deps.sourceLine('장비', input.gearBase.move + input.gearExplicit.move, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('패시브', input.passive.move + input.season.move + input.ascend.move + input.reward.move, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('성좌 각성', input.starBlessing.move, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('보조스킬룬', input.support.move, '%', value => `${Math.floor(value)}%`),
                helpers.talentLine({ stat: 'move' }),
                deps.translate('전장 이동: 칸당 {value}초, 초당 {value2}칸', { value: (deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec * 100 / input.finalMove).toFixed(2), value2: (input.finalMove / (deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec * 100)).toFixed(2) }),
                deps.translate('지도 진행도: 기본 대비 {value}배 ({value2}{floor}%)', { value: (input.finalMove / 100).toFixed(2), value2: input.finalMove >= 100 ? '+' : '', floor: Math.floor(input.finalMove - 100) }),
                deps.translate('구간 이동: {max}초', { max: Math.max(0.5, 1.2 * 100 / input.finalMove).toFixed(2) })
            ].filter(Boolean),
            final: `${Math.floor(input.finalMove)}%`
        };
}

export function describeStatHp(input, deps, helpers) {
    return {
            title: deps.translate('최대 생명력'),
            lines: [
                deps.translate('기본 생명력 {floor}', { floor: Math.floor(input.baseHp) }),
                deps.sourceLine('장비', input.gearFlatHp),
                deps.sourceLine('패시브', input.passiveFlatHp),
                deps.sourceLine('성좌 각성', input.starBlessing.flatHp),
                deps.sourceLine('생명력 증가', input.totalPctHp, '%', value => `${Math.floor(value)}%`),
                helpers.talentLine({ stat: 'pctHp' })
            ].filter(Boolean),
            final: `${Math.floor(input.finalMaxHp)}`
        };
}

export function describeStatRegen(input, deps, helpers) {
    return {
            title: deps.translate('초당 재생'),
            lines: [
                deps.sourceLine('장비', input.gearBase.regen + input.gearExplicit.regen, '%', value => `${deps.valueText('regen', value)}%`),
                deps.sourceLine('패시브', input.passive.regen + input.season.regen + input.ascend.regen + input.reward.regen, '%', value => `${deps.valueText('regen', value)}%`),
                deps.sourceLine('보조스킬룬', input.support.regen, '%', value => `${deps.valueText('regen', value)}%`),
                helpers.talentLine({ stat: 'regen' })
            ].filter(Boolean),
            final: `${deps.valueText('regen', input.finalRegen)}%`
        };
}

export function describeStatRegenSuppress(input, deps) {
    return {
            title: deps.translate('재생 억제'),
            lines: [
                deps.sourceLine('장비', input.gearBase.regenSuppress + input.gearExplicit.regenSuppress, '%', value => `${deps.valueText('regenSuppress', value)}%`),
                deps.sourceLine('패시브', input.passive.regenSuppress + input.season.regenSuppress + input.ascend.regenSuppress + input.reward.regenSuppress, '%', value => `${deps.valueText('regenSuppress', value)}%`),
                deps.sourceLine('보조스킬룬', input.support.regenSuppress, '%', value => `${deps.valueText('regenSuppress', value)}%`),
                deps.translate('공격 시 적의 생명력 재생을 해당 수치(%)만큼 줄여주는 옵션입니다.')
            ].filter(Boolean),
            final: `${deps.valueText('regenSuppress', input.finalRegenSuppress)}%`
        };
}

export function describeStatLeech(input, deps) {
    return {
            title: deps.translate('공격 피해의 생명력 흡수'),
            lines: [
                deps.sourceLine('스킬', input.skill.leech || 0, '%', value => `${deps.valueText('leech', value)}%`),
                deps.sourceLine('장비', input.gearBase.leech + input.gearExplicit.leech, '%', value => `${deps.valueText('leech', value)}%`),
                deps.sourceLine('패시브', input.passive.leech + input.season.leech + input.ascend.leech + input.reward.leech, '%', value => `${deps.valueText('leech', value)}%`),
                deps.sourceLine('보조스킬룬', input.support.leech, '%', value => `${deps.valueText('leech', value)}%`),
                input.skill.instantLeech ? deps.translate('흡혈 관통: 이 룬으로 준 피해의 흡혈은 인스턴스 대신 즉시 회복되며 1회 흡혈량 캡을 적용받습니다.') : deps.translate('타격 시 즉시 회복 대신 흡혈 인스턴스 생성'),
                (deps.keystone('wlk3')) ? deps.translate('금단 대가: 흡혈 {value}', { value: input.skill.instantLeech ? deps.translate('즉시 회복이 생명력 대신 에너지 보호막에 적용됩니다.') : deps.translate('인스턴스가 생명력 대신 에너지 보호막에 저장/회복됩니다.') }) : null,
                deps.translate('일반 흡혈 캡: 타격당 최대 생명력 {value}%, 전체 저장 {LEECH_BASE_TOTAL_CAP_PCT}%, 인스턴스당 초당 {LEECH_BASE_RATE_CAP_PCT}%', { value: deps.LEECH_BASE_INSTANCE_CAP_PCT, LEECH_BASE_TOTAL_CAP_PCT: deps.LEECH_BASE_TOTAL_CAP_PCT, LEECH_BASE_RATE_CAP_PCT: deps.LEECH_BASE_RATE_CAP_PCT }),
                deps.translate('일반 흡혈 추가 캡: 회복 속도 +{value}%p, 전체 +{value2}%p, 타격당 +{value3}%p', { value: deps.valueText('leechRateCap', input.finalLeechRateCap), value2: deps.valueText('leechTotalCap', input.finalLeechTotalCap), value3: deps.valueText('leechInstanceCap', input.finalLeechInstanceCap) }),
                deps.translate('적용 전 {value}% → 적용 후 {value2}%', { value: deps.valueText('leech', input.rawLeech), value2: deps.valueText('leech', input.finalLeech) })
            ].filter(Boolean),
            final: `${deps.valueText('leech', input.finalLeech)}%`
        };
}

export function describeStatSpellLeech(input, deps) {
    return {
            title: deps.translate('주문 피해의 생명력 흡수'),
            lines: [deps.sourceLine('스킬', input.skill.spellLeech || 0, '%', value => `${deps.valueText('spellLeech', value)}%`),
                deps.sourceLine('장비', input.gearBase.spellLeech + input.gearExplicit.spellLeech, '%', value => `${deps.valueText('spellLeech', value)}%`),
                deps.sourceLine('기타 성장', input.passive.spellLeech + input.season.spellLeech + input.ascend.spellLeech + input.support.spellLeech + input.reward.spellLeech, '%', value => `${deps.valueText('spellLeech', value)}%`),
                deps.translate('주문 타격 피해에만 적용됩니다. 지속 피해에는 적용되지 않습니다.')].filter(Boolean),
            final: `${deps.valueText('spellLeech', input.finalSpellLeech)}%`
        };
}

export function describeStatDr(input, deps) {
    return {
            title: deps.translate('물리 피해 감소'),
            lines: [
                deps.sourceLine('장비', input.gearBase.dr + input.gearExplicit.dr, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('패시브', input.passive.dr + input.season.dr + input.ascend.dr + input.reward.dr, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('보조스킬룬', input.support.dr, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: input.rawDr > input.finalDr ? deps.translate('{floor}% (상한 {value}% 적용, 합계 {floor2}%)', { floor: Math.floor(input.finalDr), value: deps.PLAYER_PHYSICAL_REDUCTION_CAP_PCT, floor2: Math.floor(input.rawDr) }) : `${Math.floor(input.finalDr)}%`
        };
}

export function describeStatArmor(input, deps) {
    return {
            title: deps.translate('방어도'),
            lines: [
                deps.sourceLine('장비', input.gearBase.armor + input.gearExplicit.armor),
                deps.sourceLine('패시브', input.passive.armor + input.season.armor + input.ascend.armor + input.reward.armor),
                deps.sourceLine('방어도 증가', input.totalArmorPct, '%', value => `${Math.floor(value)}%`),
                deps.translate('예상 물리 피해 감소율(기준 타격 {floor}): {armorReduction}%', { floor: Math.floor(input.referenceIncomingPhysical), armorReduction: input.armorReduction.toFixed(1) })
            ].filter(Boolean),
            final: `${Math.floor(input.finalArmor)}`
        };
}

export function describeStatEvasion(input, deps) {
    return {
            title: deps.translate('회피'),
            lines: [
                deps.sourceLine('장비', input.gearBase.evasion + input.gearExplicit.evasion),
                deps.sourceLine('패시브', input.passive.evasion + input.season.evasion + input.ascend.evasion + input.reward.evasion),
                deps.sourceLine('회피 증가', input.totalEvasionPct, '%', value => `${Math.floor(value)}%`),
                deps.sourceLine('기수의 나침반 증폭', input.riderCompassEvasionMorePct, '%', value => `${Math.floor(value)}%`),
                deps.translate('예상 회피 확률(동일 레벨 적 기준): {evadeChance}%', { evadeChance: input.evadeChance.toFixed(1) }),
                deps.translate('정확도: {floor} (힘 {floor2}, 민첩 {floor3}, 지능 {floor4})', { floor: Math.floor(input.playerAccuracy), floor2: Math.floor(input.totalStrength), floor3: Math.floor(input.totalDexterity), floor4: Math.floor(input.totalIntelligence) })
            ].filter(Boolean),
            final: `${Math.floor(input.finalEvasion)}`
        };
}

export function describeStatEnergyShield(input, deps) {
    return {
            title: deps.translate('에너지 보호막'),
            lines: [
                deps.sourceLine('장비', input.gearBase.energyShield + input.gearExplicit.energyShield),
                deps.sourceLine('패시브', input.passive.energyShield + input.season.energyShield + input.ascend.energyShield + input.reward.energyShield),
                deps.sourceLine('보호막 증가', input.totalEnergyShieldPct, '%', value => `${Math.floor(value)}%`),
                deps.translate('재충전 대기시간: {value}초', { value: input.finalEnergyShieldRechargeDelay.toFixed(2) }),
                deps.translate('에너지 보호막 재생량: 초당 {floor} ({value}%)', { floor: Math.floor(input.finalEnergyShield * (input.finalEnergyShieldRegenRate / 100)), value: input.finalEnergyShieldRegenRate.toFixed(1) })
            ].filter(Boolean),
            final: `${Math.floor(input.finalEnergyShield)}`
        };
}

export function describeStatAccuracy(input, deps) {
    return {
            title: deps.translate('정확도'),
            lines: [
                deps.translate('기본 {PLAYER_ACCURACY_BASE} + 레벨 성장(레벨 {max} × {value} = {value2})', { PLAYER_ACCURACY_BASE: deps.PLAYER_ACCURACY_BASE, max: Math.max(1, Math.floor(input.owner.level || 1)), value: deps.PLAYER_ACCURACY_PER_LEVEL, value2: Math.max(1, Math.floor(input.owner.level || 1)) * deps.PLAYER_ACCURACY_PER_LEVEL }),
                deps.sourceLine(deps.translate('민첩 파생(민첩 × {value})', { value: deps.PLAYER_ACCURACY_PER_DEXTERITY }), input.totalDexterity * deps.PLAYER_ACCURACY_PER_DEXTERITY),
                deps.sourceLine('장비/기타 정확도', input.flatAccuracy),
                deps.sourceLine('정확도 보정', input.accuracyBonusPct, '%', value => `${Math.floor(value)}%`),
                deps.translate('효과: 적의 회피 수치와 대결해 명중을 판정합니다. 정확도가 높을수록 고회피 적에게 덜 빗나갑니다.'),
                deps.translate('예: 회피 500 적 상대 예상 명중률 {floor}%, 회피 2000 적 상대 {floor2}%', { floor: Math.floor(100 - deps.totalEvadeChance({ evasion: 500 }, input.playerAccuracy)), floor2: Math.floor(100 - deps.totalEvadeChance({ evasion: 2000 }, input.playerAccuracy)) }),
                deps.translate('적 회피 대비 빗나감은 최대 45%p, 적의 별도 회피 확률 옵션과 합쳐 총 70%가 상한입니다.')
            ].filter(Boolean),
            final: `${Math.floor(input.playerAccuracy)}`
        };
}

export function describeStatStrength(input, deps) {
    return {
            title: deps.translate('힘'),
            lines: [deps.translate('1당 최대 생명력 +2, 5당 물리 피해 +1%'), deps.translate('최대 생명력 +{floor}, 물리 피해 +{floor2}%', { floor: Math.floor(input.totalStrength * 2), floor2: Math.floor(input.totalStrength / 5) })],
            final: `${Math.floor(input.totalStrength)}`
        };
}

export function describeStatDexterity(input, deps) {
    return {
            title: deps.translate('민첩'),
            lines: [deps.translate('1당 회피 +3, 정확도 +{value}, 5당 투사체 피해 +1%', { value: deps.PLAYER_ACCURACY_PER_DEXTERITY }), deps.translate('회피 +{floor}, 정확도 +{floor2}, 투사체 피해 +{floor3}%', { floor: Math.floor(input.totalDexterity * 3), floor2: Math.floor(input.totalDexterity * deps.PLAYER_ACCURACY_PER_DEXTERITY), floor3: Math.floor(input.totalDexterity / 5) })],
            final: `${Math.floor(input.totalDexterity)}`
        };
}

export function describeStatIntelligence(input, deps) {
    return {
            title: deps.translate('지능'),
            lines: [deps.translate('1당 에너지 보호막 +2, 5당 주문 피해 +1%'), deps.translate('에너지 보호막 +{floor}, 주문 피해 +{floor2}%', { floor: Math.floor(input.totalIntelligence * 2), floor2: Math.floor(input.totalIntelligence / 5) })],
            final: `${Math.floor(input.totalIntelligence)}`
        };
}

export function describeStatBlockChance(input, deps) {
    return {
            title: deps.translate('막기 확률'),
            lines: [
                deps.sourceLine('완갑과 대검 기본 막기', input.shieldBaseBlockChance, '%', value => `${value.toFixed(1)}%`),
                deps.sourceLine('장비 막기 확률 증가', input.shieldBlockChancePct, '%', value => `${value.toFixed(1)}%`),
                input.effectiveShieldBaseBlockChance !== input.shieldBaseBlockChance ? deps.translate('증가 적용 기본 막기: {value}%', { value: input.effectiveShieldBaseBlockChance.toFixed(1) }) : null,
                deps.sourceLine('기타 막기 확률 증가', input.blockChanceFromOtherPct, '%', value => `${value.toFixed(1)}%`),
                deps.sourceLine('막기 확률 보너스', input.flatBlockChanceBonus, '%', value => `${value.toFixed(1)}%`),
                deps.translate('막기 확률 상한: {finalBlockChanceCap}%', { finalBlockChanceCap: input.finalBlockChanceCap.toFixed(1) }),
                deps.translate('몬스터의 일반 타격 피해를 막으면 해당 타격 피해를 받지 않습니다.')
            ].filter(Boolean),
            final: `${input.finalBlockChance.toFixed(1)}%`
        };
}

export function describeStatBlockChanceMax(input, deps) {
    return {
            title: deps.translate('막기 확률 상한'),
            lines: [
                deps.translate('기본 막기 확률 상한 50%'),
                deps.sourceLine('상한 증가', Math.max(0, input.sumStatAcrossBuckets('blockChanceMax')), '%', value => `${value.toFixed(1)}%`),
                deps.translate('상한 증가는 최대 75%까지 적용됩니다.')
            ],
            final: `${input.finalBlockChanceCap.toFixed(1)}%`
        };
}

export function describeStatDeflectChance(input, deps) {
    return {
            title: deps.translate('비껴내기 확률'),
            lines: [
                deps.sourceLine('장비', input.gearBase.deflectChance + input.gearExplicit.deflectChance, '%', value => `${value.toFixed(1)}%`),
                deps.sourceLine('패시브', input.passive.deflectChance + input.season.deflectChance + input.ascend.deflectChance + input.reward.deflectChance, '%', value => `${value.toFixed(1)}%`),
                deps.sourceLine('보조스킬룬', input.support.deflectChance, '%', value => `${value.toFixed(1)}%`),
                deps.translate('비껴내기 성공 시 피해 감소: {min}%', { min: Math.min(85, 40 + input.finalDeflectDamageReduce).toFixed(1) }),
                deps.translate('기본 피해 감소 40%에 비껴내기 피해 감소 옵션이 더해지며, 최대 85%까지 적용됩니다.')
            ].filter(Boolean),
            final: `${input.finalDeflectChance.toFixed(1)}%`
        };
}

export function describeStatDeflectDamageReduce(input, deps) {
    return {
            title: deps.translate('비껴내기 피해 감소'),
            lines: [
                deps.sourceLine('장비', input.gearBase.deflectDamageReduce + input.gearExplicit.deflectDamageReduce, '%', value => `${value.toFixed(1)}%`),
                deps.sourceLine('패시브', input.passive.deflectDamageReduce + input.season.deflectDamageReduce + input.ascend.deflectDamageReduce + input.reward.deflectDamageReduce, '%', value => `${value.toFixed(1)}%`),
                deps.sourceLine('보조스킬룬', input.support.deflectDamageReduce, '%', value => `${value.toFixed(1)}%`),
                deps.translate('실제 감소율은 기본 40% + 이 수치입니다.')
            ].filter(Boolean),
            final: `${input.finalDeflectDamageReduce.toFixed(1)}%`
        };
}
