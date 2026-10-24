// Gem inspection owns transient selection only. Existing equip handlers retain all build/cost guards.
(function () {
    'use strict';
    /** px between the detail popover and its gem card / window edge. */
    const POPOVER_GAP = 8;
    let selection = null;
    const totalDps = stats => stats.totalDps ?? stats.dps ?? 0;

    const TARGET_LABELS = Object.freeze({ main: '주 공격', mobility: '이동', summon: '소환' });
    const TARGET_STATES = Object.freeze({ on: '적용', off: '태그가 맞지 않음', empty: '장착한 스킬 없음', na: '소환수 대응 효과 없음', buff: '사역룬은 보조 대상 아님' });

    function targetRows(name, replaced) {
        const equippedSupports = game.equippedSupports.filter(gem => gem !== replaced && gem !== name).concat(name);
        const result = window.GameModules.skills.supports.targets(name, { ...game, equippedSupports });
        return [{ ...result.main, role: 'main' }, { ...result.mobility, role: 'mobility' },
            ...result.summons.map(row => ({ ...row, role: 'summon' }))];
    }

    function targetCount(name, replaced) {
        return targetRows(name, replaced).filter(row => row.status === 'on').length;
    }

    function application(name, stats, replaced) {
        const roles = [...new Set(targetRows(name, replaced).filter(row => row.status === 'on').map(row => TARGET_LABELS[row.role]))];
        return roles.length ? `적용: ${roles.join(', ')}` : '맞는 스킬 없음';
    }

    function indicators(name, replaced) {
        const rows = targetRows(name, replaced);
        return '<span class="support-targets" aria-label="스킬별 적용">' + Object.entries(TARGET_LABELS).map(([role, label]) => {
            const group = rows.filter(row => row.role === role);
            const status = ['on', 'na', 'off', 'buff', 'empty'].find(key => group.some(row => row.status === key)) || 'empty';
            const text = group.map(row => `${row.name || label}: ${row.reason || TARGET_STATES[row.status]}`).join(', ') || TARGET_STATES.empty;
            return `<span class="support-target is-${status}" title="${escapeHTML(text)}" aria-label="${label}: ${escapeHTML(text)}"><i aria-hidden="true"></i>${label === '주 공격' ? '주' : label.slice(0, 1)}</span>`;
        }).join('') + '</span>';
    }

    function effectText(name, tier, stats) {
        const def = SUPPORT_GEM_DB[name];
        if (def.tierValues) return window.GameModules.skills.supports.describe(name, tier, game);
        const info = getUiGemPresentation(name, true, stats);
        const value = info.value / getSupportTierMultiplier(name, getSupportActiveTier(name)) * getSupportTierMultiplier(name, tier);
        return `${info.statName} +${formatSupportGemEffectValue(value)}${def.isPct ? '%' : ''}`;
    }

    function targetDetails(name, stats, replaced) {
        const effect = effectText(name, getSupportActiveTier(name), stats);
        return `<div class="support-target-details">${targetRows(name, replaced).map(row =>
            `<p class="is-${row.status}"><b>${TARGET_LABELS[row.role]}${row.name ? ` · ${escapeHTML(row.name)}` : ''}</b><span>${escapeHTML(row.status === 'on' ? effect : (row.reason || TARGET_STATES[row.status]))}</span></p>`).join('')}</div>`;
    }

    function summonEffect(name, stats) {
        const def = SKILL_DB[name];
        if (def.aura) {
            const info = getUiGemPresentation(name, false, stats);
            const steps = getGemLevelGrowthSteps(info.finalLevel);
            const rows = def.aura.stats.slice();
            if (def.aura.flatStat) rows.unshift({ stat: def.aura.flatStat, base: def.aura.flatBase, scale: def.aura.flatScale });
            return rows.map(row => `${getStatName(row.stat).replace(/\(%\)$/, '')} +${formatSupportGemEffectValue(row.base + steps * row.scale)}${P_STATS[row.stat]?.isPct ? '%' : ''}`).join(', ');
        }
        if (def.tags.includes('summon_guard')) {
            const preview = getSummonTooltipPreview(name, stats);
            return `생명력 ${Math.floor(preview.maxHp).toLocaleString()}, 적중 피해 ${preview.redirectPct}% 대신 받음`;
        }
        return '';
    }

    function skillSummary(role, name, stats) {
        const key = role === 'active' ? 'main' : role;
        const rows = game.equippedSupports.filter(support => targetRows(support).some(row => row.role === key && row.name === name && row.status === 'on'));
        return `<div class="support-skill-summary"><b>${escapeHTML(name || TARGET_LABELS[key])}: 적용 보조 ${rows.length}개</b><span>${rows.map(support => escapeHTML(effectText(support, getSupportActiveTier(support), stats))).join(', ') || '현재 적용되는 보조 효과가 없습니다.'}</span></div>`;
    }

    function migrationNotice() {
        const migration = game.saveMeta?.supportRuneMigration;
        if (!migration?.noticePending) return;
        addLog(`보조룬 개편: ${migration.moved.map(escapeHTML).join(', ')} 이전, 창공의 정수 ${migration.refund}개 환급. 소환 칸에서 사역룬을 확인하세요.`, 'loot-unique', { toast: true });
        migration.noticePending = false;
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
        root.setAttribute('aria-label', '룬 상세');
        root.innerHTML = '<div class="gem-selection-actions"></div><div class="gem-selection-content"></div>';
        // 따라 하기 안내가 룬 카드와 상세의 '장착' 단추 사이로 표시를 옮긴다.
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
        return '<span class="gem-selection-tiers" aria-label="보조스킬룬 등급">' + [1, 2, 3].slice(0, cap).map(tier =>
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
        return (summon && worn ? summonCount(name) : '') + (enhance ? '<button type="button" data-gem-action="enhance">강화와 각인</button>' : '');
    }

    function actions(type, name, anchor) {
        const support = type === 'support';
        const worn = anchor.classList.contains('active');
        const canUnequip = support || skillGemBoardUi.kindOf(name) === 'summon' || mobilitySkill.isMobilityGem(name);
        const seal = !worn && name !== '기본 공격' ? '<button type="button" data-gem-action="seal" class="gem-selection-seal">봉인</button>' : '';
        return equipButton(anchor, canUnequip) + kindControls(type, name, worn) + seal + '<button type="button" data-gem-action="close" aria-label="룬 상세 닫기">닫기</button>';
    }

    /** The loadout fields with this gem put on. replaced: the gem it takes the place of (js/gem-slot-dialog-ui.js); a summon
     * gem then keeps the replaced one's count. Without it the gem is added: once for a summon gem. */
    function wornWith(kind, name, replaced, saved) {
        const keep = list => list.filter(gem => gem !== replaced);
        if (kind === 'support') return { equippedSupports: keep(saved.equippedSupports).filter(gem => gem !== name).concat(name) };
        if (kind === 'mobility') return { mobilitySkill: name };
        if (kind !== 'summon') return { activeSkill: name };
        const counts = { ...saved.summonSkillCounts, [name]: saved.summonSkillCounts[replaced] || 1 };
        if (replaced !== name) delete counts[replaced];
        return { equippedSummonSkills: keep(saved.equippedSummonSkills).concat(name), summonSkillCounts: counts };
    }

    /** Stats with this gem put on, against the current ones: the main attack swapped, a mobility gem worn, a summon or
     * support gem added (or put in place of `replaced`). The build is restored exactly afterwards (as the item tooltip does). */
    function previewStats(type, name, replaced) {
        const saved = { activeSkill: game.activeSkill, mobilitySkill: game.mobilitySkill, equippedSupports: (game.equippedSupports || []).slice(),
            equippedSummonSkills: (game.equippedSummonSkills || []).slice(), summonSkillCounts: { ...(game.summonSkillCounts || {}) } };
        return previewBuildStats(copy => Object.assign(copy, wornWith(type === 'support' ? 'support' : skillGemBoardUi.kindOf(name), name, replaced, saved)));
    }

    function compareRow(label, before, after) {
        const diff = after - before;
        const pct = before > 0 ? ` ${diff >= 0 ? '▲' : '▼'}${Math.abs(Math.round(diff / before * 100))}%` : '';
        const tone = Math.abs(diff) < 1 ? '' : (diff > 0 ? 'is-up' : 'is-down');
        return `<span>${label}</span><span class="gem-compare-now">${COMPARE_STAT_META.dps.format(before)}</span><span aria-hidden="true">→</span><span class="gem-compare-next ${tone}">${COMPARE_STAT_META.dps.format(after)}${tone ? pct : ''}</span>`;
    }

    /** 부채꼴(연발 사격)의 DPS는 한 대상 기준이라, 옆 화살까지 모두 맞을 때의 값을 한 줄 더 보인다(2026-10-07). */
    function packRows(before, after) {
        const packOf = stats => Math.max(stats.dps || 0, stats.packDps || 0);
        const spreads = stats => packOf(stats) > (stats.dps || 0) * 1.01;
        return spreads(before) || spreads(after) ? [compareRow('무리 최대', packOf(before), packOf(after))] : [];
    }

    /** "장착하면" / "바꾸면" block as HTML: DPS (and summon DPS when either side has one) before → after.
     * @param {string} [replaced] the gem this one takes the place of (the slot dialog's tooltip, js/gem-slot-dialog-ui.js) */
    function compareHtml(type, name, replaced) {
        const { before, after } = previewStats(type, name, replaced);
        const rows = [compareRow('전체 DPS', totalDps(before), totalDps(after))].concat(packRows(before, after));
        if ((before.summonDps || 0) > 0 || (after.summonDps || 0) > 0) rows.push(compareRow('소환 DPS', before.summonDps || 0, after.summonDps || 0));
        return `<div class="gem-compare"><b>${replaced ? '바꾸면' : '장착하면'}</b><div class="gem-compare-grid">${rows.join('')}</div></div>`;
    }

    /** The detail's compare block, for a gem not worn yet. */
    function comparison(type, name, anchor) {
        if (anchor.matches('.active, .equipment-blocked')) return null;
        const holder = document.createElement('div');
        holder.innerHTML = compareHtml(type, name);
        return holder.firstElementChild;
    }

    function open(anchor, type, name) {
        if (type === 'support') { close(); gemSlotDialog.open('support', game.equippedSupports.includes(name) ? name : '', name); return; }
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

    /** 상세가 머무는 사각형: 룬이 든 관리 창(PC), 창이 없으면 화면 — 둘 다 하단 메뉴 띠 위까지. */
    /** 상세가 들어갈 자리: 창과 그 안의 탭 내용(창 테두리 안쪽)이 겹치는 곳, 하단 메뉴 띠 위. 보조 비교 줄이 붙어 상세가 길어지면서 창 테두리에
     * 닿도록 내려가 탭 내용 밖으로 나왔다(2026-10-24, 첫 세션 검사). */
    function popoverBounds(anchor) {
        const nav = document.getElementById('tab-header-bottom');
        const floor = nav?.getClientRects().length ? nav.getBoundingClientRect().top : innerHeight;
        const whole = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
        const frame = anchor.closest('.ui-window-open')?.getBoundingClientRect() || whole, pane = anchor.closest('.tab-content')?.getBoundingClientRect() || whole;
        return { left: Math.max(0, frame.left, pane.left), top: Math.max(0, frame.top, pane.top), right: Math.min(innerWidth, frame.right, pane.right),
            bottom: Math.min(floor, frame.bottom, pane.bottom) };
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

    /** 상세는 룬이 든 창 안에 머문다 — 창 아래로 넘쳐 HUD 미니맵을 덮었다(검토 2026-10-01). */
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
    safeExposeGlobals({ gemSelectionUi: Object.freeze({ open, application, preview: previewStats, compareHtml,
        indicators, targetRows, targetCount, targetDetails, effectText, summonEffect, skillSummary, migrationNotice }) });
})();
