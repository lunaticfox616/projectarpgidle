const CONDITION_BOUNDS = Object.freeze({ cells: [1, 7], seconds: [1, 10], count: [1, 30], percent: [1, 100] });

const CONDITION_SUMMARIES = Object.freeze({
    hp_below: '생명력 {value}% 이하',
    hp_above: '생명력 {value}% 이상',
    es_below: '보호막 {value}% 이하',
    es_above: '보호막 {value}% 이상',
    enemy_many: '적 {value}마리 이상',
    enemy_few: '적 {value}마리 이하',
    distance_at_least: '가장 가까운 적 {value}칸 이상',
    distance_at_most: '가장 가까운 적 {value}칸 이하',
    recently_hit: '최근 {value}초 이내 피격',
    boss_hp_below: '보스 생명력 {value}% 이하'
});

const CONDITION_MATCHERS = Object.freeze({
    hp_below: (rule, context, value) => context.hpPct <= value,
    hp_above: (rule, context, value) => context.hpPct >= value,
    es_below: (rule, context, value) => context.hasEnergyShield && context.esPct <= value,
    es_above: (rule, context, value) => context.hasEnergyShield && context.esPct >= value,
    enemy_many: (rule, context, value) => context.liveEnemies.length >= value,
    enemy_few: (rule, context, value) => context.liveEnemies.length > 0 && context.liveEnemies.length <= value,
    boss_present: (rule, context) => context.bosses.length > 0,
    boss_absent: (rule, context) => context.liveEnemies.length > 0 && context.bosses.length === 0,
    elite_present: (rule, context) => context.liveEnemies.some(enemy => enemy.isElite || enemy.elite),
    ailment_active: (rule, context) => context.ailments.some(ailment => rule.ailmentType === 'any' || ailment.type === rule.ailmentType),
    distance_at_least: (rule, context, value) => Number.isFinite(context.nearestDistance) && context.nearestDistance >= value,
    distance_at_most: (rule, context, value) => Number.isFinite(context.nearestDistance) && context.nearestDistance <= value,
    recently_hit: (rule, context, value) => context.secondsSinceHit <= Math.max(0.1, value),
    boss_hp_below: (rule, context, value) => context.bosses.some(enemy => enemy.hp / Math.max(1, enemy.maxHp || 1) * 100 <= value),
    alone_with_boss: (rule, context) => context.liveEnemies.length === 1 && context.bosses.length === 1
});

export function conditionRuleNormalizeConditionPatternRule(env, rule) {
    let normalized = rule && typeof rule === 'object' ? rule : {};
    if (!normalized.actionType) normalized.actionType = 'target_nearest';
    if (!Number.isFinite(Number(normalized.triggerValue))) {
        normalized.triggerValue = Number.isFinite(Number(normalized.hpThreshold)) ? Number(normalized.hpThreshold) : 40;
    }
    let trigger = env.deps.CONDITION_PATTERN_TRIGGER_DB.find(row => row.id === normalized.triggerType);
    let bounds = conditionPatternBounds(trigger);
    if (bounds) normalized.triggerValue = Math.max(bounds[0], Math.min(bounds[1], Number(normalized.triggerValue)));
    normalized.hpThreshold = normalized.triggerValue;
    if (!normalized.ailmentType) normalized.ailmentType = 'any';
    return normalized;
}

function conditionPatternBounds(trigger) {
    return trigger && typeof trigger.valueKind === 'string' && Object.hasOwn(CONDITION_BOUNDS, trigger.valueKind)
        ? CONDITION_BOUNDS[trigger.valueKind] : null;
}

export function conditionRuleFormatConditionPatternTriggerSummary(env, rule) {
    let normalized = conditionRuleNormalizeConditionPatternRule(env, rule);
    let trigger = env.deps.CONDITION_PATTERN_TRIGGER_DB.find(row => row.id === normalized.triggerType);
    if (!trigger) return '조건 충족';
    let value = Math.max(0, Number(normalized.triggerValue) || 0);
    if (typeof trigger.id === 'string' && Object.hasOwn(CONDITION_SUMMARIES, trigger.id)) {
        return env.deps._t(CONDITION_SUMMARIES[trigger.id], { value });
    }
    if (trigger.id === 'ailment_active') {
        let labels = { any:'상태이상', ignite:'점화', chill:'냉각', freeze:'동결', shock:'감전', poison:'중독', bleed:'출혈' };
        return env.deps._t('{labels} 보유', { labels: labels[normalized.ailmentType] || normalized.ailmentType });
    }
    return trigger.label;
}

export function conditionRuleDoesConditionPatternMatch(rule, context) {
    let value = Math.max(0, Number(rule.triggerValue) || 0);
    if (typeof rule.triggerType !== 'string' || !Object.hasOwn(CONDITION_MATCHERS, rule.triggerType)) return false;
    return CONDITION_MATCHERS[rule.triggerType](rule, context, value);
}
