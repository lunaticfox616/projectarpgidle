import { TACTICS_RULES_LOCK_MESSAGE } from './tactics-data.mjs';
import { syncConditionRuleLive } from './tactics-live.mjs';
import { renderConditionPatternRule } from './tactics-cards.mjs';

export function isTacticsRulesOpen(runtime) {
    return runtime.deps.editor.isOpen(runtime.deps.game);
}

export function renderConditionPatternRoadmap(runtime) {
    let lockedTriggers = (0, runtime.deps.rules.getConditionPatternTriggers)(runtime.deps.game, true).filter(row => !(0, runtime.deps.rules.isConditionPatternRequirementMet)(row.unlock, runtime.deps.game));
    let lockedActions = (0, runtime.deps.rules.getConditionPatternActions)(runtime.deps.game, true).filter(row => !(0, runtime.deps.rules.isConditionPatternRequirementMet)(row.unlock, runtime.deps.game));
    let entries = lockedTriggers.map(row => `${row.label}, ${(0, runtime.deps.rules.getConditionPatternRequirementLabel)(row.unlock)}`)
        .concat(lockedActions.map(row => `${row.label}, ${(0, runtime.deps.rules.getConditionPatternRequirementLabel)(row.unlock)}`));
    if (entries.length === 0) return '<div class="condition-pattern-roadmap is-complete">모든 조건과 행동 패턴을 해금했습니다.</div>';
    return `<details class="condition-pattern-roadmap"><summary>${(0, runtime.deps._t)('다음 패턴 해금 {length}개', { length: entries.length })}</summary><div>${entries.map(text => `<span>${(0, runtime.deps.escapeHTML)(text)}</span>`).join('')}</div></details>`;
}

export function paintSkillRulesPanel(runtime, panel, html) {
    if (panel.__lastHtml === html) return;
    panel.innerHTML = html;
    panel.__lastHtml = html;
}

export function renderSkillAutoRulePanel(runtime) {
    syncCombatTacticsControls(runtime);
    let panel = runtime.deps.document.getElementById('ui-skill-rules-panel');
    if (!panel) return;
    runtime.owner = runtime.deps.game;
    let unlocked = isTacticsRulesOpen(runtime);
    let addButton = runtime.deps.document.getElementById('btn-condition-rule-add');
    let sortButton = runtime.deps.document.getElementById('btn-condition-rule-sort');
    if (addButton) addButton.disabled = !unlocked || !(0, runtime.deps.rules.getConditionPatternTriggers)(runtime.deps.game, false).length;
    if (sortButton) sortButton.disabled = !unlocked;
    if (!unlocked) return paintSkillRulesPanel(runtime, panel, `<div style="color:#d3a989; border:1px solid #6f4b31; border-radius:8px; padding:12px;">${(0, runtime.deps._t)('잠금 상태: {value}', { value: TACTICS_RULES_LOCK_MESSAGE })}</div>`);
    runtime.deps.editor.normalize(runtime.deps.game);
    let summary = `<div class="condition-pattern-summary"><div><strong>${(0, runtime.deps._t)('수호, 함성, 저주')}</strong><span>${(0, runtime.deps._t)('그루터기 함에서 깨어난 부적의 조건부 줄이 맡습니다.')}</span></div></div>${renderConditionPatternRoadmap(runtime)}`;
    if (runtime.deps.game.skillAutoRules.length === 0) {
        return paintSkillRulesPanel(runtime, panel, summary + '<div class="condition-rule-empty">[+ 규칙 추가]로 조건과 행동을 고르세요.</div>');
    }
    const options = { triggers: (0, runtime.deps.rules.getConditionPatternTriggers)(runtime.deps.game, false), actions: (0, runtime.deps.rules.getConditionPatternActions)(runtime.deps.game, false) };
    paintSkillRulesPanel(runtime, panel, summary + runtime.deps.game.skillAutoRules.map((rule, idx) => renderConditionPatternRule(runtime, rule, idx, options)).join(''));
    syncConditionRuleLive(runtime);
}

export function syncCombatTacticsControls(runtime) {
    let targetSelect = runtime.deps.document.getElementById('sel-combat-target-priority');
    let positionSelect = runtime.deps.document.getElementById('sel-combat-position-mode');
    let help = runtime.deps.document.getElementById('combat-tactics-help');
    if (!targetSelect || !positionSelect) return;
    let tactics = (0, runtime.deps.normalizeCombatTacticsSettings)(runtime.deps.game.settings);
    let unlocked = isTacticsRulesOpen(runtime);
    targetSelect.value = tactics.targetPriority;
    positionSelect.value = tactics.positionMode;
    targetSelect.disabled = !unlocked;
    positionSelect.disabled = !unlocked;
    const firstUse = unlocked && runtime.deps.contentProgression.opening.applies(runtime.deps.game) && !runtime.deps.game.seenTutorials.includes('opening_tactics_selected');
    targetSelect.classList.toggle('tutorial-callout', firstUse);
    if (help) help.textContent = unlocked
        ? (0, runtime.deps._t)(firstUse ? '먼저 공격할 적을 골라 보세요. 자동 전투가 그 대상을 우선합니다.' : '조건부 규칙이 맞지 않을 때 쓰는 전술입니다. 전술 이동 시 다음 공격이 0.3~0.65초 미뤄집니다.')
        : TACTICS_RULES_LOCK_MESSAGE;
}
