// Gem inspection owns transient selection only. Existing equip handlers retain all build/cost guards.
(function () {
    'use strict';
    let selection = null;

    function application(name, stats) {
        const def = SUPPORT_GEM_DB[name];
        const tag = Object.keys(TAGGED_DAMAGE_STAT_BY_TAG).find(key => TAGGED_DAMAGE_STAT_BY_TAG[key] === def.stat);
        if (!tag) return isSummonGuardSupport(name) ? '소환형 보조 · 소환 한도 사용' : '캐릭터 효과 · 상세에서 확인';
        const active = getUiGemPresentation(game.activeSkill || '기본 공격', false, stats).skill;
        const targets = [];
        if (getTaggedDamageBreakdown({ [def.stat]: 1 }, active).total > 0) targets.push('주 공격');
        const summons = (game.equippedSummonSkills || []).filter(gem => (SKILL_DB[gem]?.tags || []).includes(tag));
        targets.push(...summons);
        if (targets.length) return `적용: ${targets.join(' · ')}`;
        return '현재 주 공격·소환 젬에 적용되지 않음';
    }

    function close() {
        const root = document.getElementById('gem-selection');
        if (root?.matches(':popover-open')) root.hidePopover();
        selection?.anchor.classList.remove('is-gem-selected');
        selection = null;
    }

    function createPanel() {
        let root = document.getElementById('gem-selection');
        if (root) return root;
        root = document.createElement('section');
        root.id = 'gem-selection';
        root.setAttribute('popover', 'auto');
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-label', '젬 상세');
        root.innerHTML = '<div class="gem-selection-actions"></div><div class="gem-selection-content"></div>';
        root.addEventListener('toggle', event => { if (event.newState === 'closed') close(); });
        root.addEventListener('click', act);
        document.getElementById('tab-skills').append(root);
        return root;
    }

    function equipButton(anchor, canUnequip) {
        const equipped = anchor.classList.contains('active');
        const blocked = anchor.classList.contains('equipment-blocked') && !equipped;
        const label = equipped ? (canUnequip ? '장착 해제' : '장착 중') : '장착';
        const disabled = blocked || (equipped && !canUnequip);
        return `<button type="button" data-gem-action="equip" ${disabled ? 'disabled' : ''}>${label}</button>`;
    }

    function actions(type, name, anchor) {
        const support = type === 'support';
        const summon = !support && (SKILL_DB[name].tags || []).includes('summon_attack');
        let html = equipButton(anchor, support || summon);
        if (!support && game.gemEnhanceUnlocked && getEquippedEnhanceableGemNames().includes(name)) {
            html += '<button type="button" data-gem-action="enhance">강화 · 각인</button>';
        }
        return html + '<button type="button" data-gem-action="close" aria-label="젬 상세 닫기">닫기</button>';
    }

    function open(anchor, type, name) {
        close();
        selection = { anchor, type, name };
        anchor.classList.add('is-gem-selected');
        hideInfoTooltip();
        const root = createPanel();
        root.querySelector('.gem-selection-actions').innerHTML = actions(type, name, anchor);
        const content = root.querySelector('.gem-selection-content');
        showGemTooltip(null, type, name, content);
        if (type === 'support') {
            const note = document.createElement('p');
            note.className = 'gem-application-note';
            note.textContent = application(name, getUiPlayerStats());
            content.prepend(note);
        }
        if (anchor.classList.contains('equipment-blocked')) {
            const warning = document.createElement('p');
            warning.className = 'condition-rule-warning';
            warning.textContent = anchor.querySelector('.gem-usage-state').textContent;
            content.prepend(warning);
        }
        root.showPopover();
        position();
        root.querySelector('button:not(:disabled)').focus({ preventScroll: true });
    }

    function act(event) {
        const action = event.target.closest('[data-gem-action]')?.dataset.gemAction;
        if (!action || !selection) return;
        const { type, name } = selection;
        close();
        if (action === 'enhance') openEquippedGemManagement(name);
        if (action !== 'equip') return;
        if (type === 'support') toggleSupport(name);
        else changeSkill(name);
    }

    function position() {
        if (!selection) return;
        const root = document.getElementById('gem-selection');
        if (!root.matches(':popover-open')) return;
        const rect = selection.anchor.getBoundingClientRect();
        if (!selection.anchor.isConnected || !selection.anchor.getClientRects().length) { close(); return; }
        const nav = document.getElementById('tab-header-bottom');
        const bottom = nav?.getClientRects().length ? nav.getBoundingClientRect().top : innerHeight;
        root.style.maxHeight = `${(bottom - 16) / uiDisplay.factor}px`;
        const size = root.getBoundingClientRect();
        let x = rect.right + 8, y = rect.top;
        if (x + size.width > innerWidth - 8) x = rect.left - size.width - 8;
        if (x < 8) { x = rect.left; y = rect.bottom + 8; }
        if (y + size.height > bottom - 8) y = rect.top - size.height - 8;
        root.style.left = `${Math.max(8, Math.min(innerWidth - size.width - 8, x)) / uiDisplay.factor}px`;
        root.style.top = `${Math.max(8, Math.min(bottom - size.height - 8, y)) / uiDisplay.factor}px`;
    }

    document.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
    safeExposeGlobals({ gemSelectionUi: Object.freeze({ open, application }) });
})();
