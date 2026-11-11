// 스킬룬 보드 (2026-10-04 사용자 요청): 장착 화면 위쪽에 지금 낀 것을 한눈에 —
// 가운데 주 공격 룬, 둘레에 그 룬의 각인 5칸, 아래 이동 · 소환 칸, 따로 보조스킬룬 칸 줄(장착 한도만큼 + 다음 칸 미리보기).
// 칸을 누르면 룬 칸 창(js/gem-slot-dialog-ui.js)이 바로 뜬다: 지금 낀 룬의 등급, 해제와 그 칸에 바꿔 낄 룬(2026-10-11 사용자 요청).
// 옆 목록(js/skills-ui.js)도 그 칸에 낄 수 있는 룬으로 바뀐다. 낀 룬과 각인에 마우스를 올리면 수치가 든 툴팁이 뜬다.
// 찬 · 빈 각인 칸은 각인 고르기 창을 바로 열고, 다음 칸은 묻고 창공의 정수로 연다(2026-11-08 사용자), 잠긴 칸은 강화 · 각인 탭으로 간다. 표시 · 칸 고르기만 하며 장착 규칙은 기존 함수(changeSkill · toggleSupport)가 갖는다.
(function () {
    'use strict';

    /** 목록이 보여 줄 칸 종류, sealed는 봉인한 룬 목록(js/skills-ui.js의 봉인 탭). 화면에만 있는 고르기 상태라 저장하지 않는다.
     * @type {'active'|'mobility'|'summon'|'support'|'sealed'} */
    let pickerKind = 'active';
    let focusedSkill = { kind: 'active', name: '' };
    // 목록 제목(2026-11-09 사용자: 주 공격 칸에 낄 룬 -> 공격스킬룬). 다른 칸도 같은 꼴로 맞췄다.
    const PICKER_TITLES = Object.freeze({ active: '공격스킬룬', mobility: '이동스킬룬', summon: '소환스킬룬', support: '보조스킬룬', sealed: '봉인한 룬' });
    const RING_RADIUS = 96;
    /** What a click on an engraving slot without an engraving does (the hover tooltip's second line). */
    const ENGRAVE_HINTS = Object.freeze({ open: '눌러서 넣을 각인을 고릅니다.', next: '눌러서 이 칸을 엽니다.', lock: '앞 칸부터 차례로 엽니다.' });
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

    /** What opening the slot at index takes (js/skills.js upgradeSkyEngraveCap): loop 4, and index + 1 창공의 정수 (the next slot costs the
     * open count plus one, so the slot at index costs index + 1 when its turn comes). */
    function engraveUnlockNeed(index) {
        return { need: index + 1, have: Math.floor(Number(game.currencies.skyEssence) || 0), loopOk: (game.season || 1) >= 4 };
    }

    /** Why the next slot cannot open now, or ''. */
    function engraveUnlockBlock(need) {
        if (!need.loopOk) return _t('루프 4부터 열 수 있습니다.');
        return need.have < need.need ? _t('창공의 정수가 부족합니다. (필요: {need})', { need: need.need }) : '';
    }

    function engraveLabel(slot) {
        if (slot.state === 'full') return _t(slot.def.name);
        return _t(slot.state === 'open' ? '빈 각인' : (slot.state === 'next' ? '다음 칸' : '잠김'));
    }

    function renderEngraveRing(slots) {
        if (!slots.length) return '';
        const marks = slots.map(slot => {
            const angle = -Math.PI / 2 + slot.index * 2 * Math.PI / 5;
            const x = Math.round(Math.cos(angle) * RING_RADIUS), y = Math.round(Math.sin(angle) * RING_RADIUS);
            // 찬 칸은 각인 종류 그림(검 · 쌍갈매기 · 눈 · 핏방울 …), 빈 칸은 +. 마름모 색은 각인 묶음(기본 · 조율 · 각성)을 따른다.
            const glyph = slot.state === 'full' ? renderSkyEnhancementIcon(slot.def) : (slot.state === 'open' ? '+' : '');
            const group = slot.state === 'full' ? ` is-group-${getSkyEnhancementGroup(slot.def).className}` : '';
            const title = slot.state === 'full' ? `${_t(slot.def.name)}, ${slot.def.desc}` : engraveLabel(slot);
            return `<button type="button" class="skill-board-engrave is-${slot.state}${group}" style="--x:${x}px;--y:${y}px" data-board-engrave="${slot.index}" data-info-tooltip-anchor="1" onpointerenter="skillGemBoardUi.engraveHint(event,${slot.index})" onpointerleave="hideInfoTooltip()" aria-label="${_t('각인 {value}: {title}', { value: slot.index + 1, title: escapeHTML(title) })}"><i>${glyph ? `<b>${glyph}</b>` : ''}</i><span>${escapeHTML(engraveLabel(slot))}</span></button>`;
        }).join('');
        return `<div class="skill-board-ring" aria-hidden="false">${marks}</div>`;
    }

    /** cap: the summon limit ("0/1") written small above the first summon slot's label. Only the empty slot names it on hover: a worn
     * rune's slot shows the rune's own tooltip. */
    function renderSatellite(kind, label, name, extra, cap = '') {
        if (!name) return `<button type="button" class="skill-board-satellite is-empty" data-board-pick="${kind}" aria-label="${_t('{label} 칸 비어 있음, 룬 고르기', { label })}"><i>+</i>${cap ? `<em class="skill-board-cap" data-tip="${_t('소환 한도')}">${cap}</em>` : ''}<small>${label}</small><b>${_t('비어 있음')}</b></button>`;
        return `<button type="button" class="skill-board-satellite active element-${getGemCardMeta(SKILL_DB[name]).className}" data-board-pick="${kind}" data-board-gem="${escapeHTML(name)}" ${hoverHint('active', name)} aria-label="${label}: ${escapeHTML(_t(name))}">${gemArt(name, 'skill-board-satellite-art')}${cap ? `<em class="skill-board-cap">${cap}</em>` : ''}<small>${label}${extra || ''}</small><b>${escapeHTML(_t(name))}</b></button>`;
    }

    /** The summon slots. The limit sits small above the first slot's label instead of a line under the column (2026-11-08 사용자:
     * 그 줄 때문에 소환 칸이 이동 칸보다 높이 떠 있었다). */
    function renderSummons(stats) {
        const worn = game.equippedSummonSkills || [];
        const cap = `${getEquippedSummonCount()}/${getSummonEquipCapFromStats(stats)}`;
        const parts = worn.map((name, index) => renderSatellite('summon', _t('소환'), name, ` ×${getSummonSkillCount(name)}`, index ? '' : cap));
        if (getEquippedSummonCount() < getSummonEquipCapFromStats(stats)) parts.push(renderSatellite('summon', _t('소환'), '', '', parts.length ? '' : cap));
        return `<div class="skill-board-summons">${parts.join('')}</div>`;
    }

    function renderBoard(stats) {
        const main = game.activeSkill || '기본 공격';
        const info = getUiGemPresentation(main, false, stats);
        const meta = getGemCardMeta(SKILL_DB[main] || {});
        const slots = engraveSlots(main);
        const filled = slots.filter(slot => slot.state === 'full').length, open = slots.filter(slot => slot.state === 'full' || slot.state === 'open').length;
        const engraveNote = slots.length ? `<em>${_t('각인 {filled} / {open}칸', { filled, open })}</em>` : '';
        const level = info.totalLevel > info.baseLevel ? `<small class="is-boosted">Lv.${formatValue('', info.totalLevel)}</small>` : `<small>Lv.${info.totalLevel || 1}</small>`;
        return `<div class="skill-board-linked-row"><div class="skill-board-mobility">${renderSatellite('mobility', _t('이동'), mobilitySkill.equipped())}</div><div class="skill-board-main"><div class="skill-board-head"><span>${_t('주 공격')}</span><b>${escapeHTML(_t(main))}</b>${level}${engraveNote}</div>
            <div class="skill-board-stage element-${meta.className}${slots.length ? ' has-ring' : ''}">
                ${renderEngraveRing(slots)}
                <button type="button" class="skill-board-core active" data-board-pick="active" data-board-gem="${escapeHTML(main)}" ${hoverHint('active', main)} aria-label="${_t('주 공격: {name}, 바꿀 룬 고르기', { name: _t(main) })}">${gemArt(main, 'skill-board-core-art')}</button>
            </div></div>${renderSummons(stats)}</div>`;
    }

    /** 칸 아래 한 줄용 적용 대상(gemSelectionUi.application의 문장을 줄인 것). */
    function shortTarget(text) {
        if (text.startsWith('적용: ')) return text.slice(4);
        return _t('맞는 스킬 없음');
    }

    function renderSupportSlot(name, stats) {
        const target = shortTarget(gemSelectionUi.application(name, stats));
        const role = focusedSkill.kind === 'active' ? 'main' : focusedSkill.kind;
        const lit = gemSelectionUi.targetRows(name).some(row => row.role === role && row.name === focusedName() && row.status === 'on');
        return `<button type="button" class="support-slot active${lit ? ' is-linked' : ''}" data-board-pick="support" data-board-gem="${escapeHTML(name)}" ${hoverHint('support', name)} aria-label="${_t('보조스킬룬')}: ${escapeHTML(_t(name))}, ${escapeHTML(target)}">${supportGemSigil.html(name, 'support-slot-sigil', getSupportActiveTier(name))}<b>${escapeHTML(_t(name))}</b>${gemSelectionUi.indicators(name)}<small>${escapeHTML(target)}</small></button>`;
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
        const resonanceTip = stats.supportResonanceOverflow
            ? _t('공명력 {value} 초과: 모든 저항 -{value}%p', { value: stats.supportResonanceOverflow })
            : _t('장착 보조스킬룬이 쓰는 공명력');
        const slots = worn.map(name => renderSupportSlot(name, stats));
        for (let i = worn.length; i < cap; i++) slots.push(`<button type="button" class="support-slot is-empty" data-board-pick="support" aria-label="${_t('빈 보조스킬룬 칸, 룬 고르기')}"><i>+</i><b>${_t('빈 칸')}</b><small>&nbsp;</small></button>`);
        slots.push(`<div class="support-slot is-lock" aria-label="${_t('다음 보조스킬룬 칸은 장비, 패시브로 늘어납니다')}"><i></i><b>${_t('다음 칸')}</b><small>${_t('장비, 패시브')}</small></div>`);
        return `<div class="support-slots-head"><span>${_t('보조스킬룬')}</span><em>${_t('칸')} ${worn.length} / ${cap}</em>
                <div class="support-resonance" data-tip="${escapeHTML(resonanceTip)}"><small>${_t('공명력')}</small><span class="support-resonance-bar"><i style="width:${fill}%"></i></span><b>${used}</b><small>/ ${resonanceCap}</small></div></div>
            <div class="support-slots-row">${slots.join('')}</div>${gemSelectionUi.skillSummary(focusedSkill.kind, focusedName(), stats)}<div class="support-indicator-key">${_t('● 적용, ○ 태그 불일치, ◌ 빈 칸, ◉ 소환 대응 없음, ⊙ 사역룬 제외')}</div>`;
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
        document.getElementById('ui-skill-picker-title').textContent = _t(PICKER_TITLES[pickerKind]);
    }

    /** The picker shows one kind; a support pick needs the support content unlocked (otherwise it falls back to attack). */
    function currentKind() {
        if (pickerKind === 'support' && !contentProgression.isUnlocked('support')) pickerKind = 'active';
        return pickerKind;
    }

    /** @param {'active'|'mobility'|'summon'|'support'|'sealed'} kind the board slot whose gems the picker lists next, or the sealed runes
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
        if (slot.state === 'next') { openNextEngrave(main, index); return; }
        openEquippedGemManagement(main);
    }

    /** The next slot opens here too (2026-11-08 사용자: 룬 탭에서도 칸 해금): after a yes, openGemEngraveSlotOverlay spends the essence
     * (upgradeSkyEngraveCap) and shows the engraving choice for the new slot. */
    async function openNextEngrave(main, index) {
        const block = engraveUnlockBlock(engraveUnlockNeed(index));
        if (block) { showGameToast(block, { tone: 'warning' }); return; }
        const message = _t('창공의 정수 {need}개를 써서 {n}번 각인 칸을 엽니다.', { need: index + 1, n: index + 1 });
        if (await requestGameConfirmation(message, { title: _t('각인 칸 열기'), confirmLabel: _t('열기') }) !== true) return;
        game.gemEnhanceTargetSkill = main;
        openGemEngraveSlotOverlay(index);
    }

    document.addEventListener('click', event => {
        const engrave = event.target.closest('[data-board-engrave]');
        if (engrave) { openEngrave(Number(engrave.dataset.boardEngrave)); return; }
        const slot = event.target.closest('[data-board-pick]');
        if (!slot) return;
        const kind = slot.dataset.boardPick;
        if (kind !== 'support') { focusedSkill = { kind, name: slot.dataset.boardGem || '' }; render(getUiPlayerStats()); }
        // 칸을 누르면 룬 칸 창이 바로 뜬다(찬 칸: 등급, 해제, 바꿔 낄 룬 / 빈 칸: 낄 룬).
        if (kind !== pickerKind) pick(kind, true);
        gemSlotDialog.open(kind, slot.dataset.boardGem || '');
    });

    /** A real mouse on a device that can hover: after a tap the browser may fire a mouse-type enter on the redrawn slot. */
    const hoversWithMouse = event => event.pointerType === 'mouse' && window.matchMedia('(hover: hover)').matches;

    /** Hover on a worn gem, mouse only: the same tooltip with numbers as the picker tiles. */
    function wornGemHint(event, type, name) {
        if (hoversWithMouse(event)) showGemTooltip(event, type, name);
    }

    /** The next and locked slots name what opening them takes: the essence (red when short) and loop 4, then how to open them. */
    function engraveNeedTooltipHtml(slot) {
        const need = engraveUnlockNeed(slot.index), short = need.have < need.need ? ' style="color:#ff8a80"' : '';
        const lines = [`<div class="tooltip-line"${short}>${_t('필요: 창공의 정수 {need}개, 보유 {have}개', need)}</div>`];
        if (!need.loopOk) lines.push(`<div class="tooltip-line" style="color:#ff8a80">${_t('루프 4부터 열 수 있습니다.')}</div>`);
        const ready = slot.state === 'next' && !engraveUnlockBlock(need);
        if (ready || slot.state === 'lock') lines.push(`<div class="tooltip-line gem-card-hint">${_t(ENGRAVE_HINTS[slot.state])}</div>`);
        return `<div class="tooltip-title">${engraveLabel(slot)}</div>${lines.join('')}`;
    }

    function boardEngraveTooltipHtml(slot) {
        if (slot.state === 'next' || slot.state === 'lock') return engraveNeedTooltipHtml(slot);
        if (slot.state !== 'full') return `<div class="tooltip-title">${engraveLabel(slot)}</div><div class="tooltip-line">${_t(ENGRAVE_HINTS[slot.state])}</div>`;
        const group = getSkyEnhancementGroup(slot.def);
        return `<div class="tooltip-title engrave-tone-${group.className}">${escapeHTML(_t(slot.def.name))}</div><div class="tooltip-line engrave-tooltip-group">${_t('{group} 각인, {n}번 칸', { group: _t(group.label), n: slot.index + 1 })}</div>`
            + `<div class="tooltip-line engrave-tooltip-effect">${statToneText.html(_t(slot.def.desc))}</div><div class="tooltip-line gem-card-hint">${_t('누르면 다른 각인으로 바꿉니다')}</div>`;
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
