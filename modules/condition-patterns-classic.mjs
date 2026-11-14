import { createConditionPatternEditing } from './domain/condition-pattern-editing.mjs';
import { createConditionPatterns } from './domain/condition-patterns.mjs';

const rules = createConditionPatterns({
    get _t() { return _t; },
    get JOURNAL_DB() { return typeof JOURNAL_DB === 'undefined' ? undefined : JOURNAL_DB; },
    get CONDITION_PATTERN_TRIGGER_DB() { return typeof CONDITION_PATTERN_TRIGGER_DB === 'undefined' ? undefined : CONDITION_PATTERN_TRIGGER_DB; },
    get CONDITION_PATTERN_ACTION_DB() { return typeof CONDITION_PATTERN_ACTION_DB === 'undefined' ? undefined : CONDITION_PATTERN_ACTION_DB; },
    get getGridUnitDistance() { return typeof getGridUnitDistance === 'undefined' ? undefined : getGridUnitDistance; },
    get gridChebyshevDist() { return typeof gridChebyshevDist === 'undefined' ? undefined : gridChebyshevDist; },
    get getCombatTime() { return getCombatTime; },
    pendingBossAttacksForState(state) {
        return state === game && typeof window.GameModules.state.combat?.pendingEnemyCombatAttacks !== 'undefined' ? window.GameModules.state.combat.pendingEnemyCombatAttacks : [];
    },
    get getBossWarningCells() { return getBossWarningCells; }
});
const getConditionPatternProgressLoop = rules.getConditionPatternProgressLoop;
const isConditionPatternRequirementMet = (requirement, state) => rules.isConditionPatternRequirementMet(requirement, state || game);
const getConditionPatternRequirementLabel = rules.getConditionPatternRequirementLabel;
const getConditionPatternTriggers = (state, includeLocked) => rules.getConditionPatternTriggers(state || game, includeLocked);
const getConditionPatternActions = (state, includeLocked) => rules.getConditionPatternActions(state || game, includeLocked);
const normalizeConditionPatternRule = rules.normalizeConditionPatternRule;
const formatConditionPatternTriggerSummary = rules.formatConditionPatternTriggerSummary;
const getConditionPatternContext = (state, pStats, now) => rules.getConditionPatternContext(state || game, pStats, now);
const doesConditionPatternMatch = rules.doesConditionPatternMatch;
const isPlayerThreatenedByBoss = rules.isPlayerThreatenedByBoss;
const evaluateConditionPatternRule = (rule, pStats, state, now) => rules.evaluateConditionPatternRule(rule, pStats, state || game, now);
const resolveConditionalCombatTactics = (baseTactics, pStats, state, now) => rules.resolveConditionalCombatTactics(baseTactics, pStats, state || game, now);
safeExposeGlobals({
    getConditionPatternProgressLoop, isConditionPatternRequirementMet, getConditionPatternRequirementLabel,
    getConditionPatternTriggers, getConditionPatternActions, normalizeConditionPatternRule, formatConditionPatternTriggerSummary,
    getConditionPatternContext, doesConditionPatternMatch, isPlayerThreatenedByBoss, evaluateConditionPatternRule,
    resolveConditionalCombatTactics
});

window.GameModules.conditionPatterns = Object.freeze({ rules, editing: createConditionPatternEditing({
    rules, canEdit: owner => contentProgression.canOpen('skill-tab-condition', owner),
    now: () => Date.now(), random: () => Math.random(),
    defaultChoices: {
        combatTargetPriority: COMBAT_TACTIC_TARGET_PRIORITIES,
        combatPositionMode: COMBAT_TACTIC_POSITION_MODES
    }
}) });
