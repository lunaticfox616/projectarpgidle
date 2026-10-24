const equipmentLoadoutUi = (() => {
let actionNotice = '';
let review = null;
const REVIEW_ID = 'equipment-build-review';
/** The panel warning: 누락 for items that are gone, 임시 보관함 when every missing item only waits there. */
function describeLoadoutMissingWarning(missing) {
    const label = missing.every(row => row.stored) ? '임시 보관함에 있음' : '누락';
    return `${label}: ${missing.map(row => row.name).join(', ')}`;
}

// 세팅 단추의 글자(2026-10-21 사용자: "세팅 1번칸 2번칸 3번칸은 '장착 장비' 있는 곳에 I II III 으로").
const LOADOUT_SLOT_NUMERALS = Object.freeze(['I', 'II', 'III']);

/** What a preset holds, or what keeps it from applying (the end of its button's title). */
function describeLoadoutPresetSlot(preset, inspection) {
    if (!preset) return '빈 세팅, 누르고 저장';
    if (inspection.missing.length > 0) return describeLoadoutMissingWarning(inspection.missing);
    if (inspection.incompatible.length > 0) return `장착 불가: ${inspection.incompatible.map(row => row.name).join(', ')}`;
    if (inspection.runeReason) return inspection.runeReason;
    if (inspection.applied) return `사용 중, 장비 ${inspection.count}부위`;
    return `장비 ${inspection.count}부위, 누르면 세트 보기`;
}

/** A preset button shows its numeral; its title has the number, the name and describeLoadoutPresetSlot. */
function renderEquipmentLoadoutPresetSlot(preset, index, selectedSlot) {
    let inspection = equipmentLoadoutRuntime.inspect(index);
    let blocked = presetBlocked(inspection);
    let stateClass = !preset ? ' empty' : inspection.applied ? ' applied' : blocked ? ' missing' : '';
    let name = `${index + 1}번 빌드 세팅${preset ? ` [${preset.name}]` : ''}`;
    return `<button type="button" class="equipment-preset-slot${index === selectedSlot ? ' selected' : ''}${stateClass}" title="${escapeHTML(`${name}, ${describeLoadoutPresetSlot(preset, inspection)}`)}"
        aria-label="${escapeHTML(name)}" aria-pressed="${index === selectedSlot}" onclick="equipmentLoadoutUi.pick(${index})"><span class="px-center">${LOADOUT_SLOT_NUMERALS[index] || index + 1}</span></button>`;
}

function presetBlocked(inspection) {
    return inspection.missing.length + inspection.incompatible.length || inspection.runeReason;
}

function runeRows(loadout) {
    const active = name => name ? [{ kind: 'active', name }] : [];
    const summons = loadout.equippedSummonSkills.map(name => ({ kind: 'active', name, note: `소환 ×${loadout.summonSkillCounts[name]}` }));
    const supports = loadout.equippedSupports.map(name => ({ kind: 'support', name, tier: loadout.supportTiers[name], note: `${loadout.supportTiers[name]}등급` }));
    return [['주 공격', active(loadout.activeSkill)], ['이동', active(loadout.mobilitySkill)], ['소환', summons], ['공용 보조', supports]];
}

/** Keep the equipment heading compact. A numbered button opens that build's full equipment and rune view. */
function renderEquipmentLoadoutPresetPanel() {
    let root = document.getElementById('ui-equipment-presets');
    if (!root) return;
    let state = equipmentLoadoutRuntime.ensureState();
    let selected = state.selectedSlot;
    let preset = state.presets[selected];
    let html = `<section class="equipment-preset-panel" aria-label="통합 빌드 세팅">
        <div class="equipment-preset-row">${state.presets.map((row, index) => renderEquipmentLoadoutPresetSlot(row, index, selected)).join('')}
            <button type="button" class="equipment-preset-save" onclick="equipmentLoadoutUi.save()" title="현재 장비와 주 공격, 이동, 소환, 보조 등급을 ${selected + 1}번 빌드에 저장">저장</button>
            <details class="eqw-more equipment-preset-more"><summary aria-label="세팅 관리">⋯</summary><div class="eqw-more-panel">
                <button type="button" onclick="equipmentLoadoutUi.rename()" ${preset ? '' : 'disabled'}>이름 바꾸기</button>
                <button type="button" onclick="equipmentLoadoutUi.clear()" ${preset ? '' : 'disabled'}>비우기</button></div></details>
        </div>
    </section>`;
    if (root.dataset.renderHtml === html) return;
    root.innerHTML = html;
    root.dataset.renderHtml = html;
}

/** Selecting a slot previews it. Only the explicit action in the comparison dialog changes a build. */
function pickEquipmentLoadoutPreset(slotIndex) {
    selectEquipmentLoadoutPreset(slotIndex);
    openReview('load', equipmentLoadoutRuntime.ensureState().selectedSlot);
}

function selectEquipmentLoadoutPreset(slotIndex) {
    actionNotice = '';
    let state = equipmentLoadoutRuntime.ensureState();
    state.selectedSlot = Math.max(0, Math.min(equipmentLoadoutRuntime.limit - 1, Math.floor(Number(slotIndex) || 0)));
    renderEquipmentLoadoutPresetPanel();
    if (typeof queueImportantSave === 'function') queueImportantSave(300);
}

function saveEquipmentLoadoutPresetFromUi() {
    openReview('save', equipmentLoadoutRuntime.ensureState().selectedSlot);
}

function commitSave(index) {
    const previous = equipmentLoadoutRuntime.ensureState().presets[index];
    const name = previous ? previous.name : `${game.activeSkill} 빌드`;
    let result = equipmentLoadoutRuntime.save(index, name);
    if (!result.ok) return showFailure(result.reason);
    actionNotice = `${LOADOUT_SLOT_NUMERALS[index]} ${result.preset.name}에 현재 빌드를 저장했습니다.`;
    addLog(`🧰 빌드 세팅 [${result.preset.name}] 저장, 장비 ${result.count}부위와 룬, 보조 등급`, 'season-up', { toast: true });
    if (typeof queueImportantSave === 'function') queueImportantSave(100);
    updateStaticUI();
    return true;
}

function commitApply(index) {
    let result = equipmentLoadoutRuntime.apply(index);
    if (!result.ok) return showFailure(result.reason);
    actionNotice = `${LOADOUT_SLOT_NUMERALS[index]} ${result.preset.name} 불러오기 완료`;
    // 장착 슬롯을 제작 대상으로 선택한 상태에서 세팅을 바꾸면 같은 슬롯의 다른 장비가
    // 조용히 제작 대상이 될 수 있다. 성공한 전환에서만 선택을 명시적으로 해제한다.
    if (typeof clearCraftSelection === 'function') clearCraftSelection();
    if (typeof hideItemTooltip === 'function') hideItemTooltip();
    const scope = result.preset.runeLoadout ? '장비와 룬, 보조 등급' : '장비만';
    addLog(`🧰 빌드 세팅 전환: [${result.preset.name}], ${scope}`, 'season-up', { toast: true });
    if (typeof queueImportantSave === 'function') queueImportantSave(100);
    updateStaticUI();
    return true;
}

function showFailure(reason) {
    actionNotice = `바꾸거나 저장할 수 없습니다: ${reason}`;
    addLog(actionNotice, 'attack-monster');
    renderEquipmentLoadoutPresetPanel();
    return false;
}

/** Display-only choices: do not allocate item identities or copy rune progression while previewing. */
function currentBuild() {
    return { slots: Object.fromEntries(equipmentLoadoutRuntime.slots.map(slot => {
        const item = game.equipment[slot];
        return [slot, item ? { id: item.id, instanceId: equipmentLoadoutRuntime.getItemIdentity(item), name: item.name } : null];
    })), runeLoadout: window.GameModules.skills.loadouts.capture(game) };
}

function renderSetNavigation(state) {
    return `<nav class="build-set-tabs" aria-label="빌드 세트 선택"><button type="button" data-build-view="current" aria-pressed="${review.view === 'current'}">현재 착용</button>
        ${state.presets.map((preset, slot) => `<button type="button" data-build-slot="${slot}" data-build-view="${slot}" aria-pressed="${review.view === String(slot)}">
        ${LOADOUT_SLOT_NUMERALS[slot]}${preset ? ' 세트' : ', 빈 칸'}</button>`).join('')}</nav>`;
}

function renderSetGear(preset, side) {
    const count = Object.values(preset.slots).filter(Boolean).length;
    const slots = getPaperdollSlots(preset.slots);
    if (preset.slots['코어'] || contentProgression.isUnlocked('cube')) slots.push('코어');
    const classes = `${slots.includes('반지3') ? ' has-ring3' : ''}${slots.includes('코어') ? ' has-core' : ''}`;
    const wards = equipmentLoadoutRuntime.slots.filter(slot => slot.startsWith('액막이'));
    return `<section class="build-set-gear"><h3>장비 <small>${count}부위</small></h3><div class="equipment-paperdoll build-set-paperdoll${classes}">
        ${slots.map(slot => renderGearChoice(preset.slots[slot], slot, side)).join('')}</div>
        <h4 class="build-set-wards-heading">액막이</h4><div class="build-set-wards">${wards.map(slot => renderGearChoice(preset.slots[slot], slot, side)).join('')}</div></section>`;
}

function renderSetRunes(loadout, side) {
    if (!loadout) return '<div class="build-set-legacy"><b>장비 전용 세트</b><p>장비만 불러오고 지금 끼운 스킬룬은 그대로 둡니다.</p><small>다시 저장하면 스킬룬도 함께 저장됩니다.</small></div>';
    if (loadout.invalidReason) return '<p class="build-review-warning">룬 기록을 읽을 수 없습니다. 다시 저장해 주세요.</p>';
    return `<section class="build-set-runes"><h3>스킬룬</h3><div class="build-set-rune-groups">${runeRows(loadout).map(([label, choices], index) =>
        `<section class="build-set-rune-group${index < 2 ? ' is-primary' : ''}"><h4>${label}</h4><div class="build-set-rune-grid">${renderRuneChoices(choices, side)}</div></section>`).join('')}</div></section>`;
}

function renderSavedSet(preset, slot) {
    const label = `${LOADOUT_SLOT_NUMERALS[slot]} ${preset?.name || '빈 세트'}`;
    const inspection = equipmentLoadoutRuntime.inspect(slot);
    const status = !preset ? '빈 저장칸' : inspection.applied ? '착용 중' : '저장된 빌드';
    const contents = preset ? renderSetGear(preset, label) + renderSetRunes(preset.runeLoadout, label)
        : '<div class="build-set-empty"><b>저장된 세트 없음</b><p>현재 장비와 스킬룬을 이 칸에 함께 저장하세요.</p></div>';
    return `<article class="build-set-card is-selected" data-build-set="${slot}" aria-label="${escapeHTML(label)}">
        <header class="build-set-heading"><b>${escapeHTML(label)}</b><small>${status}</small></header>
        <div class="build-set-contents">${contents}</div>${preset && presetBlocked(inspection) ? `<p class="build-set-status">${escapeHTML(describeLoadoutPresetSlot(preset, inspection))}</p>` : ''}</article>`;
}

function renderSets(state, index, current) {
    if (review.view !== 'current') return renderSavedSet(state.presets[index], index);
    return `<article class="build-set-card is-current" data-build-set="current" aria-label="현재 착용 세트">
        <header class="build-set-heading"><b>현재 착용 세트</b><small>${escapeHTML(current.runeLoadout.activeSkill)}</small></header>
        <div class="build-set-contents">${renderSetGear(current, '현재 장착')}${renderSetRunes(current.runeLoadout, '현재 장착')}</div></article>`;
}

/** Saved references resolve by identity, never by name. Missing gear cannot borrow another item's options. */
function renderGearChoice(reference, slot, side) {
    if (!reference) return `<span class="build-set-gear-empty slot-${slot}" aria-label="${escapeHTML(slot)} 빈 칸"><i aria-hidden="true">-</i><small>${slot === '방패' ? '완갑/보조' : escapeHTML(slot)}</small></span>`;
    const item = side === '현재 장착' ? game.equipment[slot] : review.items.get(reference.instanceId);
    const detail = { kind: 'gear', name: item?.name || reference.name, item, slot, side };
    const icon = item ? renderInventoryItemVisual(item, 'equipment', 'build-review-art') : '<span aria-hidden="true">?</span>';
    const note = item ? (slot === '방패' ? '완갑/보조' : slot) : '미보유';
    return renderChoice(detail, icon, note, item ? getRarityColor(item.rarity) : '#b8ab94');
}

function renderRuneChoices(choices, side) {
    if (!choices) return '<span class="build-review-empty">저장 기록 없음</span>';
    if (!choices.length) return '<span class="build-review-empty">없음</span>';
    return choices.map(choice => {
        const support = choice.kind === 'support';
        const icon = support ? supportGemSigil.html(choice.name, 'build-review-art', choice.tier)
            : renderSkillGemArt(choice.name, 'build-review-art', { eager: true });
        const meta = getGemCardMeta(SKILL_DB[choice.name]);
        const colorClass = support ? `is-tone-${supportGemSigil.tone(choice.name)}` : `element-${meta.className}`;
        return renderChoice({ ...choice, side, colorClass }, icon, choice.note || meta.elementLabel, 'var(--sigil)');
    }).join('');
}

function renderChoice(detail, icon, note, tone) {
    const key = review.details.push(detail) - 1;
    const classes = detail.kind === 'gear' ? `build-review-gear slot-${detail.slot}` : `build-review-rune ${detail.colorClass}`;
    return `<button type="button" class="build-review-asset ${classes}" style="--build-tone:${tone}" data-build-detail="${key}" data-info-tooltip-anchor="1"
        aria-label="${escapeHTML(`${detail.side}, ${detail.name}, ${note}, 상세 보기`)}" aria-haspopup="dialog">
        <span class="build-review-icon" aria-hidden="true">${icon}</span><span class="build-review-copy"><b>${escapeHTML(detail.name)}</b>${note ? `<small>${escapeHTML(note)}</small>` : ''}</span></button>`;
}

function renderReviewIntent(mode, index, preset) {
    const target = `${LOADOUT_SLOT_NUMERALS[index]} ${preset?.name || '빈 저장칸'}`;
    const direction = mode === 'save' ? `현재 빌드 → ${target}에 저장` : `${target} → 현재 빌드로 불러오기`;
    const scope = mode === 'load' && preset && !preset.runeLoadout ? '장비만 불러오고 지금 끼운 스킬룬은 그대로 둡니다. 새 장비에 맞지 않는 룬은 쉬거나 빠집니다.' : '장비, 주 공격, 이동, 소환룬과 수, 보조룬과 선택 등급';
    return `<div class="build-review-intent"><b>${escapeHTML(direction)}</b><p>${scope}</p></div>`;
}

function renderReviewActions(mode, index, preset, applied) {
    const numeral = LOADOUT_SLOT_NUMERALS[index];
    const action = mode === 'save' ? `${numeral}에 ${preset ? '덮어쓰기' : '새 빌드 저장'}` : `${numeral} 빌드 불러오기`;
    const disabled = mode === 'load' && (!preset || applied);
    return `<div class="build-review-actions"><button type="button" data-build-mode="${mode === 'save' ? 'load' : 'save'}">${mode === 'save' ? '불러오기로 전환' : '이 칸에 현재 빌드 저장…'}</button>
        <button type="button" data-build-confirm ${disabled ? 'disabled' : ''}>${action}</button></div>`;
}

function renderReviewBody(mode, index, state, current, notice) {
    const preset = state.presets[index], inspection = equipmentLoadoutRuntime.inspect(index);
    const warning = notice || (presetBlocked(inspection) ? describeLoadoutPresetSlot(preset, inspection) : '');
    return `${renderSetNavigation(state)}<p class="build-review-help">아이콘에 마우스를 올리면 상세, 누르면 크게 봅니다.</p>
        ${warning ? `<p class="build-review-warning" role="status">${escapeHTML(warning)}</p>` : ''}
        ${renderSets(state, index, current)}<div class="build-review-footer">${renderReviewIntent(mode, index, preset)}
        ${renderReviewActions(mode, index, preset, inspection.applied)}</div>
        <p class="build-review-note">룬 레벨, 경험치, 해금, 가공 진척, 패시브는 저장하거나 되돌리지 않습니다.</p>`;
}

function openReview(mode, index, notice = '', view = mode === 'save' ? 'current' : String(index)) {
    const state = equipmentLoadoutRuntime.ensureState(), current = currentBuild();
    const items = getEquipmentLoadoutOwnedItems(game).concat(game.equipmentTemporaryStorage || []);
    clearReviewHint();
    review = { mode, index, view, owner: game, signature: JSON.stringify([current, state.presets[index]]), details: [],
        items: new Map(items.map(item => [equipmentLoadoutRuntime.getItemIdentity(item), item])) };
    selectionDialog.show({ id: REVIEW_ID, title: mode === 'save' ? '빌드 세트 저장' : '빌드 세트 불러오기',
        panelClass: 'build-preset-review', body: renderReviewBody(mode, index, state, current, notice) });
}

/** A single UI event boundary drives rendering and commits; rendering never invokes this handler. */
function onReviewAction(event) {
    const button = event.target.closest(`#${REVIEW_ID} button`);
    if (!button || !review) return;
    clearReviewHint();
    if (button.dataset.buildDetail !== undefined) return openChoiceDetails(button);
    const { mode, index } = review;
    if (button.hasAttribute('data-build-confirm')) return confirmReview();
    if (button.dataset.buildView === 'current') return openReview(mode, index, '', 'current');
    if (button.dataset.buildMode) return openReview(button.dataset.buildMode, index);
    if (button.dataset.buildSlot !== undefined) {
        const next = Number(button.dataset.buildSlot);
        selectEquipmentLoadoutPreset(next);
        openReview(mode, next, '', String(next));
    }
}

function supportDetails(detail) {
    const { name, tier } = detail, stats = getUiPlayerStats();
    const info = getUiGemPresentation(name, true, stats), def = SUPPORT_GEM_DB[name];
    return `<div class="tooltip-title">${escapeHTML(name)}</div><div class="tooltip-line">${escapeHTML(info.desc || def.desc)}</div>
        <div class="tooltip-line build-detail-tier">선택 등급: ${tier}등급, ${escapeHTML(getSupportTierLabel(name, tier))}</div>
        <div class="tooltip-line">${statToneText.html(gemSelectionUi.effectText(name, tier, stats))}</div>
        ${def.tradeoff ? `<div class="tooltip-line">대가: ${escapeHTML(def.tradeoff)}</div>` : ''}
        <div class="tooltip-line">공명력 ${getSupportResonanceCostAtTier(name, tier)}, 현재 룬 Lv.${formatValue('', info.totalLevel)}</div>
        <div class="gem-card-tags gem-tooltip-tags">${renderGemTagChips(def, (def.tags || []).length)}</div>`;
}

/** Reuse full item/skill descriptions; support values use the saved tier without changing the live build. */
function choiceDetails(detail) {
    const holder = document.createElement('div');
    if (detail.kind === 'gear') {
        if (detail.item) showItemTooltip(null, detail.slot, detail.side === '현재 장착', detail.item, { target: holder });
        else holder.textContent = `${detail.name}: 보유하지 않은 장비입니다. 옵션 정보를 확인할 수 없습니다.`;
    } else if (detail.kind === 'support') holder.innerHTML = supportDetails(detail);
    else showGemTooltip(null, 'active', detail.name, holder);
    const gearBasis = detail.item ? '보유 장비의 현재 옵션' : '저장된 이름만 표시합니다.';
    const basis = detail.kind === 'gear' ? gearBasis : '룬 수치는 현재 레벨과 능력치 기준';
    return `<p class="build-detail-context">${escapeHTML(detail.side)}${detail.note ? `, ${escapeHTML(detail.note)}` : ''}</p>${holder.innerHTML}
        <p class="build-review-note">${basis}</p>`;
}

function openChoiceDetails(button) {
    const detail = review.details[Number(button.dataset.buildDetail)];
    if (!detail) return;
    selectionDialog.show({ id: 'equipment-build-detail', title: '빌드 구성 상세 정보', panelClass: 'build-preset-detail', body: choiceDetails(detail) });
}

let hintButton = null;
function clearReviewHint() {
    if (!hintButton) return;
    hideInfoTooltip();
    hintButton = null;
}

function acceptsChoiceHint(event) {
    return event.type === 'focusin' ? event.target.matches(':focus-visible') : event.pointerType === 'mouse';
}

function onChoiceHint(event) {
    if (!acceptsChoiceHint(event)) return;
    const button = event.target.closest(`#${REVIEW_ID} [data-build-detail]`);
    if (!button || !review || selectionDialog.isOpen('equipment-build-detail')) return;
    const detail = review.details[Number(button.dataset.buildDetail)];
    if (!detail) return;
    const bounds = button.getBoundingClientRect();
    const point = event.type === 'focusin' ? { clientX: bounds.left, clientY: bounds.bottom } : event;
    const token = `build-detail:${review.index}:${button.dataset.buildDetail}`;
    if (hintButton === button && reuseInfoTooltip(point, token)) return;
    hintButton = button;
    showInfoTooltipHtml(point.clientX, point.clientY, choiceDetails(detail), '#cfad6b', token);
}

function onChoiceLeave(event) {
    if (hintButton?.contains(event.target) && !hintButton.contains(event.relatedTarget)) clearReviewHint();
}

function onReviewDismiss(event) {
    if (event.type === 'keydown' && event.key !== 'Escape') return;
    if (event.type === 'click' && event.target.closest?.('[data-build-detail]')) return;
    clearReviewHint();
}

function confirmReview() {
    if (!review || !selectionDialog.isOpen(REVIEW_ID)) return;
    const { mode, index, owner, signature } = review;
    const latest = JSON.stringify([currentBuild(), equipmentLoadoutRuntime.ensureState().presets[index]]);
    if (owner !== game || signature !== latest) return openReview(mode, index, '구성이 바뀌었습니다. 갱신된 내용을 확인한 뒤 다시 눌러 주세요.');
    const ok = mode === 'save' ? commitSave(index) : commitApply(index);
    if (!ok) return openReview(mode, index, actionNotice);
    selectionDialog.close(REVIEW_ID);
    review = null;
}

async function renameEquipmentLoadoutPresetFromUi() {
    let state = equipmentLoadoutRuntime.ensureState();
    let preset = state.presets[state.selectedSlot];
    if (!preset) return false;
    let name = await requestGameText('빌드 세팅 이름을 입력하세요.', {
        title: '빌드 세팅 이름', value: preset.name, maxlength: 18, confirmLabel: '변경'
    });
    if (!name || !equipmentLoadoutRuntime.rename(state.selectedSlot, name)) return false;
    if (typeof queueImportantSave === 'function') queueImportantSave(100);
    renderEquipmentLoadoutPresetPanel();
    return true;
}

async function clearEquipmentLoadoutPresetFromUi() {
    let state = equipmentLoadoutRuntime.ensureState();
    let preset = state.presets[state.selectedSlot];
    if (!preset || !await requestGameConfirmation(`[${preset.name}] 빌드 기록을 비웁니다. 보유 장비와 룬은 사라지지 않습니다.`, {
        title: '빌드 세팅 비우기', tone: 'danger', confirmLabel: '기록 비우기'
    })) return false;
    equipmentLoadoutRuntime.clear(state.selectedSlot);
    actionNotice = '';
    if (typeof queueImportantSave === 'function') queueImportantSave(100);
    updateStaticUI();
    return true;
}

document.addEventListener('click', onReviewAction);
document.addEventListener('pointerover', onChoiceHint);
document.addEventListener('pointermove', onChoiceHint, { passive: true });
document.addEventListener('pointerout', onChoiceLeave);
document.addEventListener('focusin', onChoiceHint);
document.addEventListener('focusout', onChoiceLeave);
document.addEventListener('click', onReviewDismiss, true);
document.addEventListener('scroll', clearReviewHint, true);
window.addEventListener('keydown', onReviewDismiss, true);
return Object.freeze({
    render: renderEquipmentLoadoutPresetPanel,
    select: selectEquipmentLoadoutPreset,
    pick: pickEquipmentLoadoutPreset,
    save: saveEquipmentLoadoutPresetFromUi,
    rename: renameEquipmentLoadoutPresetFromUi,
    clear: clearEquipmentLoadoutPresetFromUi
});
})();

safeExposeGlobals({ equipmentLoadoutUi });
