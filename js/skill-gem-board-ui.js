// 스킬룬 보드 (2026-10-04 사용자 요청): 장착 화면 위쪽에 지금 낀 것을 한눈에 —
// 가운데 주 공격 룬, 둘레에 그 룬의 각인 5칸, 아래 이동 · 소환 칸, 따로 보조스킬룬 칸 줄(장착 한도만큼 + 다음 칸 미리보기).
// 칸을 누르면 룬 칸 창(js/gem-slot-dialog-ui.js)이 바로 뜬다: 지금 낀 룬의 등급, 해제와 그 칸에 바꿔 낄 룬(2026-10-11 사용자 요청).
// 옆 목록(js/skills-ui.js)도 그 칸에 낄 수 있는 룬으로 바뀐다. 낀 룬과 각인에 마우스를 올리면 수치가 든 툴팁이 뜬다.
// 찬 · 빈 각인 칸은 각인 고르기 창을 바로 열고, 다음 · 잠긴 칸은 강화 · 각인 탭으로 간다. 표시 · 칸 고르기만 하며 장착 규칙은 기존 함수(changeSkill · toggleSupport)가 갖는다.
(function () {
    'use strict';

    /** 목록이 보여 줄 칸 종류. 화면에만 있는 고르기 상태라 저장하지 않는다. @type {'active'|'mobility'|'summon'|'support'} */
    let pickerKind = 'active';
    let focusedSkill = { kind: 'active', name: '' };
    const PICKER_TITLES = Object.freeze({ active: '주 공격 칸에 낄 룬', mobility: '이동 칸에 낄 룬', summon: '소환 칸에 낄 룬', support: '보조스킬룬 칸에 낄 룬' });
    const RING_RADIUS = 96;
    /** What a click on an engraving slot without an engraving does (the hover tooltip's second line). */
    const ENGRAVE_HINTS = Object.freeze({ open: '눌러서 넣을 각인을 고릅니다.', next: '강화와 각인에서 이 칸을 엽니다.', lock: '앞 칸부터 차례로 엽니다.' });
    const GROUP_TONES = Object.freeze({ basic: '#7aa4d6', crafted: '#d9a650', awakened: '#b48ae6' });
    // data-info-tooltip-anchor: 마우스가 이 칸 위에 있는 동안 툴팁을 지우지 않게 한다(js/ui.js의 mousemove 감시).
    const hoverHint = (type, name) => `data-info-tooltip-anchor="1" onpointerenter="skillGemBoardUi.hint(event,'${type}','${name}')" onpointerleave="hideInfoTooltip()"`;

    /** @param {string} name skill gem name @returns {'active'|'mobility'|'summon'} the slot kind the gem is worn in (js/ui.js changeSkill) */
    function kindOf(name) {
        if ((SKILL_DB[name]?.tags || []).includes('summon')) return 'summon';
        return mobilitySkill.isMobilityGem(name) ? 'mobility' : 'active';
    }

    function gemArt(name, className) {
        return renderSkillGemArt(name, className, { eager: true });
    }

    /** 주 공격 룬의 각인 칸 5개: 찬 칸 · 빈 칸(열림) · 다음에 열 칸 · 잠긴 칸. 각인 해금 전이나 기본 공격이면 없음. */
    function engraveSlots(main) {
        if (!contentProgression.isUnlocked('engraving') || !isEnhanceableAttackGem(main)) return [];
        const ids = getSkyEnhancementSlotsForSkill(main);
        const cap = normalizeGemRecord((game.gemData || {})[main]).skyEnhanceCap || 1;
        return [0, 1, 2, 3, 4].map(index => {
            const def = index < cap && ids[index] ? GEM_SKY_ENHANCEMENTS[ids[index]] : null;
            const state = index < cap ? (def ? 'full' : 'open') : (index === cap ? 'next' : 'lock');
            return { index, state, def };
        });
    }

    function engraveLabel(slot) {
        if (slot.state === 'full') return slot.def.name;
        return slot.state === 'open' ? '빈 각인' : (slot.state === 'next' ? '다음 칸' : '잠김');
    }

    function renderEngraveRing(slots) {
        if (!slots.length) return '';
        const marks = slots.map(slot => {
            const angle = -Math.PI / 2 + slot.index * 2 * Math.PI / 5;
            const x = Math.round(Math.cos(angle) * RING_RADIUS), y = Math.round(Math.sin(angle) * RING_RADIUS);
            // 찬 칸은 각인 종류 그림(검 · 쌍갈매기 · 눈 · 핏방울 …), 빈 칸은 +. 마름모 색은 각인 묶음(기본 · 조율 · 각성)을 따른다.
            const glyph = slot.state === 'full' ? renderSkyEnhancementIcon(slot.def) : (slot.state === 'open' ? '+' : '');
            const group = slot.state === 'full' ? ` is-group-${getSkyEnhancementGroup(slot.def).className}` : '';
            const title = slot.state === 'full' ? `${slot.def.name}, ${slot.def.desc}` : engraveLabel(slot);
            return `<button type="button" class="skill-board-engrave is-${slot.state}${group}" style="--x:${x}px;--y:${y}px" data-board-engrave="${slot.index}" data-info-tooltip-anchor="1" onpointerenter="skillGemBoardUi.engraveHint(event,${slot.index})" onpointerleave="hideInfoTooltip()" aria-label="각인 ${slot.index + 1}: ${escapeHTML(title)}"><i>${glyph ? `<b>${glyph}</b>` : ''}</i><span>${escapeHTML(engraveLabel(slot))}</span></button>`;
        }).join('');
        return `<div class="skill-board-ring" aria-hidden="false">${marks}</div>`;
    }

    function renderSatellite(kind, label, name, extra) {
        if (!name) return `<button type="button" class="skill-board-satellite is-empty" data-board-pick="${kind}" aria-label="${label} 칸 비어 있음, 룬 고르기"><i>+</i><small>${label}</small><b>비어 있음</b></button>`;
        return `<button type="button" class="skill-board-satellite active element-${getGemCardMeta(SKILL_DB[name]).className}" data-board-pick="${kind}" data-board-gem="${escapeHTML(name)}" ${hoverHint('active', name)} aria-label="${label}: ${escapeHTML(name)}">${gemArt(name, 'skill-board-satellite-art')}<small>${label}${extra || ''}</small><b>${escapeHTML(name)}</b></button>`;
    }

    function renderSummons(stats) {
        const worn = game.equippedSummonSkills || [];
        const parts = worn.map(name => renderSatellite('summon', '소환', name, ` ×${getSummonSkillCount(name)}`));
        if (getEquippedSummonCount() < getSummonEquipCapFromStats(stats)) parts.push(renderSatellite('summon', '소환', ''));
        return `<div class="skill-board-summons">${parts.join('')}<small>소환 한도 ${getEquippedSummonCount()}/${getSummonEquipCapFromStats(stats)}</small></div>`;
    }

    function renderBoard(stats) {
        const main = game.activeSkill || '기본 공격';
        const info = getUiGemPresentation(main, false, stats);
        const meta = getGemCardMeta(SKILL_DB[main] || {});
        const slots = engraveSlots(main);
        const filled = slots.filter(slot => slot.state === 'full').length, open = slots.filter(slot => slot.state === 'full' || slot.state === 'open').length;
        const engraveNote = slots.length ? `<em>각인 ${filled} / ${open}칸</em>` : '';
        const level = info.totalLevel > info.baseLevel ? `<small class="is-boosted">Lv.${formatValue('', info.totalLevel)}</small>` : `<small>Lv.${info.totalLevel || 1}</small>`;
        return `<div class="skill-board-linked-row"><div class="skill-board-mobility">${renderSatellite('mobility', '이동', mobilitySkill.equipped())}</div><div class="skill-board-main"><div class="skill-board-head"><span>주 공격</span><b>${escapeHTML(main)}</b>${level}${engraveNote}</div>
            <div class="skill-board-stage element-${meta.className}${slots.length ? ' has-ring' : ''}">
                ${renderEngraveRing(slots)}
                <button type="button" class="skill-board-core active" data-board-pick="active" data-board-gem="${escapeHTML(main)}" ${hoverHint('active', main)} aria-label="주 공격: ${escapeHTML(main)}, 바꿀 룬 고르기">${gemArt(main, 'skill-board-core-art')}</button>
            </div></div>${renderSummons(stats)}</div>`;
    }

    /** 칸 아래 한 줄용 적용 대상(gemSelectionUi.application의 문장을 줄인 것). */
    function shortTarget(text) {
        if (text.startsWith('적용: ')) return text.slice(4);
        return '맞는 스킬 없음';
    }

    function renderSupportSlot(name, stats) {
        const target = shortTarget(gemSelectionUi.application(name, stats));
        const role = focusedSkill.kind === 'active' ? 'main' : focusedSkill.kind;
        const lit = gemSelectionUi.targetRows(name).some(row => row.role === role && row.name === focusedName() && row.status === 'on');
        return `<button type="button" class="support-slot active${lit ? ' is-linked' : ''}" data-board-pick="support" data-board-gem="${escapeHTML(name)}" ${hoverHint('support', name)} aria-label="보조스킬룬: ${escapeHTML(name)}, ${escapeHTML(target)}">${supportGemSigil.html(name, 'support-slot-sigil', getSupportActiveTier(name))}<b>${escapeHTML(name)}</b>${gemSelectionUi.indicators(name)}<small>${escapeHTML(target)}</small></button>`;
    }

    function focusedName() {
        if (focusedSkill.kind === 'active') return game.activeSkill || '기본 공격';
        if (focusedSkill.kind === 'mobility') return mobilitySkill.equipped();
        return game.equippedSummonSkills.includes(focusedSkill.name) ? focusedSkill.name : (game.equippedSummonSkills[0] || '');
    }

    function renderSupports(stats) {
        const cap = Math.max(0, Math.floor(stats.suppCap || 0));
        const worn = (game.equippedSupports || []).slice(0, cap);
        const resonanceCap = getEffectiveResonanceCap(stats);
        const used = (game.equippedSupports || []).reduce((sum, name) => sum + getSupportTierResonanceCost(name), 0);
        const fill = resonanceCap > 0 ? Math.round(Math.min(1, used / resonanceCap) * 100) : 0;
        const slots = worn.map(name => renderSupportSlot(name, stats));
        for (let i = worn.length; i < cap; i++) slots.push('<button type="button" class="support-slot is-empty" data-board-pick="support" aria-label="빈 보조스킬룬 칸, 룬 고르기"><i>+</i><b>빈 칸</b><small>&nbsp;</small></button>');
        slots.push('<div class="support-slot is-lock" aria-label="다음 보조스킬룬 칸은 장비, 패시브로 늘어납니다"><i></i><b>다음 칸</b><small>장비, 패시브</small></div>');
        return `<div class="support-slots-head"><span>보조스킬룬</span><em>칸 ${worn.length} / ${cap}</em>
                <div class="support-resonance" title="장착 보조스킬룬이 쓰는 공명력"><small>공명력</small><span class="support-resonance-bar"><i style="width:${fill}%"></i></span><b>${used}</b><small>/ ${resonanceCap}</small></div></div>
            <div class="support-slots-row">${slots.join('')}</div>${gemSelectionUi.skillSummary(focusedSkill.kind, focusedName(), stats)}<div class="support-indicator-key">● 적용, ○ 태그 불일치, ◌ 빈 칸, ◉ 소환 대응 없음, ⊙ 사역룬 제외</div>`;
    }

    /** @param {object} stats current player stats (getPlayerStats). Rewrites the board only when its HTML changed. */
    function render(stats) {
        const board = document.getElementById('ui-skill-board');
        const supports = document.getElementById('ui-support-slots');
        const boardHtml = renderBoard(stats);
        if (board.dataset.renderSig !== boardHtml) { board.innerHTML = boardHtml; board.dataset.renderSig = boardHtml; }
        const supportHtml = renderSupports(stats);
        if (supports.dataset.renderSig !== supportHtml) { supports.innerHTML = supportHtml; supports.dataset.renderSig = supportHtml; }
        // 고르는 칸 표시는 HTML 밖(data 속성)에 둔다: 칸을 바꿔도 보드를 다시 그리지 않아 방금 연 상세가 닫히지 않는다.
        document.getElementById('skill-tab-equip').dataset.picking = pickerKind;
        document.getElementById('ui-skill-picker-title').textContent = PICKER_TITLES[pickerKind];
    }

    /** The picker shows one kind; a support pick needs the support content unlocked (otherwise it falls back to attack). */
    function currentKind() {
        if (pickerKind === 'support' && !contentProgression.isUnlocked('support')) pickerKind = 'active';
        return pickerKind;
    }

    /** @param {'active'|'mobility'|'summon'|'support'} kind the board slot whose gems the picker lists next
     * @param {boolean} [stay] the slot dialog opens over the board, so the phone does not scroll to the list */
    function pick(kind, stay) {
        pickerKind = kind;
        document.getElementById('skill-tab-equip').dataset.picking = kind;
        updateStaticUI();
        // 휴대폰: 보드 아래의 목록이 화면 밖이면 그쪽으로 데려간다.
        const list = document.querySelector('#skill-tab-equip .skill-picker');
        if (list && !stay && uiDisplay.matches('(max-width: 1080px)')) list.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    function openEngrave(index) {
        const main = game.activeSkill;
        const slot = engraveSlots(main)[index];
        if (!slot) return;
        // 찬 칸 · 빈 칸은 그 자리에서 각인 고르기 창(강화 · 각인 탭의 칸과 같은 창)을 연다(2026-10-06 사용자 요청 — 탭으로
        // 옮기기만 하는 단추였다). 다음 칸 · 잠긴 칸은 해금(재화 사용)을 하지 않고 강화 · 각인 탭만 연다 — 해금은 그 탭의 단추로.
        if (slot.state === 'full' || slot.state === 'open') {
            game.gemEnhanceTargetSkill = main;
            openGemEngraveSlotOverlay(index);
            return;
        }
        openEquippedGemManagement(main);
    }

    document.addEventListener('click', event => {
        const engrave = event.target.closest('[data-board-engrave]');
        if (engrave) { openEngrave(Number(engrave.dataset.boardEngrave)); return; }
        const fold = event.target.closest('#btn-skill-picker-fold');
        if (fold) { toggleGemFoldMode(currentKind() === 'support' ? 'support' : 'attack'); return; }
        const slot = event.target.closest('[data-board-pick]');
        if (!slot) return;
        const kind = slot.dataset.boardPick;
        if (kind !== 'support') { focusedSkill = { kind, name: slot.dataset.boardGem || '' }; render(getUiPlayerStats()); }
        // 칸을 누르면 룬 칸 창이 바로 뜬다(찬 칸: 등급, 해제, 바꿔 낄 룬 / 빈 칸: 낄 룬). 첫 룬 따라 하기 중에는 옆 목록의 표시를 따라가게 둔다.
        const guided = !!getStarterGemTutorialTarget();
        if (kind !== pickerKind) pick(kind, !guided);
        if (!guided) gemSlotDialog.open(kind, slot.dataset.boardGem || '');
    });

    /** A real mouse on a device that can hover: after a tap the browser may fire a mouse-type enter on the redrawn slot. */
    const hoversWithMouse = event => event.pointerType === 'mouse' && window.matchMedia('(hover: hover)').matches;

    /** Hover on a worn gem, mouse only: the same tooltip with numbers as the picker tiles. */
    function wornGemHint(event, type, name) {
        if (hoversWithMouse(event)) showGemTooltip(event, type, name);
    }

    function boardEngraveTooltipHtml(slot) {
        if (slot.state !== 'full') return `<div class="tooltip-title">${engraveLabel(slot)}</div><div class="tooltip-line">${ENGRAVE_HINTS[slot.state]}</div>`;
        const group = getSkyEnhancementGroup(slot.def);
        return `<div class="tooltip-title engrave-tone-${group.className}">${escapeHTML(slot.def.name)}</div><div class="tooltip-line engrave-tooltip-group">${group.label} 각인, ${slot.index + 1}번 칸</div>`
            + `<div class="tooltip-line engrave-tooltip-effect">${statToneText.html(slot.def.desc)}</div><div class="tooltip-line gem-card-hint">누르면 다른 각인으로 바꿉니다</div>`;
    }

    /** Hover on an engraving slot, mouse only: the engraving's group and effect (the native title was small and slow). */
    function boardEngraveHint(event, index) {
        const slot = hoversWithMouse(event) ? engraveSlots(game.activeSkill)[index] : null;
        if (!slot) return;
        const tone = slot.state === 'full' ? GROUP_TONES[getSkyEnhancementGroup(slot.def).className] : GROUP_TONES.basic;
        showInfoTooltipHtml(event.clientX, event.clientY, boardEngraveTooltipHtml(slot), tone, `engrave:${index}:${slot.state}`);
    }

    safeExposeGlobals({ skillGemBoardUi: Object.freeze({ render, pick, currentKind, kindOf, hint: wornGemHint, engraveHint: boardEngraveHint }) });
}());
