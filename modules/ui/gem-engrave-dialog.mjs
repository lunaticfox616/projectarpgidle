import { listenView, releaseViewTarget } from './view-events.mjs';
import { renderSkillGemArt } from './gem-card-markup.mjs';
import { renderGemEngraveOverlayOption } from './gem-engraving-markup.mjs';

/** Selection belongs to the save and equipped rune that opened the dialog. */
export function openGemEngraveSlotOverlay(runtime, index) {
    if (!runtime.active) return;
    const selection = prepareEngraveSelection(runtime, index);
    if (!selection) return;
    closeGemEngraveSlotOverlay(runtime);
    const { deps } = runtime, overlay = deps.document.createElement('div');
    Object.assign(overlay, { id: 'gem-engrave-slot-overlay', className: 'game-choice-overlay gem-engrave-slot-overlay', tabIndex: -1 });
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', deps._t('{value}번 각인 슬롯 선택', { value: selection.slotIndex + 1 }));
    overlay.dataset.triggerSlotIndex = String(selection.slotIndex);
    overlay.innerHTML = engraveDialogMarkup(runtime, selection);
    runtime.state.engraveDialog = { ...selection, overlay };
    listenView(runtime, overlay, 'click', event => handleEngraveClick(runtime, overlay, event));
    listenView(runtime, overlay, 'keydown', event => {
        if (event.key === 'Escape') closeGemEngraveSlotOverlay(runtime);
    });
    deps.document.body.appendChild(overlay);
    overlay.focus({ preventScroll: true });
}

function prepareEngraveSelection(runtime, index) {
    const { deps } = runtime, owner = deps.game, active = deps.getGemEnhanceTargetSkill();
    const cap = readEngraveCap(runtime, owner, active);
    if (!deps.isEnhanceableAttackGem(active) || !cap) return;
    const slotIndex = Math.max(0, Math.min(4, Math.floor(Number(index) || 0)));
    if (slotIndex >= cap && !deps.selectGemEngraveSlot(slotIndex)) return;
    // Unlocking a slot refreshes the screen; do not resume into a replaced save/target.
    if (deps.game !== owner || deps.getGemEnhanceTargetSkill() !== active) return;
    if (slotIndex >= readEngraveCap(runtime, owner, active)) return;
    owner.gemEngraveSelectedSlot = slotIndex;
    return { owner, active, slotIndex, loop: owner.loopCount, season: owner.season, slots: deps.getSkyEnhancementSlotsForSkill(active) };
}

function readEngraveCap(runtime, owner, active) {
    const gem = runtime.deps.normalizeGemRecord((owner.gemData || {})[active]);
    return gem ? Math.max(1, Math.min(5, Math.floor(gem.skyEnhanceCap || 1))) : 0;
}

function engraveDialogMarkup(runtime, selection) {
    const { deps } = runtime, { active, slotIndex, slots } = selection;
    const current = slots[slotIndex] && deps.GEM_SKY_ENHANCEMENTS[slots[slotIndex]];
    return `<section class="gem-engrave-slot-dialog"><header><div class="gem-engrave-dialog-identity">${renderSkillGemArt(runtime, active, 'gem-engrave-dialog-art', { eager: true })}<div><span>${deps._t('하늘 각인')}</span><h3>${deps._t('{active}, {value}번 슬롯', { active: deps.escapeHTML(active), value: slotIndex + 1 })}</h3><p>${current ? `${deps._t('현재')} <b>${deps.escapeHTML(deps._t(current.name))}</b> ${deps.statToneText.html(deps._t(current.desc))}` : deps._t('이 슬롯에 넣을 각인을 선택하세요.')}</p></div></div><button type="button" data-action="close" aria-label="${deps._t('닫기')}">${deps._t('닫기')}</button></header><div class="gem-engrave-overlay-grid">${Object.values(deps.GEM_SKY_ENHANCEMENTS).map(enhancement => renderGemEngraveOverlayOption(runtime, enhancement, slots, slotIndex)).join('')}</div></section>`;
}

function isCurrentEngraveSelection(runtime, selection) {
    if (!runtime.active || runtime.deps.game !== selection.owner) return false;
    if (selection.owner.loopCount !== selection.loop || selection.owner.season !== selection.season) return false;
    return runtime.deps.getGemEnhanceTargetSkill() === selection.active;
}

function handleEngraveClick(runtime, overlay, event) {
    const selection = runtime.state.engraveDialog;
    if (!selection || selection.overlay !== overlay) return;
    if (!isCurrentEngraveSelection(runtime, selection)) return closeGemEngraveSlotOverlay(runtime, false);
    if (event.target === overlay) return closeGemEngraveSlotOverlay(runtime);
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled) return;
    if (button.dataset.action === 'close') return closeGemEngraveSlotOverlay(runtime);
    applyEngraveSelection(runtime, selection, button.dataset);
}

function applyEngraveSelection(runtime, selection, { action, engraveId }) {
    if (!['remove', 'apply'].includes(action)) return;
    const changed = action === 'remove'
        ? runtime.deps.removeSkyGemEnhancementFromActive(engraveId, selection.slotIndex)
        : runtime.deps.applySkyGemEnhancementToActive(engraveId, selection.slotIndex);
    if (changed) closeGemEngraveSlotOverlay(runtime);
}

export function closeGemEngraveSlotOverlay(runtime, restoreFocus = true) {
    const selection = runtime.state.engraveDialog;
    if (!selection) return;
    runtime.state.engraveDialog = null;
    releaseViewTarget(runtime, selection.overlay);
    selection.overlay.remove();
    if (!restoreFocus || !isCurrentEngraveSelection(runtime, selection)) return;
    const trigger = runtime.deps.document.querySelector(`#ui-gem-engrave-slots button[data-slot-index="${selection.slotIndex}"]`);
    if (trigger && !trigger.disabled) trigger.focus({ preventScroll: true });
}
