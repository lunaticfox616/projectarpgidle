/** @param {string} name skill gem name @returns {'active'|'mobility'|'summon'} the slot kind the gem is worn in (js/ui.js changeSkill) */
export function kindOf(runtime, name) {
    if ((runtime.deps.SKILL_DB[name]?.tags || []).includes('summon')) return 'summon';
    return runtime.deps.mobilitySkill.isMobilityGem(name) ? 'mobility' : 'active';
}

export function gemArt(runtime, name, className) {
    return (0, runtime.deps.renderSkillGemArt)(name, className, { eager: true });
}

/** 주 공격 룬의 각인 칸 5개: 찬 칸 · 빈 칸(열림) · 다음에 열 칸 · 잠긴 칸. 각인 해금 전이나 기본 공격이면 없음. */
export function engraveSlots(runtime, main) {
    if (!runtime.deps.contentProgression.isUnlocked('engraving') || !(0, runtime.deps.isEnhanceableAttackGem)(main)) return [];
    const ids = (0, runtime.deps.getSkyEnhancementSlotsForSkill)(main);
    const cap = (0, runtime.deps.normalizeGemRecord)((runtime.deps.game.gemData || {})[main]).skyEnhanceCap || 1;
    return [0, 1, 2, 3, 4].map(index => {
        const def = index < cap && ids[index] ? runtime.deps.GEM_SKY_ENHANCEMENTS[ids[index]] : null;
        const state = index < cap ? (def ? 'full' : 'open') : (index === cap ? 'next' : 'lock');
        return { index, state, def };
    });
}

/** What opening the slot at index takes (js/skills.js upgradeSkyEngraveCap): loop 4, and index + 1 창공의 정수 (the next slot costs the
* open count plus one, so the slot at index costs index + 1 when its turn comes). */
export function engraveUnlockNeed(runtime, index) {
    return { need: index + 1, have: Math.floor(Number(runtime.deps.game.currencies.skyEssence) || 0), loopOk: (runtime.deps.game.season || 1) >= 4 };
}

/** Why the next slot cannot open now, or ''. */
export function engraveUnlockBlock(runtime, need) {
    if (!need.loopOk) return (0, runtime.deps._t)('루프 4부터 열 수 있습니다.');
    return need.have < need.need ? (0, runtime.deps._t)('창공의 정수가 부족합니다. (필요: {need})', { need: need.need }) : '';
}

export function engraveLabel(runtime, slot) {
    if (slot.state === 'full') return (0, runtime.deps._t)(slot.def.name);
    return (0, runtime.deps._t)(slot.state === 'open' ? '빈 각인' : (slot.state === 'next' ? '다음 칸' : '잠김'));
}

export function renderEngraveRing(runtime, slots) {
    if (!slots.length) return '';
    const marks = slots.map(slot => {
        const angle = -Math.PI / 2 + slot.index * 2 * Math.PI / 5;
        const x = Math.round(Math.cos(angle) * runtime.state.RING_RADIUS), y = Math.round(Math.sin(angle) * runtime.state.RING_RADIUS);
        // 찬 칸은 각인 종류 그림(검 · 쌍갈매기 · 눈 · 핏방울 …), 빈 칸은 +. 마름모 색은 각인 묶음(기본 · 조율 · 각성)을 따른다.
        const glyph = slot.state === 'full' ? (0, runtime.deps.renderSkyEnhancementIcon)(slot.def) : (slot.state === 'open' ? '+' : '');
        const group = slot.state === 'full' ? ` is-group-${(0, runtime.deps.getSkyEnhancementGroup)(slot.def).className}` : '';
        const title = slot.state === 'full' ? `${(0, runtime.deps._t)(slot.def.name)}, ${slot.def.desc}` : engraveLabel(runtime, slot);
        return `<button type="button" class="skill-board-engrave is-${slot.state}${group}" style="--x:${x}px;--y:${y}px" data-board-engrave="${slot.index}" data-info-tooltip-anchor="1" onpointerenter="skillGemBoardUi.engraveHint(event,${slot.index})" onpointerleave="hideInfoTooltip()" aria-label="${(0, runtime.deps._t)('각인 {value}: {title}', { value: slot.index + 1, title: (0, runtime.deps.escapeHTML)(title) })}"><i>${glyph ? `<b>${glyph}</b>` : ''}</i><span>${(0, runtime.deps.escapeHTML)(engraveLabel(runtime, slot))}</span></button>`;
    }).join('');
    return `<div class="skill-board-ring" aria-hidden="false">${marks}</div>`;
}

/** cap: the summon limit ("0/1") written small above the first summon slot's label. Only the empty slot names it on hover: a worn
* rune's slot shows the rune's own tooltip. */
export function createRenderSatellite(runtime) {
    return function renderSatellite(kind, label, name, extra, cap = '') {
        if (!name) return `<button type="button" class="skill-board-satellite is-empty" data-board-pick="${kind}" aria-label="${(0, runtime.deps._t)('{label} 칸 비어 있음, 룬 고르기', { label })}"><i>+</i>${cap ? `<em class="skill-board-cap" data-tip="${(0, runtime.deps._t)('소환 한도')}">${cap}</em>` : ''}<small>${label}</small><b>${(0, runtime.deps._t)('비어 있음')}</b></button>`;
        return `<button type="button" class="skill-board-satellite active element-${(0, runtime.deps.getGemCardMeta)(runtime.deps.SKILL_DB[name]).className}" data-board-pick="${kind}" data-board-gem="${(0, runtime.deps.escapeHTML)(name)}" ${hoverHint(runtime, 'active', name)} aria-label="${label}: ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name))}">${gemArt(runtime, name, 'skill-board-satellite-art')}${cap ? `<em class="skill-board-cap">${cap}</em>` : ''}<small>${label}${extra || ''}</small><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name))}</b></button>`;
    };
}

/** The summon slots. The limit sits small above the first slot's label instead of a line under the column (2026-11-08 사용자:
* 그 줄 때문에 소환 칸이 이동 칸보다 높이 떠 있었다). */
export function renderSummons(runtime, stats) {
    const worn = runtime.deps.game.equippedSummonSkills || [];
    const cap = `${(0, runtime.deps.getEquippedSummonCount)()}/${(0, runtime.deps.getSummonEquipCapFromStats)(stats)}`;
    const parts = worn.map((name, index) => runtime.handlers.renderSatellite('summon', (0, runtime.deps._t)('소환'), name, ` ×${(0, runtime.deps.getSummonSkillCount)(name)}`, index ? '' : cap));
    if ((0, runtime.deps.getEquippedSummonCount)() < (0, runtime.deps.getSummonEquipCapFromStats)(stats)) parts.push(runtime.handlers.renderSatellite('summon', (0, runtime.deps._t)('소환'), '', '', parts.length ? '' : cap));
    return `<div class="skill-board-summons">${parts.join('')}</div>`;
}

export function renderBoard(runtime, stats) {
    const main = runtime.deps.game.activeSkill || '기본 공격';
    const info = (0, runtime.deps.getUiGemPresentation)(main, false, stats);
    const meta = (0, runtime.deps.getGemCardMeta)(runtime.deps.SKILL_DB[main] || {});
    const slots = engraveSlots(runtime, main);
    const filled = slots.filter(slot => slot.state === 'full').length, open = slots.filter(slot => slot.state === 'full' || slot.state === 'open').length;
    const engraveNote = slots.length ? `<em>${(0, runtime.deps._t)('각인 {filled} / {open}칸', { filled, open })}</em>` : '';
    const level = info.totalLevel > info.baseLevel ? `<small class="is-boosted">Lv.${(0, runtime.deps.formatValue)('', info.totalLevel)}</small>` : `<small>Lv.${info.totalLevel || 1}</small>`;
    return `<div class="skill-board-linked-row"><div class="skill-board-mobility">${runtime.handlers.renderSatellite('mobility', (0, runtime.deps._t)('이동'), runtime.deps.mobilitySkill.equipped())}</div><div class="skill-board-main"><div class="skill-board-head"><span>${(0, runtime.deps._t)('주 공격')}</span><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(main))}</b>${level}${engraveNote}</div>
            <div class="skill-board-stage element-${meta.className}${slots.length ? ' has-ring' : ''}">
                ${renderEngraveRing(runtime, slots)}
                <button type="button" class="skill-board-core active" data-board-pick="active" data-board-gem="${(0, runtime.deps.escapeHTML)(main)}" ${hoverHint(runtime, 'active', main)} aria-label="${(0, runtime.deps._t)('주 공격: {name}, 바꿀 룬 고르기', { name: (0, runtime.deps._t)(main) })}">${gemArt(runtime, main, 'skill-board-core-art')}</button>
            </div></div>${renderSummons(runtime, stats)}</div>`;
}

/** 칸 아래 한 줄용 적용 대상(gemSelectionUi.application의 문장을 줄인 것). */
export function shortTarget(runtime, text) {
    if (text.startsWith('적용: ')) return text.slice(4);
    return (0, runtime.deps._t)('맞는 스킬 없음');
}

export function renderSupportSlot(runtime, name, stats) {
    const target = shortTarget(runtime, runtime.deps.gemSelectionUi.application(name, stats));
    const role = runtime.state.focusedSkill.kind === 'active' ? 'main' : runtime.state.focusedSkill.kind;
    const lit = runtime.deps.gemSelectionUi.targetRows(name).some(row => row.role === role && row.name === focusedName(runtime) && row.status === 'on');
    return `<button type="button" class="support-slot active${lit ? ' is-linked' : ''}" data-board-pick="support" data-board-gem="${(0, runtime.deps.escapeHTML)(name)}" ${hoverHint(runtime, 'support', name)} aria-label="${(0, runtime.deps._t)('보조스킬룬')}: ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name))}, ${(0, runtime.deps.escapeHTML)(target)}">${runtime.deps.supportGemSigil.html(name, 'support-slot-sigil', (0, runtime.deps.getSupportActiveTier)(name))}<b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name))}</b>${runtime.deps.gemSelectionUi.indicators(name)}<small>${(0, runtime.deps.escapeHTML)(target)}</small></button>`;
}

export function focusedName(runtime) {
    if (runtime.state.focusedSkill.kind === 'active') return runtime.deps.game.activeSkill || '기본 공격';
    if (runtime.state.focusedSkill.kind === 'mobility') return runtime.deps.mobilitySkill.equipped();
    return runtime.deps.game.equippedSummonSkills.includes(runtime.state.focusedSkill.name) ? runtime.state.focusedSkill.name : (runtime.deps.game.equippedSummonSkills[0] || '');
}

export function renderSupports(runtime, stats) {
    const cap = Math.max(0, Math.floor(stats.suppCap || 0));
    const worn = (runtime.deps.game.equippedSupports || []).slice(0, cap);
    const resonanceCap = (0, runtime.deps.getEffectiveResonanceCap)(stats);
    const used = (runtime.deps.game.equippedSupports || []).reduce((sum, name) => sum + (0, runtime.deps.getSupportTierResonanceCost)(name), 0);
    const fill = resonanceCap > 0 ? Math.round(Math.min(1, used / resonanceCap) * 100) : 0;
    const resonanceTip = stats.supportResonanceOverflow
        ? (0, runtime.deps._t)('공명력 {value} 초과: 모든 저항 -{value}%p', { value: stats.supportResonanceOverflow })
        : (0, runtime.deps._t)('장착 보조스킬룬이 쓰는 공명력');
    const slots = worn.map(name => renderSupportSlot(runtime, name, stats));
    for (let i = worn.length; i < cap; i++) slots.push(`<button type="button" class="support-slot is-empty" data-board-pick="support" aria-label="${(0, runtime.deps._t)('빈 보조스킬룬 칸, 룬 고르기')}"><i>+</i><b>${(0, runtime.deps._t)('빈 칸')}</b><small>&nbsp;</small></button>`);
    slots.push(`<div class="support-slot is-lock" aria-label="${(0, runtime.deps._t)('다음 보조스킬룬 칸은 장비, 패시브로 늘어납니다')}"><i></i><b>${(0, runtime.deps._t)('다음 칸')}</b><small>${(0, runtime.deps._t)('장비, 패시브')}</small></div>`);
    return `<div class="support-slots-head"><span>${(0, runtime.deps._t)('보조스킬룬')}</span><em>${(0, runtime.deps._t)('칸')} ${worn.length} / ${cap}</em>
                <div class="support-resonance" data-tip="${(0, runtime.deps.escapeHTML)(resonanceTip)}"><small>${(0, runtime.deps._t)('공명력')}</small><span class="support-resonance-bar"><i style="width:${fill}%"></i></span><b>${used}</b><small>/ ${resonanceCap}</small></div></div>
            <div class="support-slots-row">${slots.join('')}</div>${runtime.deps.gemSelectionUi.skillSummary(runtime.state.focusedSkill.kind, focusedName(runtime), stats)}<div class="support-indicator-key">${(0, runtime.deps._t)('● 적용, ○ 태그 불일치, ◌ 빈 칸, ◉ 소환 대응 없음, ⊙ 사역룬 제외')}</div>`;
}

/** @param {object} stats current player stats (getPlayerStats). Rewrites the board only when its HTML changed. */
export function render(runtime, stats) {
    const board = runtime.deps.document.getElementById('ui-skill-board');
    const supports = runtime.deps.document.getElementById('ui-support-slots');
    const boardHtml = renderBoard(runtime, stats);
    if (board.dataset.renderSig !== boardHtml) { board.innerHTML = boardHtml; board.dataset.renderSig = boardHtml; }
    const supportHtml = renderSupports(runtime, stats);
    if (supports.dataset.renderSig !== supportHtml) { supports.innerHTML = supportHtml; supports.dataset.renderSig = supportHtml; }
    // 고르는 칸 표시는 HTML 밖(data 속성)에 둔다: 칸을 바꿔도 보드를 다시 그리지 않아 방금 연 상세가 닫히지 않는다.
    runtime.deps.document.getElementById('skill-tab-equip').dataset.picking = runtime.state.pickerKind;
    runtime.deps.document.getElementById('ui-skill-picker-title').textContent = (0, runtime.deps._t)(runtime.state.PICKER_TITLES[runtime.state.pickerKind]);
}

/** The picker shows one kind; a support pick needs the support content unlocked (otherwise it falls back to attack). */
export function currentKind(runtime) {
    if (runtime.state.pickerKind === 'support' && !runtime.deps.contentProgression.isUnlocked('support')) runtime.state.pickerKind = 'active';
    return runtime.state.pickerKind;
}

/** @param {'active'|'mobility'|'summon'|'support'|'sealed'} kind the board slot whose gems the picker lists next, or the sealed runes
* @param {boolean} [stay] the slot dialog opens over the board, so the phone does not scroll to the list */
export function pick(runtime, kind, stay) {
    runtime.state.pickerKind = kind;
    runtime.deps.document.getElementById('skill-tab-equip').dataset.picking = kind;
    (0, runtime.deps.updateStaticUI)();
    // 휴대폰: 보드 아래의 목록이 화면 밖이면 그쪽으로 데려간다.
    const list = runtime.deps.document.querySelector('#skill-tab-equip .skill-picker');
    if (list && !stay && runtime.deps.uiDisplay.matches('(max-width: 1080px)')) list.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

export function openEngrave(runtime, index) {
    const main = runtime.deps.game.activeSkill;
    const slot = engraveSlots(runtime, main)[index];
    if (!slot) return;
    // 찬 칸 · 빈 칸은 그 자리에서 각인 고르기 창(강화 · 각인 탭의 칸과 같은 창)을 연다(2026-10-06 사용자 요청 — 탭으로
    // 옮기기만 하는 단추였다). 다음 칸 · 잠긴 칸은 해금(재화 사용)을 하지 않고 강화 · 각인 탭만 연다 — 해금은 그 탭의 단추로.
    if (slot.state === 'full' || slot.state === 'open') {
        runtime.deps.game.gemEnhanceTargetSkill = main;
        (0, runtime.deps.openGemEngraveSlotOverlay)(index);
        return;
    }
    if (slot.state === 'next') { openNextEngrave(runtime, main, index); return; }
    (0, runtime.deps.openEquippedGemManagement)(main);
}

/** The next slot opens here too (2026-11-08 사용자: 룬 탭에서도 칸 해금): after a yes, openGemEngraveSlotOverlay spends the essence
* (upgradeSkyEngraveCap) and shows the engraving choice for the new slot. */
export async function openNextEngrave(runtime, main, index) {
    const block = engraveUnlockBlock(runtime, engraveUnlockNeed(runtime, index));
    if (block) { (0, runtime.deps.showGameToast)(block, { tone: 'warning' }); return; }
    const message = (0, runtime.deps._t)('창공의 정수 {need}개를 써서 {n}번 각인 칸을 엽니다.', { need: index + 1, n: index + 1 });
    if (await (0, runtime.deps.requestGameConfirmation)(message, { title: (0, runtime.deps._t)('각인 칸 열기'), confirmLabel: (0, runtime.deps._t)('열기') }) !== true) return;
    runtime.deps.game.gemEnhanceTargetSkill = main;
    (0, runtime.deps.openGemEngraveSlotOverlay)(index);
}

/** Hover on a worn gem, mouse only: the same tooltip with numbers as the picker tiles. */
export function wornGemHint(runtime, event, type, name) {
    if (hoversWithMouse(runtime, event)) (0, runtime.deps.showGemTooltip)(event, type, name);
}

/** The next and locked slots name what opening them takes: the essence (red when short) and loop 4, then how to open them. */
export function engraveNeedTooltipHtml(runtime, slot) {
    const need = engraveUnlockNeed(runtime, slot.index), short = need.have < need.need ? ' style="color:#ff8a80"' : '';
    const lines = [`<div class="tooltip-line"${short}>${(0, runtime.deps._t)('필요: 창공의 정수 {need}개, 보유 {have}개', need)}</div>`];
    if (!need.loopOk) lines.push(`<div class="tooltip-line" style="color:#ff8a80">${(0, runtime.deps._t)('루프 4부터 열 수 있습니다.')}</div>`);
    const ready = slot.state === 'next' && !engraveUnlockBlock(runtime, need);
    if (ready || slot.state === 'lock') lines.push(`<div class="tooltip-line gem-card-hint">${(0, runtime.deps._t)(runtime.state.ENGRAVE_HINTS[slot.state])}</div>`);
    return `<div class="tooltip-title">${engraveLabel(runtime, slot)}</div>${lines.join('')}`;
}

export function boardEngraveTooltipHtml(runtime, slot) {
    if (slot.state === 'next' || slot.state === 'lock') return engraveNeedTooltipHtml(runtime, slot);
    if (slot.state !== 'full') return `<div class="tooltip-title">${engraveLabel(runtime, slot)}</div><div class="tooltip-line">${(0, runtime.deps._t)(runtime.state.ENGRAVE_HINTS[slot.state])}</div>`;
    const group = (0, runtime.deps.getSkyEnhancementGroup)(slot.def);
    return `<div class="tooltip-title engrave-tone-${group.className}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(slot.def.name))}</div><div class="tooltip-line engrave-tooltip-group">${(0, runtime.deps._t)('{group} 각인, {n}번 칸', { group: (0, runtime.deps._t)(group.label), n: slot.index + 1 })}</div>`
        + `<div class="tooltip-line engrave-tooltip-effect">${runtime.deps.statToneText.html((0, runtime.deps._t)(slot.def.desc))}</div><div class="tooltip-line gem-card-hint">${(0, runtime.deps._t)('누르면 다른 각인으로 바꿉니다')}</div>`;
}

/** Hover on an engraving slot, mouse only: the engraving's group and effect (the native title was small and slow). */
export function boardEngraveHint(runtime, event, index) {
    const slot = hoversWithMouse(runtime, event) ? engraveSlots(runtime, runtime.deps.game.activeSkill)[index] : null;
    if (!slot) return;
    const tone = slot.state === 'full' ? runtime.state.GROUP_TONES[(0, runtime.deps.getSkyEnhancementGroup)(slot.def).className] : runtime.state.GROUP_TONES.basic;
    (0, runtime.deps.showInfoTooltipHtml)(event.clientX, event.clientY, boardEngraveTooltipHtml(runtime, slot), tone, `engrave:${index}:${slot.state}`);
}

export function hoverHint(runtime, type, name) { return `data-info-tooltip-anchor="1" onpointerenter="skillGemBoardUi.hint(event,'${type}','${name}')" onpointerleave="hideInfoTooltip()"`; }

export function hoversWithMouse(runtime, event) { return event.pointerType === 'mouse' && runtime.deps.window.matchMedia('(hover: hover)').matches; }
