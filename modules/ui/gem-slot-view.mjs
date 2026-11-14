import { listenView, releaseViewEvents } from './view-events.mjs';
import { openSlotDialog, slotGemHint, supportTierLineHtml, onSlotDialogClick, onSlotSearchInput, slotTierButtons, slotCountButtons, slotEnhanceButton, isSupportSlot, chooseSlotGem } from './gem-slot-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createGemSlotView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { openSlotDialog, slotGemHint, supportTierLineHtml, onSlotDialogClick, onSlotSearchInput };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = Object.freeze({ open: runtime.handlers.openSlotDialog, hint: runtime.handlers.slotGemHint, tierLineHtml: runtime.handlers.supportTierLineHtml , dispose: () => disposeGemSlot(runtime) });
    listenView(runtime, runtime.deps.document, 'click', runtime.handlers.onSlotDialogClick);
    listenView(runtime, runtime.deps.document, 'input', runtime.handlers.onSlotSearchInput);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.DIALOG_ID = 'gem-slot-dialog';
    runtime.state.TITLES = Object.freeze({ active: '주 공격 칸', mobility: '이동 칸', summon: '소환 칸', support: '보조스킬룬 칸' });
    runtime.state.BORDERS = Object.freeze({ support: '#2bcbba', attack: '#ff5252' });
    runtime.state.slot = null;
    runtime.state.HINT_HANDLERS = 'data-info-tooltip-anchor="1" onpointerenter="gemSlotDialog.hint(event,this)" onpointerleave="hideInfoTooltip()"';
    runtime.state.OFF_BUTTON = '<button type="button" data-slot-action="off">장착 해제</button>';
    runtime.state.CONTROLS = Object.freeze({
        support: (name, stats) => `${slotTierButtons(runtime, name, stats)}<div class="gem-slot-buttons">${runtime.state.OFF_BUTTON}</div>`,
        summon: name => `<div class="gem-slot-buttons">${slotCountButtons(runtime, name)}${slotEnhanceButton(runtime, name)}${runtime.state.OFF_BUTTON}</div>`,
        mobility: name => `<div class="gem-slot-buttons">${slotEnhanceButton(runtime, name)}${runtime.state.OFF_BUTTON}</div>`,
        active: name => `<div class="gem-slot-buttons">${slotEnhanceButton(runtime, name)}</div>`
    });
    runtime.state.ACTIONS = Object.freeze({
        tier: button => (0, runtime.deps.setSupportActiveTier)(runtime.state.slot.name, Number(button.dataset.tier)),
        off: () => (isSupportSlot(runtime) ? (0, runtime.deps.toggleSupport)(runtime.state.slot.name) : (0, runtime.deps.changeSkill)(runtime.state.slot.name)),
        enhance: () => { runtime.deps.selectionDialog.close(runtime.state.DIALOG_ID); (0, runtime.deps.openEquippedGemManagement)(runtime.state.slot.name); },
        'summon-more': () => (0, runtime.deps.changeSummonSkillCount)(runtime.state.slot.name, 1),
        'summon-less': () => (0, runtime.deps.changeSummonSkillCount)(runtime.state.slot.name, -1),
        choose: button => chooseSlotGem(runtime, button.dataset.name),
        preview: button => { runtime.state.slot.preview = button.dataset.name; },
        'candidate-tier': button => { (0, runtime.deps.setSupportActiveTier)(button.dataset.name, Number(button.dataset.tier)); runtime.state.slot.preview = button.dataset.name; },
        'replace-slot': button => { runtime.state.slot.name = button.dataset.name; runtime.state.slot.preview = runtime.state.slot.pending; runtime.state.slot.pending = ''; },
        'cancel-replace': () => { runtime.state.slot.pending = ''; }
    });
}

function disposeGemSlot(runtime) {
    releaseViewEvents(runtime); runtime.deps.selectionDialog.close(runtime.state.DIALOG_ID); runtime.state.slot = null;
}
