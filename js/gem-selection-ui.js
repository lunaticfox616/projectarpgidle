// Gem inspection owns transient selection only. Existing equip handlers retain all build/cost guards.
(function () {
    'use strict';
    /** px between the detail popover and its gem card / window edge. */
    const POPOVER_GAP = 8;
    let selection = null;

    function application(name, stats) {
        const def = SUPPORT_GEM_DB[name];
        const tag = Object.keys(TAGGED_DAMAGE_STAT_BY_TAG).find(key => TAGGED_DAMAGE_STAT_BY_TAG[key] === def.stat);
        if (!tag) return isSummonGuardSupport(name) ? '소환형 보조 · 소환 한도 사용' : '캐릭터 효과 · 상세에서 확인';
        const active = getUiGemPresentation(game.activeSkill || '기본 공격', false, stats).skill;
        const targets = [];
        if (getTaggedDamageBreakdown({ [def.stat]: 1 }, active).total > 0) targets.push('주 공격');
        const mobility = mobilitySkill.equipped();
        if (mobility && getTaggedDamageBreakdown({ [def.stat]: 1 }, getUiGemPresentation(mobility, false, stats).skill).total > 0) targets.push('이동 스킬');
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
        // 따라 하기 안내가 젬 카드와 상세의 '장착' 단추 사이로 표시를 옮긴다.
        root.addEventListener('toggle', event => {
            if (event.newState === 'closed') close();
            if (typeof tutorialActionUi === 'object') tutorialActionUi.refresh();
        });
        root.addEventListener('click', act);
        document.getElementById('tab-skills').append(root);
        return root;
    }

    function equipButton(anchor, canUnequip) {
        const equipped = anchor.classList.contains('active');
        const blocked = anchor.classList.contains('equipment-blocked') && !equipped;
        const label = equipped ? (canUnequip ? '장착 해제' : '장착 중') : '장착';
        const disabled = blocked || (equipped && !canUnequip);
        return `<button type="button" class="${equipped ? '' : 'gem-equip-primary'}" data-gem-action="equip" ${disabled ? 'disabled' : ''}>${label}</button>`;
    }

    function actions(type, name, anchor) {
        const support = type === 'support';
        const summon = !support && (SKILL_DB[name].tags || []).includes('summon_attack');
        let html = equipButton(anchor, support || summon || mobilitySkill.isMobilityGem(name));
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

    function quickEquip(event) {
        if (!selection || event.target.closest('button')) return;
        const {anchor,type,name} = selection;
        if (!anchor.contains(event.target) || anchor.matches('.active,.equipment-blocked')) return;
        event.preventDefault();
        close();
        if (type === 'support') toggleSupport(name);
        else changeSkill(name);
    }

    /** 상세가 머무는 사각형: 젬이 든 관리 창(PC), 창이 없으면 화면 — 둘 다 하단 메뉴 띠 위까지. */
    function popoverBounds(anchor) {
        const nav = document.getElementById('tab-header-bottom');
        const floor = nav?.getClientRects().length ? nav.getBoundingClientRect().top : innerHeight;
        const frame = anchor.closest('.ui-window-open')?.getBoundingClientRect() || { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
        return { left: Math.max(0, frame.left), top: Math.max(0, frame.top), right: Math.min(innerWidth, frame.right), bottom: Math.min(floor, frame.bottom) };
    }

    /** 카드 오른쪽, 안 되면 왼쪽(세로는 창 안으로 당긴다), 둘 다 안 되면 아래 · 위. */
    function popoverSpot(anchor, size, bounds) {
        const minX = bounds.left + POPOVER_GAP, maxX = bounds.right - POPOVER_GAP - size.width;
        const minY = bounds.top + POPOVER_GAP, maxY = bounds.bottom - POPOVER_GAP - size.height;
        const fitY = y => Math.max(minY, Math.min(maxY, y));
        if (anchor.right + POPOVER_GAP <= maxX) return { x: anchor.right + POPOVER_GAP, y: fitY(anchor.top) };
        if (anchor.left - POPOVER_GAP - size.width >= minX) return { x: anchor.left - POPOVER_GAP - size.width, y: fitY(anchor.top) };
        const x = Math.max(minX, Math.min(maxX, anchor.left));
        if (anchor.bottom + POPOVER_GAP <= maxY) return { x, y: anchor.bottom + POPOVER_GAP };
        return { x, y: fitY(anchor.top - POPOVER_GAP - size.height) };
    }

    /** 상세는 젬이 든 창 안에 머문다 — 창 아래로 넘쳐 HUD 미니맵을 덮었다(검토 2026-10-01). */
    function position() {
        if (!selection) return;
        const root = document.getElementById('gem-selection');
        if (!root.matches(':popover-open')) return;
        if (!selection.anchor.isConnected || !selection.anchor.getClientRects().length) { close(); return; }
        const bounds = popoverBounds(selection.anchor);
        root.style.maxHeight = `${(bounds.bottom - bounds.top - 2 * POPOVER_GAP) / uiDisplay.factor}px`;
        const spot = popoverSpot(selection.anchor.getBoundingClientRect(), root.getBoundingClientRect(), bounds);
        root.style.left = `${spot.x / uiDisplay.factor}px`;
        root.style.top = `${spot.y / uiDisplay.factor}px`;
    }

    document.addEventListener('scroll', position, true);
    document.addEventListener('dblclick', quickEquip);
    window.addEventListener('resize', position);
    safeExposeGlobals({ gemSelectionUi: Object.freeze({ open, application }) });
})();
