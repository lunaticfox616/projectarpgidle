function getConditionPatternProgressLoop(state) {
    if (!state || typeof state !== 'object') return 1;
    return Math.max(1, Math.floor(Number(state.season) || 1), Math.floor(Number(state.loopCount) || 0));
}

function isConditionPatternRequirementMet(requirement, state) {
    if (!requirement) return true;
    let source = state || game;
    if (requirement.loop && getConditionPatternProgressLoop(source) < requirement.loop) return false;
    if (requirement.act) {
        let journal = Array.isArray(source.journalEntries) ? source.journalEntries : [];
        let claimed = Array.isArray(source.claimedActRewards) ? source.claimedActRewards : [];
        if (!journal.includes(`act_${requirement.act}`) && !claimed.includes(requirement.act - 1)) return false;
    }
    if (requirement.journal) {
        let journal = Array.isArray(source.journalEntries) ? source.journalEntries : [];
        if (!journal.includes(requirement.journal)) return false;
    }
    return true;
}

function getConditionPatternRequirementLabel(requirement) {
    if (!requirement) return '기본 해금';
    if (requirement.journal) {
        let entry = typeof JOURNAL_DB !== 'undefined' ? JOURNAL_DB[requirement.journal] : null;
        return `${entry ? entry.title : requirement.journal} 기록`;
    }
    if (requirement.act) return `액트 ${requirement.act} 완료`;
    return `루프 ${requirement.loop}`;
}

function getConditionPatternTriggers(state, includeLocked) {
    let rows = typeof CONDITION_PATTERN_TRIGGER_DB !== 'undefined' ? CONDITION_PATTERN_TRIGGER_DB : [];
    return rows.filter(row => includeLocked || isConditionPatternRequirementMet(row.unlock, state || game));
}

function getConditionPatternActions(state, includeLocked) {
    let rows = typeof CONDITION_PATTERN_ACTION_DB !== 'undefined' ? CONDITION_PATTERN_ACTION_DB : [];
    return rows.filter(row => includeLocked || isConditionPatternRequirementMet(row.unlock, state || game));
}

function normalizeConditionPatternRule(rule) {
    let normalized = rule && typeof rule === 'object' ? rule : {};
    if (!normalized.actionType) normalized.actionType = 'condition_gem';
    if (!Number.isFinite(Number(normalized.triggerValue))) {
        normalized.triggerValue = Number.isFinite(Number(normalized.hpThreshold)) ? Number(normalized.hpThreshold) : 40;
    }
    let trigger = CONDITION_PATTERN_TRIGGER_DB.find(row => row.id === normalized.triggerType);
    let bounds = trigger && trigger.valueKind === 'cells' ? [1, 7]
        : (trigger && trigger.valueKind === 'seconds' ? [1, 10]
            : (trigger && trigger.valueKind === 'count' ? [1, 30]
                : (trigger && trigger.valueKind === 'percent' ? [1, 100] : null)));
    if (bounds) normalized.triggerValue = Math.max(bounds[0], Math.min(bounds[1], Number(normalized.triggerValue)));
    normalized.hpThreshold = normalized.triggerValue;
    if (!normalized.ailmentType) normalized.ailmentType = 'any';
    return normalized;
}

function formatConditionPatternTriggerSummary(rule) {
    let normalized = normalizeConditionPatternRule(rule);
    let trigger = CONDITION_PATTERN_TRIGGER_DB.find(row => row.id === normalized.triggerType);
    if (!trigger) return '조건 충족';
    let value = Math.max(0, Number(normalized.triggerValue) || 0);
    if (trigger.id === 'hp_below') return `생명력 ${value}% 이하`;
    if (trigger.id === 'hp_above') return `생명력 ${value}% 이상`;
    if (trigger.id === 'es_below') return `보호막 ${value}% 이하`;
    if (trigger.id === 'es_above') return `보호막 ${value}% 이상`;
    if (trigger.id === 'enemy_many') return `적 ${value}마리 이상`;
    if (trigger.id === 'enemy_few') return `적 ${value}마리 이하`;
    if (trigger.id === 'distance_at_least') return `가장 가까운 적 ${value}칸 이상`;
    if (trigger.id === 'distance_at_most') return `가장 가까운 적 ${value}칸 이하`;
    if (trigger.id === 'recently_hit') return `최근 ${value}초 이내 피격`;
    if (trigger.id === 'boss_hp_below') return `보스 생명력 ${value}% 이하`;
    if (trigger.id === 'ailment_active') {
        let labels = { any:'상태이상', ignite:'점화', chill:'냉각', freeze:'동결', shock:'감전', poison:'중독', bleed:'출혈' };
        return `${labels[normalized.ailmentType] || normalized.ailmentType} 보유`;
    }
    return trigger.label;
}

function getConditionPatternContext(state, pStats, now) {
    let source = state || game;
    let liveEnemies = (source.enemies || []).filter(enemy => enemy && enemy.hp > 0);
    let maxHp = Math.max(1, Number(pStats && pStats.maxHp) || 1);
    let maxEs = Math.max(0, Number(pStats && pStats.energyShield) || 0);
    let nearestDistance = Number.POSITIVE_INFINITY;
    let getDistance = typeof getGridUnitDistance === 'function'
        ? (enemy => getGridUnitDistance(source.gridPlayer, enemy))
        : (enemy => gridChebyshevDist(source.gridPlayer.gx, source.gridPlayer.gy, enemy.gx, enemy.gy));
    if (source.gridPlayer && typeof gridChebyshevDist === 'function') liveEnemies.forEach(enemy => {
        if (!enemy || !Number.isFinite(enemy.gx) || !Number.isFinite(enemy.gy)) return;
        nearestDistance = Math.min(nearestDistance, getDistance(enemy));
    });
    return {
        hpPct: Math.max(0, Number(source.playerHp) || 0) / maxHp * 100,
        esPct: maxEs > 0 ? Math.max(0, Number(source.playerEnergyShield) || 0) / maxEs * 100 : 0,
        hasEnergyShield: maxEs > 0,
        liveEnemies,
        bosses: liveEnemies.filter(enemy => enemy.isBoss),
        nearestDistance,
        ailments: (source.playerAilments || []).filter(ailment => ailment && Number(ailment.time) > 0),
        secondsSinceHit: Math.max(0, ((now || getCombatTime()) - Math.max(Number(source.playerLastHitAt) || 0, Number(source.playerEsLastHitAt) || 0)) / 1000)
    };
}

function doesConditionPatternMatch(rule, context) {
    let value = Math.max(0, Number(rule.triggerValue) || 0);
    if (rule.triggerType === 'hp_below') return context.hpPct <= value;
    if (rule.triggerType === 'hp_above') return context.hpPct >= value;
    if (rule.triggerType === 'es_below') return context.hasEnergyShield && context.esPct <= value;
    if (rule.triggerType === 'es_above') return context.hasEnergyShield && context.esPct >= value;
    if (rule.triggerType === 'enemy_many') return context.liveEnemies.length >= value;
    if (rule.triggerType === 'enemy_few') return context.liveEnemies.length > 0 && context.liveEnemies.length <= value;
    if (rule.triggerType === 'boss_present') return context.bosses.length > 0;
    if (rule.triggerType === 'boss_absent') return context.liveEnemies.length > 0 && context.bosses.length === 0;
    if (rule.triggerType === 'elite_present') return context.liveEnemies.some(enemy => enemy.isElite || enemy.elite);
    if (rule.triggerType === 'ailment_active') return context.ailments.some(ailment => rule.ailmentType === 'any' || ailment.type === rule.ailmentType);
    if (rule.triggerType === 'distance_at_least') return Number.isFinite(context.nearestDistance) && context.nearestDistance >= value;
    if (rule.triggerType === 'distance_at_most') return Number.isFinite(context.nearestDistance) && context.nearestDistance <= value;
    if (rule.triggerType === 'recently_hit') return context.secondsSinceHit <= Math.max(0.1, value);
    if (rule.triggerType === 'boss_hp_below') return context.bosses.some(enemy => enemy.hp / Math.max(1, enemy.maxHp || 1) * 100 <= value);
    if (rule.triggerType === 'alone_with_boss') return context.liveEnemies.length === 1 && context.bosses.length === 1;
    return false;
}

function isPlayerThreatenedByBoss(state) {
    if (!state.gridPlayer) return false;
    const pending = state === game && typeof pendingEnemyCombatAttacks !== 'undefined' ? pendingEnemyCombatAttacks : [];
    return getBossWarningCells(state, pending).some(cell =>
        cell.gx === state.gridPlayer.gx && cell.gy === state.gridPlayer.gy);
}

function evaluateConditionPatternRule(rule, pStats, state, now) {
    let normalized = normalizeConditionPatternRule(rule);
    let trigger = getConditionPatternTriggers(state || game, true).find(row => row.id === normalized.triggerType);
    if (!trigger || !isConditionPatternRequirementMet(trigger.unlock, state || game)) return false;
    if (normalized.triggerType === 'boss_warning') return isPlayerThreatenedByBoss(state || game);
    return doesConditionPatternMatch(normalized, getConditionPatternContext(state || game, pStats, now));
}

function resolveConditionalCombatTactics(baseTactics, pStats, state, now) {
    let resolved = { ...baseTactics };
    let locked = { targetPriority: false, positionMode: false };
    let rules = Array.isArray((state || game).skillAutoRules) ? (state || game).skillAutoRules : [];
    rules.filter(rule => rule && rule.enabled).sort((a, b) => (a.priority || 0) - (b.priority || 0)).forEach(rule => {
        let action = getConditionPatternActions(state || game, true).find(row => row.id === normalizeConditionPatternRule(rule).actionType);
        if (!action || !action.tactic || !isConditionPatternRequirementMet(action.unlock, state || game)) return;
        if (!evaluateConditionPatternRule(rule, pStats, state || game, now)) return;
        Object.entries(action.tactic).forEach(([key, value]) => {
            if (locked[key]) return;
            resolved[key] = value;
            locked[key] = true;
        });
    });
    return resolved;
}

safeExposeGlobals({
    getConditionPatternProgressLoop, isConditionPatternRequirementMet, getConditionPatternRequirementLabel,
    getConditionPatternTriggers, getConditionPatternActions, normalizeConditionPatternRule,
    formatConditionPatternTriggerSummary, getConditionPatternContext, doesConditionPatternMatch,
    evaluateConditionPatternRule, resolveConditionalCombatTactics
});
