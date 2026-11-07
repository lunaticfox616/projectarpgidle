// 변이시간선 화면(js/loop-mutation.js): 전투 화면 지역 이름 아래 줄의 변이 칩, 루프 정산의 다음 루프 줄, 루프를 시작할 때 기록 한 줄, 첫 처치
// 공격룬 3택 창. js/main.js refreshCombatTickUi가 틱마다 update를 부른다. 칩은 바뀐 때만 다시 그리고, 3택 창은 저장에 고를 것이 남아
// 있는 동안 다른 창이 비키면 띄운다(닫거나 자리를 오래 비우면 첫째 룬).
const loopMutationUi = (() => {
    'use strict';
    const PICK_DIALOG = 'starter-rune-pick';
    let chipDrawn = null, pickShown = false;

    /** The rule in numbers, for the chip's hover and the pick window. */
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

    /** One rune card: its art, name, element (the weak one marked), the first sentence of its text and the shown DPS with it worn. */
    function pickCardHtml(name, rule) {
        const def = SKILL_DB[name], weak = !!rule && def.ele === rule.weak, art = getSkillGemArtPath(name);
        const line = String(def.desc || '').split(/\.(?:\s|$)/)[0]; // the first sentence ("0.5초" stays whole)
        const dps = previewBuildStats(copy => {
            copy.skills = [...copy.skills, name];
            copy.gemData = { ...copy.gemData, [name]: { level: 1, exp: 0 } };
            copy.activeSkill = name;
        }).dps[1];
        return `<button type="button" class="starter-rune-choice${weak ? ' is-weak' : ''}" data-starter-rune="${escapeHTML(name)}" style="--mutation-ele:${getElementColor(def.ele)}">
            ${art ? `<img src="${escapeHTML(art)}" alt="">` : ''}<strong>${escapeHTML(name)}</strong>
            <span class="starter-rune-element">${escapeHTML(_t(DAMAGE_ELEMENT_LABELS[def.ele]))}${weak ? _t(', 약점 피해 +{weakTakenPct}%', { weakTakenPct: LOOP_MUTATION.weakTakenPct }) : ''}</span>
            ${line ? `<small>${escapeHTML(line)}.</small>` : ''}<span class="starter-rune-dps">DPS ${Math.round(dps).toLocaleString(i18n.locale)}</span></button>`;
    }
    function openPick(gems) {
        const rule = loopMutation.current();
        const head = rule ? `<p class="selection-overlay-help">${escapeHTML(mutationRuleText(rule))}</p>` : '';
        const panel = selectionDialog.show({ id: PICK_DIALOG, title: _t('첫 공격룬 선택'), panelClass: 'starter-rune-panel',
            body: `${head}<div class="starter-rune-choices">${gems.map(name => pickCardHtml(name, rule)).join('')}</div>
                <p class="selection-overlay-help">${_t('닫으면 첫째 룬을 받습니다.')}</p>` });
        const overlay = panel && panel.parentElement;
        if (overlay && !overlay.dataset.pickBound) {
            overlay.dataset.pickBound = '1';
            overlay.addEventListener('click', event => {
                const card = event.target.closest('[data-starter-rune]');
                if (card) takePick(card.dataset.starterRune);
            });
        }
        pickShown = true;
    }
    function takePick(name) {
        pickShown = false;
        selectionDialog.close(PICK_DIALOG);
        chooseStarterRune(name);
    }
    /** Opens the pick while one waits; closed by the hero (닫기, the backdrop) or left alone past ACT_REWARD_PROMPT.awayMs, the first. */
    function updateStarterPick() {
        const gems = loopMutation.pendingStarter(), open = !!document.getElementById(PICK_DIALOG);
        if (!gems) {
            pickShown = false;
            if (open) selectionDialog.close(PICK_DIALOG);
            return;
        }
        if (open) return;
        if (pickShown || uiDisplay.inputIdleMs > ACT_REWARD_PROMPT.awayMs) takePick(gems[0]);
        else if (!isActRewardPromptBlocked()) openPick(gems);
    }
    function update() {
        updateMutationChip();
        updateStarterPick();
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
