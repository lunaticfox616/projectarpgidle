// 스킬 젬 보드 (2026-10-04 사용자 요청): 장착 화면 위쪽에 지금 낀 것을 한눈에 —
// 가운데 주 공격 젬, 둘레에 그 젬의 각인 5칸, 아래 이동 · 소환 칸, 따로 보조 젬 칸 줄(장착 한도만큼 + 다음 칸 미리보기).
// 칸을 누르면 아래 목록(js/skills-ui.js)이 그 칸에 낄 수 있는 젬만 보여 주고, 찬 칸은 그 젬의 상세(js/gem-selection-ui.js)를 연다.
// 각인 칸은 강화 · 각인 탭의 그 칸으로 간다. 표시 · 칸 고르기만 하며 장착 규칙은 기존 함수(changeSkill · toggleSupport)가 갖는다.
(function () {
    'use strict';

    /** 목록이 보여 줄 칸 종류. 화면에만 있는 고르기 상태라 저장하지 않는다. @type {'active'|'mobility'|'summon'|'support'} */
    let pickerKind = 'active';
    const PICKER_TITLES = Object.freeze({ active: '주 공격 칸에 낄 젬', mobility: '이동 칸에 낄 젬', summon: '소환 칸에 낄 젬', support: '보조 젬 칸에 낄 젬' });
    const RING_RADIUS = 96;

    /** @param {string} name skill gem name @returns {'active'|'mobility'|'summon'} the slot kind the gem is worn in (js/ui.js changeSkill) */
    function kindOf(name) {
        if ((SKILL_DB[name]?.tags || []).includes('summon_attack')) return 'summon';
        return mobilitySkill.isMobilityGem(name) ? 'mobility' : 'active';
    }

    function gemArt(name, className) {
        return renderSkillGemArt(name, className, { eager: true });
    }

    /** 주 공격 젬의 각인 칸 5개: 찬 칸 · 빈 칸(열림) · 다음에 열 칸 · 잠긴 칸. 각인 해금 전이나 기본 공격이면 없음. */
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
            const glyph = slot.state === 'full' ? escapeHTML(slot.def.name.slice(0, 1)) : (slot.state === 'open' ? '+' : '');
            const title = slot.state === 'full' ? `${slot.def.name} · ${slot.def.desc}` : engraveLabel(slot);
            return `<button type="button" class="skill-board-engrave is-${slot.state}" style="--x:${x}px;--y:${y}px" data-board-engrave="${slot.index}" title="${escapeHTML(title)}" aria-label="각인 ${slot.index + 1}: ${escapeHTML(title)}"><i>${glyph ? `<b>${glyph}</b>` : ''}</i><span>${escapeHTML(engraveLabel(slot))}</span></button>`;
        }).join('');
        return `<div class="skill-board-ring" aria-hidden="false">${marks}</div>`;
    }

    function renderSatellite(kind, label, name, extra) {
        if (!name) return `<button type="button" class="skill-board-satellite is-empty" data-board-pick="${kind}" aria-label="${label} 칸 비어 있음 · 젬 고르기"><i>+</i><small>${label}</small><b>비어 있음</b></button>`;
        return `<button type="button" class="skill-board-satellite active element-${getGemCardMeta(SKILL_DB[name]).className}" data-board-pick="${kind}" data-board-gem="${escapeHTML(name)}" aria-label="${label}: ${escapeHTML(name)}">${gemArt(name, 'skill-board-satellite-art')}<small>${label}${extra || ''}</small><b>${escapeHTML(name)}</b></button>`;
    }

    function ownsKind(kind) {
        return (game.skills || []).some(name => SKILL_DB[name]?.isGem && kindOf(name) === kind);
    }

    /** 이동 칸(이동 젬을 하나라도 가졌을 때)과 소환 칸(소환 젬을 가졌을 때: 장착한 소환 젬 + 한도가 남으면 빈 칸). */
    function renderSatellites(stats) {
        const parts = [];
        if (ownsKind('mobility') || mobilitySkill.equipped()) parts.push(renderSatellite('mobility', '이동', mobilitySkill.equipped()));
        if (ownsKind('summon')) {
            const worn = Array.isArray(game.equippedSummonSkills) ? game.equippedSummonSkills : [];
            worn.forEach(name => parts.push(renderSatellite('summon', '소환', name, ` ×${getSummonSkillCount(name)}`)));
            if (getEquippedSummonCount() < getSummonEquipCapFromStats(stats)) parts.push(renderSatellite('summon', '소환', ''));
        }
        return parts.length ? `<div class="skill-board-satellites">${parts.join('')}</div>` : '';
    }

    function renderBoard(stats) {
        const main = game.activeSkill || '기본 공격';
        const info = getUiGemPresentation(main, false, stats);
        const meta = getGemCardMeta(SKILL_DB[main] || {});
        const slots = engraveSlots(main);
        const filled = slots.filter(slot => slot.state === 'full').length, open = slots.filter(slot => slot.state === 'full' || slot.state === 'open').length;
        const engraveNote = slots.length ? `<em>각인 ${filled} / ${open}칸</em>` : '';
        const level = info.totalLevel > info.baseLevel ? `<small class="is-boosted">Lv.${info.totalLevel}</small>` : `<small>Lv.${info.totalLevel || 1}</small>`;
        return `<div class="skill-board-head"><span>주 공격</span><b>${escapeHTML(main)}</b>${level}${engraveNote}</div>
            <div class="skill-board-stage element-${meta.className}${slots.length ? ' has-ring' : ''}">
                ${renderEngraveRing(slots)}
                <button type="button" class="skill-board-core active" data-board-pick="active" data-board-gem="${escapeHTML(main)}" aria-label="주 공격: ${escapeHTML(main)} · 바꿀 젬 고르기">${gemArt(main, 'skill-board-core-art')}</button>
            </div>
            ${renderSatellites(stats)}`;
    }

    /** 칸 아래 한 줄용 적용 대상(gemSelectionUi.application의 문장을 줄인 것). */
    function shortTarget(text) {
        if (text.startsWith('적용: ')) return text.slice(4);
        if (text.startsWith('소환형')) return '소환수';
        if (text.startsWith('캐릭터')) return '캐릭터';
        return '적용 대상 없음';
    }

    function renderSupportSlot(name, stats) {
        const tier = getSupportActiveTier(name);
        const pips = '◆'.repeat(Math.max(1, Math.min(3, tier)));
        const target = shortTarget(gemSelectionUi.application(name, stats));
        return `<button type="button" class="support-slot active" data-board-pick="support" data-board-gem="${escapeHTML(name)}" aria-label="보조 젬: ${escapeHTML(name)} · ${escapeHTML(target)}"><i>✚<em>${pips}</em></i><b>${escapeHTML(name)}</b><small>${escapeHTML(target)}</small></button>`;
    }

    function renderSupports(stats) {
        const cap = Math.max(0, Math.floor(stats.suppCap || 0));
        const worn = (game.equippedSupports || []).slice(0, cap);
        const resonanceCap = getEffectiveResonanceCap(stats);
        const used = (game.equippedSupports || []).reduce((sum, name) => sum + getSupportTierResonanceCost(name), 0);
        const left = Math.max(0, resonanceCap - used);
        const fill = resonanceCap > 0 ? Math.round(Math.min(1, left / resonanceCap) * 100) : 0;
        const slots = worn.map(name => renderSupportSlot(name, stats));
        for (let i = worn.length; i < cap; i++) slots.push('<button type="button" class="support-slot is-empty" data-board-pick="support" aria-label="빈 보조 젬 칸 · 젬 고르기"><i>+</i><b>빈 칸</b><small>&nbsp;</small></button>');
        slots.push('<div class="support-slot is-lock" aria-label="다음 보조 젬 칸은 장비 · 패시브로 늘어납니다"><i></i><b>다음 칸</b><small>장비 · 패시브</small></div>');
        return `<div class="support-slots-head"><span>보조 젬</span><em>${worn.length} / ${cap}칸</em>
                <div class="support-resonance" title="장착 보조 젬이 쓰는 공명력"><small>공명력</small><span class="support-resonance-bar"><i style="width:${fill}%"></i></span><b>${left}</b><small>/ ${resonanceCap}</small></div></div>
            <div class="support-slots-row">${slots.join('')}</div>`;
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

    /** @param {'active'|'mobility'|'summon'|'support'} kind the board slot whose gems the picker lists next */
    function pick(kind) {
        pickerKind = kind;
        document.getElementById('skill-tab-equip').dataset.picking = kind;
        updateStaticUI();
        // 휴대폰: 보드 아래의 목록이 화면 밖이면 그쪽으로 데려간다.
        const list = document.querySelector('#skill-tab-equip .skill-picker');
        if (list && uiDisplay.matches('(max-width: 1080px)')) list.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    function openEngrave(index) {
        const main = game.activeSkill;
        const slot = engraveSlots(main)[index];
        if (!slot) return;
        openEquippedGemManagement(main);
        // 다음 칸 · 잠긴 칸은 해금(재화 사용)을 하지 않고 강화 · 각인 탭만 연다 — 해금은 그 탭의 단추로.
        if (slot.state === 'full' || slot.state === 'open') selectGemEngraveSlot(index);
    }

    document.addEventListener('click', event => {
        const engrave = event.target.closest('[data-board-engrave]');
        if (engrave) { openEngrave(Number(engrave.dataset.boardEngrave)); return; }
        const fold = event.target.closest('#btn-skill-picker-fold');
        if (fold) { toggleGemFoldMode(currentKind() === 'support' ? 'support' : 'attack'); return; }
        const slot = event.target.closest('[data-board-pick]');
        if (!slot) return;
        const kind = slot.dataset.boardPick;
        if (kind !== pickerKind) pick(kind);
        const gem = slot.dataset.boardGem;
        // 찬 칸은 그 젬의 상세(해제 · 강화 · 소환 수)를 연다.
        if (gem && gem !== '기본 공격') gemSelectionUi.open(slot, kind === 'support' ? 'support' : 'active', gem);
    });

    safeExposeGlobals({ skillGemBoardUi: Object.freeze({ render, pick, currentKind, kindOf }) });
}());
