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

    /** Support tier switch (1 · 2 · 3, locked tiers disabled) for a support gem with more than one tier. */
    function tierButtons(name) {
        const cap = getSupportTierCap(name);
        if (cap <= 1) return '';
        const unlocked = Math.max(1, Math.min(cap, Math.floor((((game.supportGemData || {})[name]) || {}).unlockedTier || 1)));
        const active = getSupportActiveTier(name);
        return '<span class="gem-selection-tiers" aria-label="보조 젬 등급">' + [1, 2, 3].slice(0, cap).map(tier =>
            `<button type="button" data-gem-action="tier" data-tier="${tier}" aria-pressed="${tier === active}" ${tier <= unlocked ? '' : 'disabled'}>${tier}등급</button>`).join('') + '</span>';
    }

    /** The detail's own controls: equip / take off, then what used to sit on the card — summon count, support tier,
     * seal — and the jump to 강화 · 각인. */
    function summonCount(name) {
        return `<span class="gem-selection-count"><button type="button" data-gem-action="summon-less" aria-label="소환 하나 줄이기">−</button><b>${getSummonSkillCount(name)}기</b><button type="button" data-gem-action="summon-more" aria-label="소환 하나 늘리기">+</button></span>`;
    }

    /** Controls that depend on the kind: support tier, a worn summon gem's count, the jump to 강화 · 각인. */
    function kindControls(type, name, worn) {
        if (type === 'support') return tierButtons(name);
        const summon = (SKILL_DB[name].tags || []).includes('summon_attack');
        const enhance = game.gemEnhanceUnlocked && getEquippedEnhanceableGemNames().includes(name);
        return (summon && worn ? summonCount(name) : '') + (enhance ? '<button type="button" data-gem-action="enhance">강화 · 각인</button>' : '');
    }

    function actions(type, name, anchor) {
        const support = type === 'support';
        const worn = anchor.classList.contains('active');
        const canUnequip = support || (SKILL_DB[name].tags || []).includes('summon_attack') || mobilitySkill.isMobilityGem(name);
        const seal = !worn && name !== '기본 공격' ? '<button type="button" data-gem-action="seal" class="gem-selection-seal">봉인</button>' : '';
        return equipButton(anchor, canUnequip) + kindControls(type, name, worn) + seal + '<button type="button" data-gem-action="close" aria-label="젬 상세 닫기">닫기</button>';
    }

    /** Stats with this gem put on, against the current ones: the main attack swapped, a mobility gem worn, a summon gem
     * added once, a support gem added. The build is restored exactly afterwards (the same pattern as the item tooltip). */
    function previewStats(type, name) {
        const saved = { active: game.activeSkill, mobility: game.mobilitySkill, supports: (game.equippedSupports || []).slice(),
            summons: (game.equippedSummonSkills || []).slice(), counts: { ...(game.summonSkillCounts || {}) } };
        const before = getUiPlayerStats({}, false);
        try {
            const kind = type === 'support' ? 'support' : skillGemBoardUi.kindOf(name);
            if (kind === 'support') game.equippedSupports = saved.supports.concat(name);
            else if (kind === 'summon') { game.equippedSummonSkills = saved.summons.concat(name); game.summonSkillCounts = { ...saved.counts, [name]: 1 }; }
            else if (kind === 'mobility') game.mobilitySkill = name;
            else game.activeSkill = name;
            return { before, after: getUiPlayerStats({}, false) };
        } finally {
            game.activeSkill = saved.active; game.mobilitySkill = saved.mobility; game.equippedSupports = saved.supports;
            game.equippedSummonSkills = saved.summons; game.summonSkillCounts = saved.counts;
        }
    }

    function compareRow(label, before, after) {
        const diff = after - before;
        const pct = before > 0 ? ` ${diff >= 0 ? '▲' : '▼'}${Math.abs(Math.round(diff / before * 100))}%` : '';
        const tone = Math.abs(diff) < 1 ? '' : (diff > 0 ? 'is-up' : 'is-down');
        return `<span>${label}</span><span class="gem-compare-now">${COMPARE_STAT_META.dps.format(before)}</span><span aria-hidden="true">→</span><span class="gem-compare-next ${tone}">${COMPARE_STAT_META.dps.format(after)}${tone ? pct : ''}</span>`;
    }

    /** "장착하면" block: DPS (and summon DPS when either side has one) before → after, for a gem not worn yet. */
    function comparison(type, name, anchor) {
        if (anchor.matches('.active, .equipment-blocked')) return null;
        const { before, after } = previewStats(type, name);
        const rows = [compareRow('DPS', before.dps || 0, after.dps || 0)];
        if ((before.summonDps || 0) > 0 || (after.summonDps || 0) > 0) rows.push(compareRow('소환 DPS', before.summonDps || 0, after.summonDps || 0));
        const block = document.createElement('div');
        block.className = 'gem-compare';
        block.innerHTML = `<b>장착하면</b><div class="gem-compare-grid">${rows.join('')}</div>`;
        return block;
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
        const compare = comparison(type, name, anchor);
        if (compare) content.prepend(compare);
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

    /** What each detail button does; every rule (caps, costs, locks) stays in the existing handlers. 'close' only closes. */
    const ACTIONS = Object.freeze({
        equip: ({ type, name }) => (type === 'support' ? toggleSupport(name) : changeSkill(name)),
        enhance: ({ name }) => openEquippedGemManagement(name),
        'summon-more': ({ name }) => changeSummonSkillCount(name, 1),
        'summon-less': ({ name }) => changeSummonSkillCount(name, -1),
        seal: ({ type, name }) => (type === 'support' ? sealSupportGem(name) : sealSkillGem(name)),
        tier: ({ name }, button) => setSupportActiveTier(name, Number(button.dataset.tier))
    });

    function act(event) {
        const button = event.target.closest('[data-gem-action]');
        if (!button || !selection) return;
        const current = { type: selection.type, name: selection.name };
        close();
        ACTIONS[button.dataset.gemAction]?.(current, button);
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

    /** 휴대폰: 상세는 하단 메뉴 띠 바로 위에서 올라오는 시트(가로 전체)다 — 카드 옆 자리가 없다. */
    function placeSheet(root) {
        const nav = document.getElementById('tab-header-bottom');
        const floor = nav?.getClientRects().length ? nav.getBoundingClientRect().top : innerHeight;
        root.style.left = root.style.top = '';
        root.style.bottom = `${(innerHeight - floor) / uiDisplay.factor}px`;
        root.style.maxHeight = `${floor * .72 / uiDisplay.factor}px`;
    }

    /** 상세는 젬이 든 창 안에 머문다 — 창 아래로 넘쳐 HUD 미니맵을 덮었다(검토 2026-10-01). */
    function position() {
        if (!selection) return;
        const root = document.getElementById('gem-selection');
        if (!root.matches(':popover-open')) return;
        if (!selection.anchor.isConnected || !selection.anchor.getClientRects().length) { close(); return; }
        const sheet = uiDisplay.matches('(max-width: 1080px)');
        root.classList.toggle('is-sheet', sheet);
        if (sheet) { placeSheet(root); return; }
        root.style.bottom = '';
        const bounds = popoverBounds(selection.anchor);
        root.style.maxHeight = `${(bounds.bottom - bounds.top - 2 * POPOVER_GAP) / uiDisplay.factor}px`;
        const spot = popoverSpot(selection.anchor.getBoundingClientRect(), root.getBoundingClientRect(), bounds);
        root.style.left = `${spot.x / uiDisplay.factor}px`;
        root.style.top = `${spot.y / uiDisplay.factor}px`;
    }

    document.addEventListener('scroll', position, true);
    document.addEventListener('dblclick', quickEquip);
    window.addEventListener('resize', position);
    safeExposeGlobals({ gemSelectionUi: Object.freeze({ open, application, preview: previewStats }) });
})();
