// GENERATED from modules/condition-patterns*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/condition-pattern-editing.mjs
  var DEFAULT_TRIGGER_VALUES = Object.freeze({ percent: 40, count: 3, cells: 3, seconds: 3 });
  function createConditionPatternEditing(deps) {
    return Object.freeze({
      isOpen: (state) => deps.canEdit(state),
      normalize: (state) => normalizeRules(deps, state),
      add: (state) => addRule(deps, state),
      sort: (state) => sortRules(deps, state),
      move: (state, index, delta) => moveRule(deps, state, index, delta),
      remove: (state, index) => removeRule(deps, state, index),
      trigger: (state, index, value) => changeTrigger(deps, state, index, value),
      action: (state, index, value) => changeAction(deps, state, index, value),
      value: (state, index, value) => changeValue(deps, state, index, value),
      enabled: (state, index, value) => changeEnabled(deps, state, index, value),
      ailment: (state, index, value) => changeAilment(deps, state, index, value),
      defaultTactic: (state, key, value) => changeDefault(deps, state, key, value)
    });
  }
  function normalizeRules(deps, state) {
    state.skillAutoRules = Array.isArray(state.skillAutoRules) ? state.skillAutoRules.map(deps.rules.normalizeConditionPatternRule) : [];
    return state.skillAutoRules;
  }
  function addRule(deps, state) {
    if (!deps.canEdit(state) || !deps.rules.getConditionPatternTriggers(state, false).length) return false;
    state.skillAutoRules = Array.isArray(state.skillAutoRules) ? state.skillAutoRules : [];
    state.skillAutoRules.push({
      id: `rule_${deps.now()}_${Math.floor(deps.random() * 1e4)}`,
      enabled: true,
      priority: state.skillAutoRules.length + 1,
      hpThreshold: 40,
      triggerValue: 40,
      triggerType: "hp_below",
      actionType: "target_nearest"
    });
    return true;
  }
  function sortRules(deps, state) {
    if (!deps.canEdit(state)) return false;
    state.skillAutoRules = Array.isArray(state.skillAutoRules) ? state.skillAutoRules : [];
    state.skillAutoRules.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    state.skillAutoRules.forEach((rule, index) => {
      rule.priority = index + 1;
    });
    return true;
  }
  function moveRule(deps, state, index, delta) {
    if (!deps.canEdit(state) || !Number.isFinite(index) || !Number.isFinite(delta)) return false;
    state.skillAutoRules = Array.isArray(state.skillAutoRules) ? state.skillAutoRules : [];
    const rules2 = state.skillAutoRules;
    const from = Math.max(0, Math.min(rules2.length - 1, Math.floor(index || 0)));
    const to = Math.max(0, Math.min(rules2.length - 1, from + Math.sign(delta || 0)));
    if (from === to) return false;
    const moved = rules2.splice(from, 1)[0];
    rules2.splice(to, 0, moved);
    rules2.forEach((rule, order) => {
      rule.priority = order + 1;
    });
    return true;
  }
  function editableRule(deps, state, index) {
    if (!deps.canEdit(state) || !Number.isInteger(index)) return null;
    const rule = state.skillAutoRules?.[index];
    return rule && typeof rule === "object" ? rule : null;
  }
  function removeRule(deps, state, index) {
    if (!editableRule(deps, state, index)) return false;
    state.skillAutoRules.splice(index, 1);
    return true;
  }
  function changeTrigger(deps, state, index, value) {
    const rule = editableRule(deps, state, index);
    const trigger = deps.rules.getConditionPatternTriggers(state, false).find((row) => row.id === value);
    if (!rule || !trigger) return false;
    deps.rules.normalizeConditionPatternRule(rule);
    const before = deps.rules.getConditionPatternTriggers(state, true).find((row) => row.id === rule.triggerType);
    if (!before || before.valueKind !== trigger.valueKind) rule.triggerValue = DEFAULT_TRIGGER_VALUES[trigger.valueKind] ?? rule.triggerValue;
    rule.triggerType = trigger.id;
    deps.rules.normalizeConditionPatternRule(rule);
    return true;
  }
  function changeAction(deps, state, index, value) {
    const rule = editableRule(deps, state, index);
    if (!rule || !deps.rules.getConditionPatternActions(state, false).some((row) => row.id === value)) return false;
    deps.rules.normalizeConditionPatternRule(rule);
    rule.actionType = value;
    return true;
  }
  function changeValue(deps, state, index, value) {
    const rule = editableRule(deps, state, index);
    if (!rule || !Number.isFinite(Number(value))) return false;
    rule.triggerValue = Number(value) || 1;
    rule.hpThreshold = rule.triggerValue;
    deps.rules.normalizeConditionPatternRule(rule);
    return true;
  }
  function changeEnabled(deps, state, index, value) {
    const rule = editableRule(deps, state, index);
    if (!rule || typeof value !== "boolean") return false;
    rule.enabled = value;
    return true;
  }
  function changeAilment(deps, state, index, value) {
    const rule = editableRule(deps, state, index);
    if (!rule || typeof value !== "string" || !value) return false;
    rule.ailmentType = value;
    return true;
  }
  function changeDefault(deps, state, key, value) {
    if (!deps.canEdit(state) || !Object.hasOwn(deps.defaultChoices, key) || !deps.defaultChoices[key].includes(value)) return false;
    state.settings[key] = value;
    return true;
  }

  // modules/domain/condition-pattern-access.mjs
  function conditionRuleGetConditionPatternProgressLoop(state) {
    if (!state || typeof state !== "object") return 1;
    return Math.max(1, Math.floor(Number(state.season) || 1), Math.floor(Number(state.loopCount) || 0));
  }
  function conditionRuleIsConditionPatternRequirementMet(requirement, state) {
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
  function conditionRuleGetConditionPatternRequirementLabel(env, requirement) {
    if (!requirement) return "기본 해금";
    if (requirement.journal) {
      let entry = typeof env.deps.JOURNAL_DB !== "undefined" ? env.deps.JOURNAL_DB[requirement.journal] : null;
      return env.deps._t("{value} 기록", { value: entry ? entry.title : requirement.journal });
    }
    if (requirement.act) return env.deps._t("액트 {act} 완료", { act: requirement.act });
    return env.deps._t("루프 {loop}", { loop: requirement.loop });
  }
  function conditionRuleGetConditionPatternTriggers(env, state, includeLocked) {
    let rows = typeof env.deps.CONDITION_PATTERN_TRIGGER_DB !== "undefined" ? env.deps.CONDITION_PATTERN_TRIGGER_DB : [];
    return rows.filter((row) => includeLocked || conditionRuleIsConditionPatternRequirementMet(row.unlock, state));
  }
  function conditionRuleGetConditionPatternActions(env, state, includeLocked) {
    let rows = typeof env.deps.CONDITION_PATTERN_ACTION_DB !== "undefined" ? env.deps.CONDITION_PATTERN_ACTION_DB : [];
    return rows.filter((row) => includeLocked || conditionRuleIsConditionPatternRequirementMet(row.unlock, state));
  }

  // modules/domain/condition-pattern-rules.mjs
  var CONDITION_BOUNDS = Object.freeze({ cells: [1, 7], seconds: [1, 10], count: [1, 30], percent: [1, 100] });
  var CONDITION_SUMMARIES = Object.freeze({
    hp_below: "생명력 {value}% 이하",
    hp_above: "생명력 {value}% 이상",
    es_below: "보호막 {value}% 이하",
    es_above: "보호막 {value}% 이상",
    enemy_many: "적 {value}마리 이상",
    enemy_few: "적 {value}마리 이하",
    distance_at_least: "가장 가까운 적 {value}칸 이상",
    distance_at_most: "가장 가까운 적 {value}칸 이하",
    recently_hit: "최근 {value}초 이내 피격",
    boss_hp_below: "보스 생명력 {value}% 이하"
  });
  var CONDITION_MATCHERS = Object.freeze({
    hp_below: (rule, context, value) => context.hpPct <= value,
    hp_above: (rule, context, value) => context.hpPct >= value,
    es_below: (rule, context, value) => context.hasEnergyShield && context.esPct <= value,
    es_above: (rule, context, value) => context.hasEnergyShield && context.esPct >= value,
    enemy_many: (rule, context, value) => context.liveEnemies.length >= value,
    enemy_few: (rule, context, value) => context.liveEnemies.length > 0 && context.liveEnemies.length <= value,
    boss_present: (rule, context) => context.bosses.length > 0,
    boss_absent: (rule, context) => context.liveEnemies.length > 0 && context.bosses.length === 0,
    elite_present: (rule, context) => context.liveEnemies.some((enemy) => enemy.isElite || enemy.elite),
    ailment_active: (rule, context) => context.ailments.some((ailment) => rule.ailmentType === "any" || ailment.type === rule.ailmentType),
    distance_at_least: (rule, context, value) => Number.isFinite(context.nearestDistance) && context.nearestDistance >= value,
    distance_at_most: (rule, context, value) => Number.isFinite(context.nearestDistance) && context.nearestDistance <= value,
    recently_hit: (rule, context, value) => context.secondsSinceHit <= Math.max(0.1, value),
    boss_hp_below: (rule, context, value) => context.bosses.some((enemy) => enemy.hp / Math.max(1, enemy.maxHp || 1) * 100 <= value),
    alone_with_boss: (rule, context) => context.liveEnemies.length === 1 && context.bosses.length === 1
  });
  function conditionRuleNormalizeConditionPatternRule(env, rule) {
    let normalized = rule && typeof rule === "object" ? rule : {};
    if (!normalized.actionType) normalized.actionType = "target_nearest";
    if (!Number.isFinite(Number(normalized.triggerValue))) {
      normalized.triggerValue = Number.isFinite(Number(normalized.hpThreshold)) ? Number(normalized.hpThreshold) : 40;
    }
    let trigger = env.deps.CONDITION_PATTERN_TRIGGER_DB.find((row) => row.id === normalized.triggerType);
    let bounds = conditionPatternBounds(trigger);
    if (bounds) normalized.triggerValue = Math.max(bounds[0], Math.min(bounds[1], Number(normalized.triggerValue)));
    normalized.hpThreshold = normalized.triggerValue;
    if (!normalized.ailmentType) normalized.ailmentType = "any";
    return normalized;
  }
  function conditionPatternBounds(trigger) {
    return trigger && typeof trigger.valueKind === "string" && Object.hasOwn(CONDITION_BOUNDS, trigger.valueKind) ? CONDITION_BOUNDS[trigger.valueKind] : null;
  }
  function conditionRuleFormatConditionPatternTriggerSummary(env, rule) {
    let normalized = conditionRuleNormalizeConditionPatternRule(env, rule);
    let trigger = env.deps.CONDITION_PATTERN_TRIGGER_DB.find((row) => row.id === normalized.triggerType);
    if (!trigger) return "조건 충족";
    let value = Math.max(0, Number(normalized.triggerValue) || 0);
    if (typeof trigger.id === "string" && Object.hasOwn(CONDITION_SUMMARIES, trigger.id)) {
      return env.deps._t(CONDITION_SUMMARIES[trigger.id], { value });
    }
    if (trigger.id === "ailment_active") {
      let labels = { any: "상태이상", ignite: "점화", chill: "냉각", freeze: "동결", shock: "감전", poison: "중독", bleed: "출혈" };
      return env.deps._t("{labels} 보유", { labels: labels[normalized.ailmentType] || normalized.ailmentType });
    }
    return trigger.label;
  }
  function conditionRuleDoesConditionPatternMatch(rule, context) {
    let value = Math.max(0, Number(rule.triggerValue) || 0);
    if (typeof rule.triggerType !== "string" || !Object.hasOwn(CONDITION_MATCHERS, rule.triggerType)) return false;
    return CONDITION_MATCHERS[rule.triggerType](rule, context, value);
  }

  // modules/domain/condition-pattern-context.mjs
  function conditionRuleGetConditionPatternContext(env, state, pStats, now) {
    let source = state;
    let liveEnemies = (source.enemies || []).filter((enemy) => enemy && enemy.hp > 0);
    let maxHp = Math.max(1, Number(pStats && pStats.maxHp) || 1);
    let maxEs = Math.max(0, Number(pStats && pStats.energyShield) || 0);
    let nearestDistance = conditionNearestEnemyDistance(env, source, liveEnemies);
    return {
      hpPct: Math.max(0, Number(source.playerHp) || 0) / maxHp * 100,
      esPct: maxEs > 0 ? Math.max(0, Number(source.playerEnergyShield) || 0) / maxEs * 100 : 0,
      hasEnergyShield: maxEs > 0,
      liveEnemies,
      bosses: liveEnemies.filter((enemy) => enemy.isBoss),
      nearestDistance,
      ailments: (source.playerAilments || []).filter((ailment) => ailment && Number(ailment.time) > 0),
      secondsSinceHit: conditionSecondsSinceHit(env, source, now)
    };
  }
  function conditionNearestEnemyDistance(env, source, liveEnemies) {
    let nearestDistance = Number.POSITIVE_INFINITY;
    let getDistance = typeof env.deps.getGridUnitDistance === "function" ? ((enemy) => env.deps.getGridUnitDistance(source.gridPlayer, enemy)) : ((enemy) => env.deps.gridChebyshevDist(source.gridPlayer.gx, source.gridPlayer.gy, enemy.gx, enemy.gy));
    if (source.gridPlayer && typeof env.deps.gridChebyshevDist === "function") liveEnemies.forEach((enemy) => {
      if (!enemy || !Number.isFinite(enemy.gx) || !Number.isFinite(enemy.gy)) return;
      nearestDistance = Math.min(nearestDistance, getDistance(enemy));
    });
    return nearestDistance;
  }
  function conditionSecondsSinceHit(env, source, now) {
    return Math.max(0, ((now || env.deps.getCombatTime()) - Math.max(Number(source.playerLastHitAt) || 0, Number(source.playerEsLastHitAt) || 0)) / 1e3);
  }
  function conditionRuleIsPlayerThreatenedByBoss(env, state) {
    if (!state.gridPlayer) return false;
    const pending = env.deps.pendingBossAttacksForState(state);
    return env.deps.getBossWarningCells(state, pending).some((cell) => cell.gx === state.gridPlayer.gx && cell.gy === state.gridPlayer.gy);
  }

  // modules/domain/condition-pattern-evaluation.mjs
  function conditionRuleEvaluateConditionPatternRule(env, rule, pStats, state, now) {
    let normalized = conditionRuleNormalizeConditionPatternRule(env, rule);
    let trigger = conditionRuleGetConditionPatternTriggers(env, state, true).find((row) => row.id === normalized.triggerType);
    if (!trigger || !conditionRuleIsConditionPatternRequirementMet(trigger.unlock, state)) return false;
    if (normalized.triggerType === "boss_warning") return conditionRuleIsPlayerThreatenedByBoss(env, state);
    return conditionRuleDoesConditionPatternMatch(normalized, conditionRuleGetConditionPatternContext(env, state, pStats, now));
  }
  function conditionRuleResolveConditionalCombatTactics(env, baseTactics, pStats, state, now) {
    let resolved = { ...baseTactics };
    let locked = { targetPriority: false, positionMode: false };
    let rules2 = Array.isArray(state.skillAutoRules) ? state.skillAutoRules : [];
    rules2.filter((rule) => rule && rule.enabled).sort((a, b) => (a.priority || 0) - (b.priority || 0)).forEach((rule) => {
      let action = conditionRuleGetConditionPatternActions(env, state, true).find((row) => row.id === conditionRuleNormalizeConditionPatternRule(env, rule).actionType);
      if (!action || !action.tactic || !conditionRuleIsConditionPatternRequirementMet(action.unlock, state)) return;
      if (!conditionRuleEvaluateConditionPatternRule(env, rule, pStats, state, now)) return;
      Object.entries(action.tactic).forEach(([key, value]) => {
        if (locked[key]) return;
        resolved[key] = value;
        locked[key] = true;
      });
    });
    return resolved;
  }

  // modules/domain/condition-patterns.mjs
  function createConditionPatterns(deps) {
    const env = { deps };
    return Object.freeze({ getConditionPatternProgressLoop: conditionRuleGetConditionPatternProgressLoop, isConditionPatternRequirementMet: conditionRuleIsConditionPatternRequirementMet, getConditionPatternRequirementLabel: (...args) => conditionRuleGetConditionPatternRequirementLabel(env, ...args), getConditionPatternTriggers: (...args) => conditionRuleGetConditionPatternTriggers(env, ...args), getConditionPatternActions: (...args) => conditionRuleGetConditionPatternActions(env, ...args), normalizeConditionPatternRule: (...args) => conditionRuleNormalizeConditionPatternRule(env, ...args), formatConditionPatternTriggerSummary: (...args) => conditionRuleFormatConditionPatternTriggerSummary(env, ...args), getConditionPatternContext: (...args) => conditionRuleGetConditionPatternContext(env, ...args), doesConditionPatternMatch: conditionRuleDoesConditionPatternMatch, isPlayerThreatenedByBoss: (...args) => conditionRuleIsPlayerThreatenedByBoss(env, ...args), evaluateConditionPatternRule: (...args) => conditionRuleEvaluateConditionPatternRule(env, ...args), resolveConditionalCombatTactics: (...args) => conditionRuleResolveConditionalCombatTactics(env, ...args) });
  }

  // modules/condition-patterns-classic.mjs
  var rules = createConditionPatterns({
    get _t() {
      return _t;
    },
    get JOURNAL_DB() {
      return typeof JOURNAL_DB === "undefined" ? void 0 : JOURNAL_DB;
    },
    get CONDITION_PATTERN_TRIGGER_DB() {
      return typeof CONDITION_PATTERN_TRIGGER_DB === "undefined" ? void 0 : CONDITION_PATTERN_TRIGGER_DB;
    },
    get CONDITION_PATTERN_ACTION_DB() {
      return typeof CONDITION_PATTERN_ACTION_DB === "undefined" ? void 0 : CONDITION_PATTERN_ACTION_DB;
    },
    get getGridUnitDistance() {
      return typeof getGridUnitDistance === "undefined" ? void 0 : getGridUnitDistance;
    },
    get gridChebyshevDist() {
      return typeof gridChebyshevDist === "undefined" ? void 0 : gridChebyshevDist;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    pendingBossAttacksForState(state) {
      return state === game && typeof window.GameModules.state.combat?.pendingEnemyCombatAttacks !== "undefined" ? window.GameModules.state.combat.pendingEnemyCombatAttacks : [];
    },
    get getBossWarningCells() {
      return getBossWarningCells;
    }
  });
  var getConditionPatternProgressLoop = rules.getConditionPatternProgressLoop;
  var isConditionPatternRequirementMet = (requirement, state) => rules.isConditionPatternRequirementMet(requirement, state || game);
  var getConditionPatternRequirementLabel = rules.getConditionPatternRequirementLabel;
  var getConditionPatternTriggers = (state, includeLocked) => rules.getConditionPatternTriggers(state || game, includeLocked);
  var getConditionPatternActions = (state, includeLocked) => rules.getConditionPatternActions(state || game, includeLocked);
  var normalizeConditionPatternRule = rules.normalizeConditionPatternRule;
  var formatConditionPatternTriggerSummary = rules.formatConditionPatternTriggerSummary;
  var getConditionPatternContext = (state, pStats, now) => rules.getConditionPatternContext(state || game, pStats, now);
  var doesConditionPatternMatch = rules.doesConditionPatternMatch;
  var isPlayerThreatenedByBoss = rules.isPlayerThreatenedByBoss;
  var evaluateConditionPatternRule = (rule, pStats, state, now) => rules.evaluateConditionPatternRule(rule, pStats, state || game, now);
  var resolveConditionalCombatTactics = (baseTactics, pStats, state, now) => rules.resolveConditionalCombatTactics(baseTactics, pStats, state || game, now);
  safeExposeGlobals({
    getConditionPatternProgressLoop,
    isConditionPatternRequirementMet,
    getConditionPatternRequirementLabel,
    getConditionPatternTriggers,
    getConditionPatternActions,
    normalizeConditionPatternRule,
    formatConditionPatternTriggerSummary,
    getConditionPatternContext,
    doesConditionPatternMatch,
    isPlayerThreatenedByBoss,
    evaluateConditionPatternRule,
    resolveConditionalCombatTactics
  });
  window.GameModules.conditionPatterns = Object.freeze({ rules, editing: createConditionPatternEditing({
    rules,
    canEdit: (owner) => contentProgression.canOpen("skill-tab-condition", owner),
    now: () => Date.now(),
    random: () => Math.random(),
    defaultChoices: {
      combatTargetPriority: COMBAT_TACTIC_TARGET_PRIORITIES,
      combatPositionMode: COMBAT_TACTIC_POSITION_MODES
    }
  }) });
})();
