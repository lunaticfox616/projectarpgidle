/** Each cue is delivered before evaluating the next condition or mutating another ailment. */
export function* hitGetSkillConditionalDamageMultiplier(env, skill, enemy, onCue) {
    const ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    let multiplier = yield* activeAilmentMultiplier(env, skill, ailments, onCue);
    multiplier *= yield* consumedAilmentMultiplier(env, skill, ailments, onCue);
    const missingPct = 1 - Math.max(0, enemy.hp || 0) / Math.max(1, enemy.maxHp || 1);
    multiplier *= 1 + missingPct * Math.max(0, Number(skill.missingLifeDamagePct) || 0) / 100;
    multiplier *= yield* fullLifeMultiplier(env, skill, enemy, onCue);
    multiplier *= yield* distanceMultiplier(env, skill, enemy, onCue);
    // 최대 포위 문구는 띄우지 않는다(2026-11-12 사용자 요청).
    return multiplier * crowdMultiplier(env, skill);
}

function* activeAilmentMultiplier(env, skill, ailments, onCue) {
    const active = skill.activeAilmentDamageMore;
    if (!active || !ailments.some(ail => ail && ail.type === active.type && (ail.time || 0) > 0)) return 1;
    const pct = Math.max(0, Number(active.pct) || 0);
    if (typeof onCue === 'function') yield { kind: 'deliverSkillCue', args: [onCue, {
        key: `ailment-${active.type}`,
        text: env.deps._t('{type} 연계: 피해 {pct}% 증폭', { type: env.deps.getAilmentDisplayLabel(active.type), pct }),
        color: env.deps.getElementColor(skill.ele)
    }] };
    return 1 + pct / 100;
}

function* consumedAilmentMultiplier(env, skill, ailments, onCue) {
    const configs = skill.consumeAilmentDamageMore || [], count = configs.length;
    let consumed = false, multiplier = 1;
    for (let i = 0; i < count; i++) {
        if (!(i in configs)) continue;
        const config = configs[i];
        if (consumed) continue;
        const index = ailments.findIndex(ail => ail && ail.type === config.type && (ail.time || 0) > 0);
        if (index < 0) continue;
        const pct = Math.max(0, Number(config.pct) || 0);
        multiplier *= 1 + pct / 100;
        ailments.splice(index, 1);
        consumed = true;
        yield* consumedAilmentCue(env, skill, { type: config.type, pct }, onCue);
    }
    return multiplier;
}

function* consumedAilmentCue(env, skill, consumed, onCue) {
    if (typeof onCue !== 'function') return;
    yield { kind: 'deliverSkillCue', args: [onCue, {
        key: `consume-${consumed.type}`,
        text: env.deps._t('{type} 소모: 피해 {pct}% 증폭', {
            type: env.deps.getAilmentDisplayLabel(consumed.type), pct: consumed.pct
        }),
        color: env.deps.getElementColor(skill.ele)
    }] };
}

function* fullLifeMultiplier(env, skill, enemy, onCue) {
    if (!((enemy.hp || 0) >= Math.max(1, enemy.maxHp || 1))) return 1;
    const pct = Math.max(0, Number(skill.fullLifeDamageMorePct) || 0);
    if (pct > 0 && typeof onCue === 'function') yield { kind: 'deliverSkillCue', args: [onCue, {
        key: 'full-life', text: env.deps._t('선제: 피해 {pct}% 증폭', { pct }), color: '#ffd27a'
    }] };
    return 1 + pct / 100;
}

function* distanceMultiplier(env, skill, enemy, onCue) {
    if (!env.owner.gridPlayer || !env.deps.hasGridCell(enemy)) return 1;
    const distance = env.deps.getGridUnitDistance(env.owner.gridPlayer, enemy);
    const bonus = Math.max(0, distance - 1) * Math.max(0, Number(skill.distanceDamageMorePerCellPct) || 0);
    const cap = Math.max(0, Number(skill.distanceDamageMoreCapPct) || 0);
    const applied = Math.min(cap, bonus);
    if (cap > 0 && applied >= cap && typeof onCue === 'function') yield { kind: 'deliverSkillCue', args: [onCue, {
        key: 'max-distance', text: env.deps._t('최대 거리: 피해 {cap}% 증폭', { cap }), color: '#bdeaff'
    }] };
    return 1 + applied / 100;
}

function crowdMultiplier(env, skill) {
    const nearbyEnemies = (env.owner.enemies || []).filter(row => row && row.hp > 0).length;
    const bonus = Math.max(0, nearbyEnemies - 1) * Math.max(0, Number(skill.crowdDamageMorePerEnemyPct) || 0);
    const cap = Math.max(0, Number(skill.crowdDamageMoreCapPct) || 0);
    return 1 + Math.min(cap, bonus) / 100;
}
