

export function conditionRuleGetConditionPatternProgressLoop(state) {
    if (!state || typeof state !== 'object') return 1;
    return Math.max(1, Math.floor(Number(state.season) || 1), Math.floor(Number(state.loopCount) || 0));
}

export function conditionRuleIsConditionPatternRequirementMet(requirement, state) {
    if (!requirement) return true;
    let source = state;
    if (requirement.loop && conditionRuleGetConditionPatternProgressLoop(source) < requirement.loop) return false;
    if (requirement.act) {
        if (!conditionActCompleted(source, requirement.act)) return false;
    }
    if (requirement.journal) {
        let journal = Array.isArray(source.journalEntries) ? source.journalEntries : [];
        if (!journal.includes(requirement.journal)) return false;
    }
    return true;
}

function conditionActCompleted(source, act) {
    let journal = Array.isArray(source.journalEntries) ? source.journalEntries : [];
    let claimed = Array.isArray(source.claimedActRewards) ? source.claimedActRewards : [];
    return journal.includes(`act_${act}`) || claimed.includes(act - 1);
}

export function conditionRuleGetConditionPatternRequirementLabel(env, requirement) {
    if (!requirement) return '기본 해금';
    if (requirement.journal) {
        let entry = typeof env.deps.JOURNAL_DB !== 'undefined' ? env.deps.JOURNAL_DB[requirement.journal] : null;
        return env.deps._t('{value} 기록', { value: entry ? entry.title : requirement.journal });
    }
    if (requirement.act) return env.deps._t('액트 {act} 완료', { act: requirement.act });
    return env.deps._t('루프 {loop}', { loop: requirement.loop });
}

export function conditionRuleGetConditionPatternTriggers(env, state, includeLocked) {
    let rows = typeof env.deps.CONDITION_PATTERN_TRIGGER_DB !== 'undefined' ? env.deps.CONDITION_PATTERN_TRIGGER_DB : [];
    return rows.filter(row => includeLocked || conditionRuleIsConditionPatternRequirementMet(row.unlock, state));
}

export function conditionRuleGetConditionPatternActions(env, state, includeLocked) {
    let rows = typeof env.deps.CONDITION_PATTERN_ACTION_DB !== 'undefined' ? env.deps.CONDITION_PATTERN_ACTION_DB : [];
    return rows.filter(row => includeLocked || conditionRuleIsConditionPatternRequirementMet(row.unlock, state));
}
