const atLeastOne = value => Math.max(1, Number(value) || 1);

function describeExtraBucketSourceLines(deps, b, stats, named) {

    const sumOf = bucket => stats.reduce((sum, stat) => sum + (Number(bucket[stat]) || 0), 0);
    return [
        deps.sourceLine('장비', sumOf(b.gearBase) + sumOf(b.gearExplicit)),
        deps.sourceLine('패시브 트리', sumOf(b.passive) - named.reduce((sum, row) => sum + row.value, 0)),
        ...named.map(row => deps.sourceLine(row.label, row.value)),
        deps.sourceLine('전직', sumOf(b.ascend)),
        deps.sourceLine('기타 성장', sumOf(b.season) + sumOf(b.reward))
    ];
}

function describeExtraProjectileShotsBreakdown(deps, b, extra) {

    const projectile = (extra.skill.tags || []).includes('projectile'), pattern = extra.skill.projectilePattern;
    const total = ['gearBase', 'gearExplicit', 'passive', 'season', 'ascend', 'reward'].reduce((sum, key) => sum + (Number(b[key].projectileExtraShots) || 0), 0);
    let why = projectile ? null : deps.translate('지금 주 스킬룬은 투사체 스킬이 아니어서 붙지 않습니다.');
    if (projectile && pattern && pattern.kind === 'fan') why = deps.translate('부채꼴로 쏘는 스킬룬에는 붙지 않습니다.');
    return { title: deps.translate('투사체 추가 발사'), final: `+${Math.floor(total)}`, lines: [...describeExtraBucketSourceLines(deps, b, ['projectileExtraShots'], [{ label: '칼날 다발', value: extra.bladeShots }]),
        extra.chancePct > 0 ? deps.translate('추가 발사 확률 {value}%', { value: Math.round(extra.chancePct) }) : null, why].filter(Boolean) };
}

function describeExtraTargetsBreakdown(deps, b, extra) {

    const tags = extra.skill.tags || [], projectile = tags.includes('projectile');
    const stats = ['targetAny'].concat(projectile ? ['targetProjectile'] : [], tags.includes('slam') ? ['targetSlam'] : []);
    const base = atLeastOne(extra.baseTargets), capped = atLeastOne(extra.cappedTargets), finalTargets = atLeastOne(extra.skill.targets);
    const cap = projectile ? 12 : 6;
    return { title: deps.translate('대상 추가'), final: deps.translate('대상 {value} (+{added})', { value: finalTargets, added: finalTargets - base }), lines: [
        deps.translate('주 스킬룬 기본 대상 {value}', { value: base }), ...describeExtraBucketSourceLines(deps, b, stats, []),
        deps.sourceLine('각인, 효과 확장', finalTargets - capped), capped === cap && capped > base ? deps.translate('대상 상한 {value}', { value: cap }) : null].filter(Boolean) };
}

function describeExtraGetProjectileTargetBreakdowns(deps, b, extra) {
return { projectileShots: describeExtraProjectileShotsBreakdown(deps, b, extra), targets: describeExtraTargetsBreakdown(deps, b, extra) };
}

function describeRevelationEffect(deps, rules, devotion) {
    let revelationEffect = deps.translate('헌신을 1 이상 확보하면 계시를 선택할 수 있습니다.');
    if (devotion > 0 && rules.revelation === 'combat') {
        revelationEffect = deps.translate('주는 피해 {combatDamageMorePct}% 증폭', { combatDamageMorePct: rules.combatDamageMorePct });
    } else if (devotion > 0 && rules.revelation === 'guard') {
        revelationEffect = deps.translate('받는 피해 {guardTakenLessPct}% 감폭', { guardTakenLessPct: rules.guardTakenLessPct });
    } else if (devotion > 0 && rules.revelation === 'life') {
        revelationEffect = deps.translate('최대 생명력/에너지 보호막/초당 재생 각각 +{value}%', { value: deps.valueText('regen', rules.lifeBonusPct) });
    } else if (devotion > 0 && rules.revelation === 'fanaticism') {
        revelationEffect = deps.translate('열광 {fanaticismStacks}/{floor}, 1당 피해 1.5%, 공격 속도 0.5% 증가', { fanaticismStacks: rules.fanaticismStacks, floor: Math.floor(devotion) });
    }
    return revelationEffect;
}

function describeExtraGetPassiveSpecialStatBreakdowns(deps, rules) {
    const mystique = Math.max(0, Number(rules.mystique && rules.mystique.damagePct) || 0);
    const cycle = Math.max(0, Number(rules.cycle) || 0);
    const devotion = Math.max(0, Number(rules.devotion) || 0);
    const ailmentLabel = deps.translate(deps.ailmentLabel(rules.mystique && rules.mystique.ailment));
    const activeCycleLines = (rules.activeCycleBuffEffects || []).map(effect => {
        const stat = deps.P_STATS[effect.stat] || {};
        const suffix = stat.isPct ? '%' : '';
        return deps.translate('{source} 종료 효과: {stat} +{stat2}{suffix}', { source: deps.translate(deps.ailmentLabel(effect.source)), stat: deps.translate(deps.statName(effect.stat)), stat2: deps.valueText(effect.stat, effect.val), suffix });
    });
    const revelationEffect = describeRevelationEffect(deps, rules, devotion);
    return {
        mystique: {
            title: deps.translate('신비'),
            lines: [deps.translate('가장 높은 피해 속성에 대응하는 {ailmentLabel} 강화', { ailmentLabel }),
                deps.translate('{ailmentLabel} 피해 +{value}%, 위력 +{value2}%', { ailmentLabel, value: deps.valueText('mystique', mystique), value2: deps.valueText('mystique', mystique) }),
                deps.translate('{ailmentLabel} 유발 확률 +{floor}%p', { ailmentLabel, floor: Math.floor(mystique / 3) })],
            final: deps.valueText('mystique', mystique)
        },
        cycle: {
            title: deps.translate('순환'),
            lines: [deps.translate('적에게 적용한 상태이상이 종료되면 해당 유형에 따른 강화가 6초간 적용됩니다.'),
                deps.translate('순환 1당 대응 속성 피해 +2%와 유형별 보조 효과를 얻습니다.'),
                ...(activeCycleLines.length > 0 ? activeCycleLines : [deps.translate('현재 활성화된 순환 강화 없음')]),
                rules.cycleAddedFireFromPhysicalPct > 0 ? deps.translate('순환의 원석: 물리 피해의 {value}%를 화염 피해로 추가', { value: rules.cycleAddedFireFromPhysicalPct }) : null
            ].filter(Boolean),
            final: deps.valueText('cycle', cycle)
        },
        revelation: {
            title: deps.translate('계시'),
            lines: [deps.translate('계시 수치(헌신) {value}', { value: deps.valueText('devotion', devotion) }), revelationEffect],
            final: deps.translate(devotion > 0 ? rules.revelationLabel : '미해금')
        }
    };
}

function describeExtraAppendPlayerDpsBreakdowns(deps, stats, summonEstimate) {

    if (!stats.breakdowns) return;
    let directLines = stats.breakdowns.dps.lines;
    stats.breakdowns.directDps = {
        title: deps.translate('직접 DPS'), lines: directLines.slice(), final: `${Math.floor(stats.directDps)}`
    };
    stats.breakdowns.summonDps = {
        title: deps.translate('소환 DPS'), lines: summonEstimate.lines || [], final: `${Math.floor(stats.summonDps)}`
    };
    stats.breakdowns.summonCap = {
        title: deps.translate('소환수 한도'),
        lines: [
            deps.translate('현재 소환 한도 {summonCap}', { summonCap: stats.summonCap }),
            deps.translate('최대 소환 한도 {summonCapMaximum}', { summonCapMaximum: deps.summonMaximum() }),
            deps.translate(deps.keystone('sb9') ? '대군주: 현재 생명력이 가장 낮은 하위 1/3(최대 4기)이 유령 상태' : '기본 최대 한도 8')
        ],
        final: deps.translate('{summonCap} / 최대 {summonCapMaximum}', { summonCap: stats.summonCap, summonCapMaximum: deps.summonMaximum() })
    };
    stats.breakdowns.dps = {
        title: deps.translate('총 DPS'),
        lines: [
            deps.translate('직접 DPS {floor}', { floor: Math.floor(stats.directDps) }),
            deps.translate('예상 소환 DPS {floor}', { floor: Math.floor(stats.summonDps) }),
            deps.translate('총 DPS = 직접 DPS + 예상 소환 DPS')
        ].concat(directLines),
        final: `${Math.floor(stats.totalDps)}`
    };
}

export { describeExtraGetProjectileTargetBreakdowns, describeExtraGetPassiveSpecialStatBreakdowns, describeExtraAppendPlayerDpsBreakdowns };
