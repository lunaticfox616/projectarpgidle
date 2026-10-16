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
    const supportValueText = (name, value) => `+${formatSupportGemEffectValue(value)}${SUPPORT_GEM_DB[name].isPct ? '%' : ''}`;

    /** Every tier of a support gem: its value (the worn tier's value scaled by the tier multipliers), resonance cost and state.
     * @param {string} name support gem @param {object} stats player stats
     * @returns {{tier: number, label: string, value: number, cost: number, open: boolean, active: boolean}[]} */
    function supportTierRows(name, stats) {
        const active = getSupportActiveTier(name);
        const unlocked = Math.max(1, Math.floor(game.supportGemData[name].unlockedTier || 1));
        const base = (Number(getUiGemPresentation(name, true, stats).value) || 0) / getSupportTierMultiplier(name, active);
        return [1, 2, 3].slice(0, getSupportTierCap(name)).map(tier => ({ tier, label: getSupportTierLabel(name, tier),
            value: base * getSupportTierMultiplier(name, tier), cost: getSupportResonanceCostAtTier(name, tier), open: tier <= unlocked, active: tier === active }));
    }

    /** One tooltip block with every tier's value and cost (js/ui.js showGemTooltip). '' for a gem without tiers. */
    function supportTierLineHtml(name, stats) {
        const rows = supportTierRows(name, stats);
        if (rows.length < 2) return '';
        const cells = rows.map(row => `<span class="gem-tier-cell${row.active ? ' is-active' : ''}${row.open ? '' : ' is-locked'}"><b>${row.label}</b>${supportValueText(name, row.value)}<small>공명 ${row.cost}${row.open ? '' : ', 잠김'}</small></span>`);
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
            const info = getUiGemPresentation(name, true, stats);
            return `<span style="color:${getItemStatToneColor(SUPPORT_GEM_DB[name].stat)}">${escapeHTML(info.statName)} <b>${supportValueText(name, info.value)}</b></span>`;
        }
        const skill = getUiGemPresentation(name, false, stats).skill;
        if ((skill.tags || []).includes('summon_attack')) return summonNumbersHtml(name, stats);
        return `피해 <b>${formatPercentMultiplier(skill.dmg || skill.baseDmg || 1)}</b> 공속 <b>${formatPercentMultiplier(skill.spd || skill.baseSpd || 1)}</b>`;
    }

    /** Support gems worn in the other slots: the gem in this slot leaves, so its place and resonance are free. */
    function supportsInOtherSlots() {
        return game.equippedSupports.filter(gem => gem !== slot.name);
    }

    function summonRoomLeft(name, stats) {
        if (!isSummonGuardSupport(name)) return true;
        const leaving = isSummonGuardSupport(slot.name) ? 1 : 0;
        return getEquippedSummonCount() - leaving < getSummonEquipCapFromStats(stats);
    }

    /** Why a support gem cannot take this slot ('' when it can). */
    function slotSupportFailure(name, stats) {
        const worn = supportsInOtherSlots(), cap = Math.floor(stats.suppCap || 0);
        if (worn.length >= cap) return `장착 한도 부족 (${worn.length}/${cap})`;
        if (!summonRoomLeft(name, stats)) return '소환수 한도 부족';
        const free = Math.max(0, getEffectiveResonanceCap(stats) - worn.reduce((sum, gem) => sum + getSupportTierResonanceCost(gem), 0));
        const cost = getSupportTierResonanceCost(name);
        return free < cost ? `공명력 부족 (${free}/${cost})` : '';
    }

    /** A candidate's state line. rank sorts the list: can go on now (0), cannot (1), worn in another slot (2). */
    function slotSupportState(name, stats) {
        if (game.equippedSupports.includes(name)) return { note: '다른 칸에 장착 중', blocked: true, rank: 2 };
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
        const level = getUiGemPresentation(name, isSupportSlot(), stats).totalLevel;
        return `<button type="button" class="gem-slot-card${slotToneClass(name)}${state.blocked ? ' is-blocked' : ''}" data-slot-gem="${escapeHTML(name)}" aria-disabled="${state.blocked}" ${HINT_HANDLERS}>
            ${slotArtHtml(name, 'gem-slot-card-art', false)}<span class="gem-slot-card-copy"><strong>${escapeHTML(name)}${level ? `<small>Lv.${formatValue('', level)}</small>` : ''}</strong>
            <span class="gem-slot-numbers">${gemNumbersHtml(name, stats)}</span><em>${escapeHTML(state.note)}</em></span></button>`;
    }

    /** Owned gems that fit this slot, without the one in it and the sealed ones. */
    function slotCandidates() {
        if (isSupportSlot()) return game.supports.filter(name => name !== slot.name);
        return game.skills.filter(name => name !== slot.name && skillGemBoardUi.kindOf(name) === slot.kind);
    }

    function slotListHtml(stats) {
        const definitions = isSupportSlot() ? SUPPORT_GEM_DB : SKILL_DB;
        const rows = slotCandidates().filter(name => matchSearchQuery(window.getGemSearchText(name, definitions[name]), slot.query))
            .map(name => ({ name, state: slotGemState(name, stats) })).sort((a, b) => a.state.rank - b.state.rank);
        if (!rows.length) return '<p class="gem-slot-empty">조건에 맞는 룬이 없습니다.</p>';
        return rows.map(row => slotCardHtml(row.name, stats, row.state)).join('');
    }

    function slotTierButtons(name, stats) {
        const rows = supportTierRows(name, stats);
        if (rows.length < 2) return '';
        const buttons = rows.map(row => `<button type="button" class="gem-slot-tier" data-slot-action="tier" data-tier="${row.tier}" aria-pressed="${row.active}" ${row.open ? '' : 'disabled'}>
            <b>${row.label}</b><span>${supportValueText(name, row.value)}</span><small>${row.open ? `공명 ${row.cost}` : '잠김'}</small></button>`).join('');
        const note = rows.every(row => row.open) ? '' : '<small class="gem-slot-tier-note">잠긴 등급은 성장과 각인에서 엽니다.</small>';
        return `<div class="gem-slot-tiers" role="group" aria-label="보조스킬룬 등급">${buttons}</div>${note}`;
    }

    function slotCountButtons(name) {
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
            <div class="gem-slot-controls">${CONTROLS[slot.kind](name, stats)}</div></div>`;
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
            parts.push(`<span>공명력 <b>${Math.max(0, cap - used)}</b> / ${cap}</span>`, `<span>보조스킬룬 <b>${game.equippedSupports.length}</b> / ${Math.floor(stats.suppCap || 0)}칸</span>`);
        }
        if (slot.kind === 'summon') parts.push(`<span>소환수 <b>${getEquippedSummonCount()}</b> / ${getSummonEquipCapFromStats(stats)}</span>`);
        return `<div class="gem-slot-head">${parts.join('')}</div>`;
    }

    function renderSlotDialog() {
        const stats = getUiPlayerStats();
        // 공용 틀은 창 전체의 스크롤만 기억한다. 이 창은 목록만 구르므로 목록의 자리를 따로 지킨다.
        const list = document.getElementById('gem-slot-grid'), scroll = list ? list.scrollTop : 0;
        const body = `${slotHeadHtml(stats)}${slotCurrentHtml(stats)}
            <div class="gem-slot-list-head"><b>${slot.name ? '바꿔 낄 룬' : '낄 룬'}</b>
                <input type="search" id="gem-slot-search" class="gem-slot-search" placeholder="이름, 효과 검색" aria-label="룬 검색" value="${escapeHTML(slot.query)}"></div>
            <div class="gem-slot-grid" id="gem-slot-grid">${slotListHtml(stats)}</div>`;
        selectionDialog.show({ id: DIALOG_ID, title: TITLES[slot.kind], panelClass: `gem-slot-panel is-kind-${slot.kind}`, body });
        document.getElementById('gem-slot-grid').scrollTop = scroll;
    }

    /** @param {'active'|'mobility'|'summon'|'support'} kind the board slot @param {string} name the gem in it, '' for an empty slot */
    function openSlotDialog(kind, name) {
        normalizeSupportLoadout(false);
        normalizeEquippedSummonAttackSkills();
        slot = { kind, name: name || '', query: '', before: null };
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
        if (isSupportSlot()) swapSlotSupport(name);
        else if (slot.kind === 'summon') swapSlotSummon(name);
        else changeSkill(name);
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
        'summon-less': () => changeSummonSkillCount(slot.name, -1)
    });

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
