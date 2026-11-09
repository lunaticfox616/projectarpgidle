// 변이시간선 화면(js/loop-mutation.js): 전투 화면 지역 이름 아래 줄의 변이 칩, 루프 정산의 다음 루프 줄, 루프를 시작할 때 기록 한 줄.
// js/main.js refreshCombatTickUi가 틱마다 update를 부른다. 칩은 바뀐 때만 다시 그린다. 첫 처치의 공격룬 3택 창은 2026-11-09에 직업을 고를 때의
// 기초 스킬 속성 고르기가 대신했다(js/passives.js openLoopBasicSkillPick).
const loopMutationUi = (() => {
    'use strict';
    let chipDrawn = null;

    /** The rule in numbers, for the chip's hover. */
    function mutationRuleText(rule) {
        if (rule.empowered) return _t('이번 루프의 모든 몬스터: {immune} 피해 면역, {weak} 피해 +{weakTakenPct}%, 공격에 {strong} 피해 {addedPct}% 추가', {
            immune: _t(DAMAGE_ELEMENT_LABELS[rule.immune]), weak: _t(DAMAGE_ELEMENT_LABELS[rule.weak]), strong: _t(DAMAGE_ELEMENT_LABELS[rule.empowered]),
            weakTakenPct: LOOP_MUTATION.weakTakenPct, addedPct: LOOP_MUTATION.empowered.addedPct });
        return _t('이번 루프의 모든 몬스터: {DAMAGE_ELEMENT_LABELS} 피해 면역, {DAMAGE_ELEMENT_LABELS2} 피해 +{weakTakenPct}%', { DAMAGE_ELEMENT_LABELS: _t(DAMAGE_ELEMENT_LABELS[rule.immune]), DAMAGE_ELEMENT_LABELS2: _t(DAMAGE_ELEMENT_LABELS[rule.weak]), weakTakenPct: LOOP_MUTATION.weakTakenPct });
    }
    /** The chip under the zone name (#ui-loop-mutation, before the held currencies): drawn again only when the loop's rule changes. */
    function updateMutationChip() {
        const root = document.getElementById('ui-loop-mutation');
        if (!root) return;
        const rule = loopMutation.current();
        // 언어를 바꾸면 칩 글도 바뀌어야 하므로 언어도 같이 본다.
        const sign = rule ? `${i18n.language}|${rule.immune}|${rule.weak}|${rule.empowered}` : '';
        if (sign === chipDrawn) return;
        chipDrawn = sign;
        root.hidden = !rule;
        root.innerHTML = rule ? `<i>${_t(rule.empowered ? '강화 변이' : '변이')}</i>${loopMutation.partsHtml(rule)}` : '';
        root.dataset.tip = rule ? `${mutationRuleText(rule)}\n${_t('경험치, 장비와 재화 드랍 +{rewardPct}%', { rewardPct: loopMutation.rewardPct(rule) })}` : '';
    }

    function update() {
        updateMutationChip();
    }

    /** The settlement's line for the next loop's mutation, or none before the rule's first loop. */
    function nextLoopLines(loop) {
        const rule = loopMutation.of(loop);
        return rule ? [_t('변이시간선: {describe}', { describe: loopMutation.describe(rule) })] : [];
    }
    // A new loop under the rule says it once in the log and a toast, after the class is picked.
    window.addEventListener('project-idle:loop-hero-selection-completed', () => {
        const rule = loopMutation.current();
        if (rule) addLog(_t('🧬 변이시간선: {describe}', { describe: loopMutation.describe(rule) }), 'season-up', { toast: true });
    });

    return Object.freeze({ update, nextLoopLines });
})();
safeExposeGlobals({ loopMutationUi });
