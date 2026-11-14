import { renderEquipmentLoadoutPresetPanel, selectEquipmentLoadoutPreset, pickEquipmentLoadoutPreset, saveEquipmentLoadoutPresetFromUi, renameEquipmentLoadoutPresetFromUi, clearEquipmentLoadoutPresetFromUi, onReviewAction, onChoiceHint, onChoiceLeave, onReviewDismiss, clearReviewHint, createRenderReviewBody } from './equipment-loadout-actions.mjs';
import { listenView, releaseViewEvents } from './view-events.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createEquipmentLoadoutView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { renderEquipmentLoadoutPresetPanel, selectEquipmentLoadoutPreset, pickEquipmentLoadoutPreset, saveEquipmentLoadoutPresetFromUi, renameEquipmentLoadoutPresetFromUi, clearEquipmentLoadoutPresetFromUi, onReviewAction, onChoiceHint, onChoiceLeave, onReviewDismiss, clearReviewHint };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.handlers.renderReviewBody = createRenderReviewBody(runtime);
    runtime.api = Object.freeze({
        render: runtime.handlers.renderEquipmentLoadoutPresetPanel,
        select: runtime.handlers.selectEquipmentLoadoutPreset,
        pick: runtime.handlers.pickEquipmentLoadoutPreset,
        save: runtime.handlers.saveEquipmentLoadoutPresetFromUi,
        rename: runtime.handlers.renameEquipmentLoadoutPresetFromUi,
        clear: runtime.handlers.clearEquipmentLoadoutPresetFromUi,
        dispose: () => disposeEquipmentLoadout(runtime)
    });
    listenView(runtime, runtime.deps.document, 'click', runtime.handlers.onReviewAction);
    listenView(runtime, runtime.deps.document, 'pointerover', runtime.handlers.onChoiceHint);
    listenView(runtime, runtime.deps.document, 'pointermove', runtime.handlers.onChoiceHint, { passive: true });
    listenView(runtime, runtime.deps.document, 'pointerout', runtime.handlers.onChoiceLeave);
    listenView(runtime, runtime.deps.document, 'focusin', runtime.handlers.onChoiceHint);
    listenView(runtime, runtime.deps.document, 'focusout', runtime.handlers.onChoiceLeave);
    listenView(runtime, runtime.deps.document, 'click', runtime.handlers.onReviewDismiss, true);
    listenView(runtime, runtime.deps.document, 'scroll', runtime.handlers.clearReviewHint, true);
    listenView(runtime, runtime.deps.window, 'keydown', runtime.handlers.onReviewDismiss, true);
    return runtime.api;
}

function disposeEquipmentLoadout(runtime) {
    releaseViewEvents(runtime);
    clearReviewHint(runtime);
    runtime.deps.selectionDialog.close('equipment-build-detail');
    runtime.deps.selectionDialog.close(runtime.state.REVIEW_ID);
    runtime.state.review = null;
}

function initialize(runtime) {
    runtime.state.actionNotice = '';
    runtime.state.review = null;
    runtime.state.REVIEW_ID = 'equipment-build-review';
    runtime.state.LOADOUT_SLOT_NUMERALS = Object.freeze(['I', 'II', 'III']);
    runtime.state.hintButton = null;
}
