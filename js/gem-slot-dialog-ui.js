// 룬 칸 창(2026-10-11 사용자): 보드에서 칸을 누르면 바로 뜬다. 지금 낀 룬(등급, 해제, 소환 수, 강화와 각인)과 그 칸에 바꿔 낄 룬
// 목록(수치 포함)을 한곳에 둔다. 틀은 공용 선택 창(js/selection-dialog-ui.js)이고, 장착 규칙(한도, 공명력, 전투 중 잠금)은 기존
// 함수(changeSkill, toggleSupport, setSupportActiveTier, changeSummonSkillCount)가 그대로 갖는다. 이 파일은 그 함수를 순서대로 부를 뿐이다.
(function () {
    'use strict';

    const DIALOG_ID = 'gem-slot-dialog';
    const TITLES = Object.freeze({ active: '주 공격 칸', mobility: '이동 칸', summon: '소환 칸', support: '보조스킬룬 칸' });
    const BORDERS = Object.freeze({ support: '#2bcbba', attack: '#ff5252' });
    /** The slot the open dialog edits. name: the gem in it ('' = empty); query: the search text; before: DPS before the last change.
     * @type {{kind: 'active'|'mobility'|'summon'|'support', name: string, query: string, before: number|null}|null} */
    let slot = null;

    const isSupportSlot = () => slot.kind === 'support';
    const wholeNumber = value => Math.floor(Number(value) || 0).toLocaleString('ko-KR');
    const supportIsFull = stats => !slot.name && game.equippedSupports.length >= Math.floor(stats.suppCap || 0);

    /** Every tier of a support gem: its value (the worn tier's value scaled by the tier multipliers), resonance cost and state.
     * @param {string} name support gem @param {object} stats player stats
     * @returns {{tier: number, label: string, value: number, cost: number, open: boolean, active: boolean}[]} */
    function supportTierRows(name, stats) {
        const active = getSupportActiveTier(name);
        const unlocked = Math.max(1, Math.floor(game.supportGemData[name].unlockedTier || 1));
        const base = (Number(getUiGemPresentation(name, true, stats).value) || 0) / getSupportTierMultiplier(name, active);
        return [1, 2, 3].slice(0, getSupportTierCap(name)).map(tier => ({ tier, label: getSupportTierLabel(name, tier),
            value: SUPPORT_GEM_DB[name].tierValues?.[tier - 1] ?? base * getSupportTierMultiplier(name, tier), cost: getSupportResonanceCostAtTier(name, tier), open: tier <= unlocked, active: tier === active }));
    }

    /** One tooltip block with every tier's value and cost (js/ui.js showGemTooltip). '' for a gem without tiers. */
    function supportTierLineHtml(name, stats) {
        const rows = supportTierRows(name, stats);
        if (rows.length < 2) return '';
        const cells = rows.map(row => `<span class="gem-tier-cell${row.active ? ' is-active' : ''}${row.open ? '' : ' is-locked'}"><b>${row.label}</b>${escapeHTML(gemSelectionUi.effectText(name, row.tier, stats))}<small>공명 ${row.cost}${row.open ? '' : ', 잠김'}</small></span>`);
        return `<div class="tooltip-line gem-tier-line">${cells.join('')}</div>`;
    }

    function summonNumbersHtml(name, stats) {
        const preview = getSummonTooltipPreview(name, stats);
        if (!preview) return '';
        return `1타 <b>${preview.hitDamageMin}~${preview.hitDamageMax}</b>${preview.attackPerSecond > 0 ? ` 초당 <b>${preview.attackPerSecond}</b>회` : ''}`;
    }

    /** The numbers line of a gem: what a support gem gives, or how hard and how fast an attack gem hits. */
    function gemNumbersHtml(name, stats) {
        if (isSupportSlot()) {
            return escapeHTML(gemSelectionUi.effectText(name, getSupportActiveTier(name), stats));
        }
        const skill = getUiGemPresentation(name, false, stats).skill;
        if (skill.tags.some(tag => ['summon_buff', 'summon_guard'].includes(tag))) return escapeHTML(gemSelectionUi.summonEffect(name, stats));
        if ((skill.tags || []).includes('summon_attack')) return summonNumbersHtml(name, stats);
        return `피해 <b>${formatPercentMultiplier(skill.dmg || skill.baseDmg || 1)}</b> 공속 <b>${formatPercentMultiplier(skill.spd || skill.baseSpd || 1)}</b>`;
    }

    /** Support gems worn in the other slots: the gem in this slot leaves, so its place and resonance are free. */
    function supportsInOtherSlots() {
        return game.equippedSupports.filter(gem => gem !== slot.name);
    }

    /** Why a support gem cannot take this slot ('' when it can). */
    function slotSupportFailure(name, stats) {
        const conflict = window.GameModules.skills.supports.conflictReason(name, game, slot.name);
        if (conflict) return conflict;
        const worn = supportsInOtherSlots();
        const free = Math.max(0, getEffectiveResonanceCap(stats) - worn.reduce((sum, gem) => sum + getSupportTierResonanceCost(gem), 0));
        const cost = getSupportTierResonanceCost(name);
        return free < cost ? `공명력 ${cost - free} 모자람` : '';
    }

    /** A candidate's state line. rank sorts the list: can go on now (0), cannot (1), worn in another slot (2). */
    function slotSupportState(name, stats) {
        if (game.equippedSupports.includes(name)) return { note: '다른 칸에 장착 중', blocked: true, rank: 2 };
        if (supportIsFull(stats)) return { note: '교체할 칸을 선택하세요', blocked: false, rank: 0 };
        const failure = slotSupportFailure(name, stats);
        return { note: failure || `공명 ${getSupportTierResonanceCost(name)}`, blocked: !!failure, rank: failure ? 1 : 0 };
    }

    function slotAttackState(name) {
        if (slot.kind === 'summon' && game.equippedSummonSkills.includes(name)) return { note: '다른 칸에 장착 중', blocked: true, rank: 2 };
        if (!canUseSkillWithCurrentEquipment(name)) return { note: getSkillRuneWeaponNote(name), blocked: true, rank: 1 };
        return { note: getGemTileSummary(name, SKILL_DB[name]), blocked: false, rank: 0 };
    }

    const slotGemState = (name, stats) => (isSupportSlot() ? slotSupportState(name, stats) : slotAttackState(name));

    function slotArtHtml(name, className, eager) {
        if (isSupportSlot()) return supportGemSigil.html(name, className, getSupportActiveTier(name));
        return renderSkillGemArt(name, className, { eager });
    }

    const slotToneClass = name => (isSupportSlot() ? ` is-tone-${supportGemSigil.tone(name)}` : ` element-${getGemCardMeta(SKILL_DB[name]).className}`);
    // data-info-tooltip-anchor: 마우스가 룬 위에 있는 동안 툴팁을 지우지 않게 한다(js/ui.js의 mousemove 감시).
    const HINT_HANDLERS = 'data-info-tooltip-anchor="1" onpointerenter="gemSlotDialog.hint(event,this)" onpointerleave="hideInfoTooltip()"';

    function slotCardHtml(name, stats, state) {
        if (isSupportSlot()) return supportCandidateHtml(name, stats, state);
        const level = getUiGemPresentation(name, isSupportSlot(), stats).totalLevel;
        return `<button type="button" class="gem-slot-card${slotToneClass(name)}${state.blocked ? ' is-blocked' : ''}" data-slot-gem="${escapeHTML(name)}" aria-disabled="${state.blocked}" ${HINT_HANDLERS}>
            ${slotArtHtml(name, 'gem-slot-card-art', false)}<span class="gem-slot-card-copy"><strong>${escapeHTML(name)}${level ? `<small>Lv.${formatValue('', level)}</small>` : ''}</strong>
            <span class="gem-slot-numbers">${gemNumbersHtml(name, stats)}</span><em>${escapeHTML(state.note)}</em></span></button>`;
    }

    function candidateTierButtons(name, stats) {
        const free = getEffectiveResonanceCap(stats) - supportsInOtherSlots().reduce((sum, gem) => sum + getSupportTierResonanceCost(gem), 0);
        return `<div class="support-candidate-tiers" role="group" aria-label="${escapeHTML(name)} 등급">${supportTierRows(name, stats).map(row =>
            `<button type="button" data-slot-action="${row.open ? 'candidate-tier' : 'process'}" data-name="${escapeHTML(name)}" data-tier="${row.tier}" aria-pressed="${row.active}" class="${row.open && row.cost <= free ? 'is-affordable' : ''}"><b>${row.label}</b><small>${row.open ? `공명 ${row.cost}` : '창공 가공으로'}</small></button>`).join('')}</div>`;
    }

    function candidateComparison(name) {
        if (game.equippedSupports.includes(name)) return '<span class="support-compare-note">다른 칸에 장착 중</span>';
        const def = SUPPORT_GEM_DB[name];
        if (def.nonDps) return '<span class="support-nondps">DPS 밖 효과</span>';
        if (!slot.name && supportIsFull(getUiPlayerStats())) return '<span class="support-compare-note">교체할 칸을 고르면 DPS를 비교합니다.</span>';
        return gemSelectionUi.compareHtml('support', name, slot.name);
    }

    function supportCandidateHtml(name, stats, state) {
        const level = getUiGemPresentation(name, true, stats).totalLevel;
        const def = SUPPORT_GEM_DB[name];
        return `<article class="gem-slot-card support-candidate${slotToneClass(name)}${slot.preview === name ? ' is-preview' : ''}" data-support-candidate="${escapeHTML(name)}">
            <button type="button" class="support-candidate-heading" data-slot-action="preview" data-name="${escapeHTML(name)}">${slotArtHtml(name, 'gem-slot-card-art', false)}<span><strong>${escapeHTML(name)}</strong><small>Lv.${formatValue('', level)}, 공명 ${getSupportTierResonanceCost(name)}</small></span>${gemSelectionUi.indicators(name, slot.name)}</button>
            <p class="support-candidate-effect">${gemNumbersHtml(name, stats)}</p>${def.tradeoff ? `<p class="support-tradeoff">대가: ${escapeHTML(def.tradeoff)}</p>` : ''}
            ${gemSelectionUi.targetDetails(name, stats, slot.name)}${candidateComparison(name)}${candidateTierButtons(name, stats)}
            <div class="support-candidate-bottom"><small class="${state.blocked ? 'is-short' : ''}">${escapeHTML(state.note)}</small><button type="button" data-slot-action="choose" data-name="${escapeHTML(name)}" ${state.blocked ? 'disabled' : ''}>${slot.name || supportIsFull(stats) ? '바꾸기' : '장착'}</button></div></article>`;
    }

    /** Owned gems that fit this slot, without the one in it and the sealed ones. */
    function slotCandidates() {
        if (isSupportSlot()) return game.supports.filter(name => name !== slot.name);
        return game.skills.filter(name => name !== slot.name && fitsSlot(name));
    }
    /** 칼이 된 발걸음을 신은 동안 주 공격 칸에는 이동 룬도 들어간다(js/ui.js wearMobilityRune). */
    function fitsSlot(name) {
        const kind = skillGemBoardUi.kindOf(name);
        return kind === slot.kind || (slot.kind === 'active' && kind === 'mobility' && isMobilityRuneAttackWorn(game));
    }

    function slotListHtml(stats) {
        const definitions = isSupportSlot() ? SUPPORT_GEM_DB : SKILL_DB;
        const rows = slotCandidates().filter(name => matchSearchQuery(window.getGemSearchText(name, definitions[name]), slot.query))
            .map(name => candidateRow(name, stats)).sort((a, b) => b.count - a.count || b.dps - a.dps || a.state.rank - b.state.rank);
        if (!rows.length) return '<p class="gem-slot-empty">조건에 맞는 룬이 없습니다.</p>';
        const render = row => slotCardHtml(row.name, stats, row.state);
        if (!isSupportSlot()) return rows.map(render).join('');
        const matched = rows.filter(row => row.count > 0), unmatched = rows.filter(row => !row.count);
        return matched.map(render).join('') + (unmatched.length ? `<details class="support-unmatched"><summary>지금 장착한 스킬에 안 맞음 (${unmatched.length})</summary><div class="support-unmatched-grid">${unmatched.map(render).join('')}</div></details>` : '');
    }

    function candidateRow(name, stats) {
        const state = slotGemState(name, stats);
        const count = isSupportSlot() ? gemSelectionUi.targetCount(name, slot.name) : 1;
        const canCompare = isSupportSlot() && count && !SUPPORT_GEM_DB[name].nonDps && !supportIsFull(stats);
        const preview = canCompare ? gemSelectionUi.preview('support', name, slot.name) : null;
        return { name, state, count, dps: preview ? preview.after.totalDps - preview.before.totalDps : 0 };
    }

    function slotTierButtons(name, stats) {
        const rows = supportTierRows(name, stats);
        if (rows.length < 2) return '';
        const buttons = rows.map(row => `<button type="button" class="gem-slot-tier" data-slot-action="tier" data-tier="${row.tier}" aria-pressed="${row.active}" ${row.open ? '' : 'disabled'}>
            <b>${row.label}</b><small>${row.open ? `공명 ${row.cost}` : '잠김'}</small></button>`).join('');
        const note = rows.every(row => row.open) ? '' : `<button type="button" class="gem-slot-tier-note" data-slot-action="process" data-name="${escapeHTML(name)}">창공 가공으로 잠긴 등급 해금</button>`;
        return `<div class="gem-slot-tiers" role="group" aria-label="보조스킬룬 등급">${buttons}</div>${note}`;
    }

    function slotCountButtons(name) {
        if (!SKILL_DB[name].tags.includes('summon_attack')) return '<span class="gem-slot-count">소환 한도 1칸 사용</span>';
        return `<span class="gem-slot-count"><button type="button" data-slot-action="summon-less" aria-label="소환 하나 줄이기">−</button><b>${getSummonSkillCount(name)}기</b><button type="button" data-slot-action="summon-more" aria-label="소환 하나 늘리기">+</button></span>`;
    }

    function slotEnhanceButton(name) {
        const ready = game.gemEnhanceUnlocked && getEquippedEnhanceableGemNames().includes(name);
        return ready ? '<button type="button" data-slot-action="enhance">강화와 각인</button>' : '';
    }

    const OFF_BUTTON = '<button type="button" data-slot-action="off">장착 해제</button>';
    /** What the gem in the slot can do here, by slot kind. The main attack has no 'take off': another gem replaces it. */
    const CONTROLS = Object.freeze({
        support: (name, stats) => `${slotTierButtons(name, stats)}<div class="gem-slot-buttons">${OFF_BUTTON}</div>`,
        summon: name => `<div class="gem-slot-buttons">${slotCountButtons(name)}${slotEnhanceButton(name)}${OFF_BUTTON}</div>`,
        mobility: name => `<div class="gem-slot-buttons">${slotEnhanceButton(name)}${OFF_BUTTON}</div>`,
        active: name => `<div class="gem-slot-buttons">${slotEnhanceButton(name)}</div>`
    });

    /** Where a support gem's effect lands, or how an attack gem reaches (the same one line as the board and the tiles). */
    function slotReachText(name, stats) {
        return isSupportSlot() ? gemSelectionUi.application(name, stats) : getGemTileSummary(name, SKILL_DB[name]);
    }

    function slotCurrentHtml(stats) {
        const name = slot.name;
        if (!name) return '<div class="gem-slot-current is-empty"><strong>비어 있는 칸</strong><p>아래에서 낄 룬을 고르세요.</p></div>';
        const info = getUiGemPresentation(name, isSupportSlot(), stats);
        return `<div class="gem-slot-current${slotToneClass(name)}">
            <div class="gem-slot-current-main" data-slot-gem="${escapeHTML(name)}" ${HINT_HANDLERS}>${slotArtHtml(name, 'gem-slot-current-art', true)}
                <div class="gem-slot-current-copy"><small>지금 낀 룬</small><strong>${escapeHTML(name)}${info.totalLevel ? `<i>Lv.${formatValue('', info.totalLevel)}</i>` : ''}</strong>
                <span class="gem-slot-numbers">${gemNumbersHtml(name, stats)}</span><p>${statToneText.html(info.desc || '')}</p><em>${escapeHTML(slotReachText(name, stats))}</em></div></div>
            <div class="gem-slot-controls">${CONTROLS[slot.kind](name, stats)}</div>${isSupportSlot() ? gemSelectionUi.targetDetails(name, stats) : gemSelectionUi.skillSummary(slot.kind, name, stats)}</div>`;
    }

    function dpsChangeChip(now) {
        if (slot.before === null || slot.before <= 0 || Math.abs(now - slot.before) < 1) return '';
        const up = now > slot.before;
        return `<em class="${up ? 'is-up' : 'is-down'}">${up ? '▲' : '▼'}${Math.abs(Math.round((now - slot.before) / slot.before * 100))}%</em>`;
    }

    /** The strip under the title: DPS now (and how the last change moved it), then what this kind of slot is limited by. */
    function slotHeadHtml(stats) {
        const parts = [`<span>DPS <b>${wholeNumber(stats.dps)}</b>${dpsChangeChip(stats.dps || 0)}</span>`];
        if (stats.summonDps > 0) parts.push(`<span>소환 DPS <b>${wholeNumber(stats.summonDps)}</b></span>`);
        if (isSupportSlot()) {
            const cap = getEffectiveResonanceCap(stats), used = game.equippedSupports.reduce((sum, gem) => sum + getSupportTierResonanceCost(gem), 0);
            parts.push(`<span>공명력 <b>${used}</b> / ${cap}</span>`, `<span>칸 <b>${game.equippedSupports.length}</b> / ${Math.floor(stats.suppCap || 0)}</span>`);
        }
        if (slot.kind === 'summon') parts.push(`<span>소환수 <b>${getEquippedSummonCount()}</b> / ${getSummonEquipCapFromStats(stats)}</span>`);
        return `<div class="gem-slot-head">${parts.join('')}</div>${isSupportSlot() ? resonancePreview(stats) : ''}`;
    }

    function resonancePreview(stats) {
        const cap = getEffectiveResonanceCap(stats);
        const used = supportsInOtherSlots().reduce((sum, name) => sum + getSupportTierResonanceCost(name), 0);
        const cost = slot.preview ? getSupportTierResonanceCost(slot.preview) : 0;
        const width = value => cap ? Math.min(100, value / cap * 100) : 0;
        const caption = slot.preview ? `${slot.preview} 선택, ${used + cost}/${cap}${used + cost > cap ? `, 공명력 ${used + cost - cap} 모자람` : ''}` : '후보 이름을 누르면 공명 비용을 미리 봅니다.';
        return `<div class="support-budget-preview"><div class="support-budget-track"><i style="width:${width(used)}%"></i><em style="left:${width(used)}%;width:${Math.min(100 - width(used), width(cost))}%"></em></div><small>${escapeHTML(caption)}</small></div>`;
    }

    function replacementHtml(stats) {
        if (!slot.pending) return supportIsFull(stats) ? '<p class="support-full-banner">보조 칸이 차서 후보의 ‘바꾸기’로 교체할 칸을 고릅니다.</p>' : '';
        return `<section class="support-replacement"><b>${escapeHTML(slot.pending)}: 교체할 칸 선택</b><div>${game.equippedSupports.map(name => `<button type="button" data-slot-action="replace-slot" data-name="${escapeHTML(name)}">${escapeHTML(name)}<small>공명 ${getSupportTierResonanceCost(name)} 반환</small></button>`).join('')}</div><button type="button" data-slot-action="cancel-replace">취소</button></section>`;
    }

    function renderSlotDialog() {
        const stats = getUiPlayerStats();
        // 공용 틀은 창 전체의 스크롤만 기억한다. 이 창은 목록만 구르므로 목록의 자리를 따로 지킨다.
        const list = document.getElementById('gem-slot-grid'), scroll = list ? list.scrollTop : 0;
        const body = `${slotHeadHtml(stats)}${slotCurrentHtml(stats)}${isSupportSlot() ? replacementHtml(stats) : ''}
            <div class="gem-slot-list-head"><b>${slot.name ? '바꿔 낄 룬' : '낄 룬'}</b>
                <input type="search" id="gem-slot-search" class="gem-slot-search" placeholder="이름, 효과 검색" aria-label="룬 검색" value="${escapeHTML(slot.query)}"></div>
            <div class="gem-slot-grid" id="gem-slot-grid">${slotListHtml(stats)}</div>`;
        selectionDialog.show({ id: DIALOG_ID, title: TITLES[slot.kind], panelClass: `gem-slot-panel is-kind-${slot.kind}`, body });
        document.getElementById('gem-slot-grid').scrollTop = scroll;
    }

    /** @param {'active'|'mobility'|'summon'|'support'} kind the board slot @param {string} name the gem in it, '' for an empty slot */
    function openSlotDialog(kind, name, preview) {
        normalizeSupportLoadout(false);
        normalizeEquippedSummonAttackSkills();
        slot = { kind, name: name || '', query: '', before: null, preview: preview || '', pending: '' };
        hideInfoTooltip();
        renderSlotDialog();
    }

    /** Puts a support gem into this slot: the old one comes off first, and goes back on when the new one is refused. */
    function swapSlotSupport(name) {
        const old = slot.name, place = game.equippedSupports.indexOf(old);
        if (old) toggleSupport(old);
        if (game.equippedSupports.includes(old)) return;
        toggleSupport(name);
        if (!game.equippedSupports.includes(name)) { if (old) toggleSupport(old); return; }
        // 누른 칸에 새 룬이 놓이도록 자리를 옮긴다(장착 순서는 보드의 칸 순서일 뿐이다).
        if (place >= 0) game.equippedSupports.splice(place, 0, game.equippedSupports.pop());
        slot.name = name;
    }

    /** Puts a summon gem into this slot and gives it the count the old one had, as far as the summon cap allows. */
    function swapSlotSummon(name) {
        const old = slot.name, count = old ? getSummonSkillCount(old) : 1;
        if (old) changeSkill(old);
        if (game.equippedSummonSkills.includes(old)) return;
        for (let i = 0; i < count; i++) changeSummonSkillCount(name, 1);
        if (game.equippedSummonSkills.includes(name)) slot.name = name;
    }

    function chooseSlotGem(name) {
        if (isSupportSlot()) {
            if (supportIsFull(getUiPlayerStats())) { slot.pending = name; slot.preview = name; return; }
            if (slotSupportFailure(name, getUiPlayerStats())) return;
            swapSlotSupport(name);
        }
        else if (slot.kind === 'summon') swapSlotSummon(name);
        else {
            // 칼이 된 발걸음: 이동 칸에 있던 룬을 공격 칸으로 고르면 이동 칸을 먼저 비운다(js/ui.js wearMobilityRune).
            if (slot.kind === 'active' && game.mobilitySkill === name) wearMobilityGem('');
            changeSkill(name, slot.kind);
        }
    }

    /** After a change the slot shows what is really worn: the main attack always holds a gem, the others may be empty. */
    function settleSlot() {
        if (slot.kind === 'active') slot.name = game.activeSkill || '기본 공격';
        else if (slot.kind === 'mobility') slot.name = mobilitySkill.equipped();
        else if (!(isSupportSlot() ? game.equippedSupports : game.equippedSummonSkills).includes(slot.name)) slot.name = '';
    }

    const ACTIONS = Object.freeze({
        tier: button => setSupportActiveTier(slot.name, Number(button.dataset.tier)),
        off: () => (isSupportSlot() ? toggleSupport(slot.name) : changeSkill(slot.name)),
        enhance: () => { selectionDialog.close(DIALOG_ID); openEquippedGemManagement(slot.name); },
        'summon-more': () => changeSummonSkillCount(slot.name, 1),
        'summon-less': () => changeSummonSkillCount(slot.name, -1),
        choose: button => chooseSlotGem(button.dataset.name),
        preview: button => { slot.preview = button.dataset.name; },
        'candidate-tier': button => { setSupportActiveTier(button.dataset.name, Number(button.dataset.tier)); slot.preview = button.dataset.name; },
        process: button => openSupportProcessing(button.dataset.name),
        'replace-slot': button => { slot.name = button.dataset.name; slot.preview = slot.pending; slot.pending = ''; },
        'cancel-replace': () => { slot.pending = ''; }
    });

    function openSupportProcessing(name) {
        selectionDialog.close(DIALOG_ID);
        if (!contentProgression.canOpen('skill-tab-enhance')) {
            switchTab('tab-unlocks');
            contentUnlockUi.select('gemForge');
            addLog('창공 가공을 사용하려면 룬 강화를 먼저 해금하세요.', 'loot-unique');
            return;
        }
        switchSkillSubtab('skill-tab-enhance');
        updateStaticUI();
        const cards = document.querySelectorAll('.gem-support-process-card');
        const card = [...cards].find(node => node.querySelector('strong')?.textContent === name);
        card?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    /** Runs one change through the existing handlers, then redraws the dialog in place with the new numbers. */
    function runSlotChange(change) {
        const before = getUiPlayerStats().dps || 0;
        hideInfoTooltip();
        change();
        if (!selectionDialog.isOpen(DIALOG_ID)) return;
        settleSlot();
        slot.before = before;
        renderSlotDialog();
    }

    function onSlotDialogClick(event) {
        if (!slot || !event.target.closest(`#${DIALOG_ID}`)) return;
        const action = event.target.closest('[data-slot-action]');
        if (action) { runSlotChange(() => ACTIONS[action.dataset.slotAction](action)); return; }
        const card = event.target.closest('.gem-slot-grid [data-slot-gem]');
        if (card && card.getAttribute('aria-disabled') !== 'true') runSlotChange(() => chooseSlotGem(card.dataset.slotGem));
    }

    /** Typing only redraws the list: redrawing the whole dialog would recreate the field and break Korean input. */
    function onSlotSearchInput(event) {
        if (!slot || event.target.id !== 'gem-slot-search') return;
        slot.query = event.target.value;
        document.getElementById('gem-slot-grid').innerHTML = slotListHtml(getUiPlayerStats());
    }

    /** Hover on a gem in the dialog, mouse only: the full gem tooltip, and for a candidate what the swap does to DPS.
     * A phone gets none: after a tap the browser may fire a mouse-type enter on the redrawn card. */
    function slotGemHint(event, element) {
        if (event.pointerType !== 'mouse' || !slot || !window.matchMedia('(hover: hover)').matches) return;
        const name = element.dataset.slotGem, type = isSupportSlot() ? 'support' : 'active';
        const holder = document.createElement('div');
        showGemTooltip(null, type, name, holder);
        const candidate = name !== slot.name && element.getAttribute('aria-disabled') !== 'true';
        const compare = candidate ? gemSelectionUi.compareHtml(type, name, slot.name) : '';
        showInfoTooltipHtml(event.clientX, event.clientY, holder.innerHTML + compare, BORDERS[type === 'support' ? 'support' : 'attack'], `slot:${slot.kind}:${name}`);
    }

    document.addEventListener('click', onSlotDialogClick);
    document.addEventListener('input', onSlotSearchInput);
    safeExposeGlobals({ gemSlotDialog: Object.freeze({ open: openSlotDialog, hint: slotGemHint, tierLineHtml: supportTierLineHtml }) });
}());
