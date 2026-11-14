import { tick, closeVoidPassiveCraftOverlay, craftVoidPassiveFromOverlay, refundVoidPassiveFromOverlay, askRefundPassiveNode, convertChameleonFromOverlay, openVoidPassiveCraftOverlay, effectHtml, panelHtml, toggleTarget, openPicker, showGroup, toggleRun, stopRun } from './void-craft-panel.mjs';
import { getPassiveTreeSearchState, getPassiveNodeSearchMatch, setPassiveTreeSearchState, setupPassiveTreeSearchControls } from './passive-tree-search.mjs';
import { renderPassiveSpecializationControls, onPassiveRevelationChanged, renderPassiveInvestmentSummary, togglePassiveInvestmentSummary, syncPassiveTreeHeader } from './passive-tree-summary.mjs';
import { resetPassiveTreeByGoldenRule, renderPassiveTreePlannerPanel, selectPassiveTreePresetSlot, savePassiveTreePresetFromUi, togglePassiveTreeAutoInvest, togglePassiveTreeLabels, copyPassiveTreePresetCode, importPassiveTreePresetFromUi } from './passive-tree-planner.mjs';
import { normalizePassiveTooltipText, getPassiveTooltipDescription, describeReachablePassiveNode, describeBlockedPassiveNode } from './passive-tree-tooltips.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createPassiveTreeView(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { tick, getPassiveTreeSearchState, getPassiveNodeSearchMatch, setPassiveTreeSearchState, renderPassiveSpecializationControls, onPassiveRevelationChanged, renderPassiveInvestmentSummary, togglePassiveInvestmentSummary, syncPassiveTreeHeader, resetPassiveTreeByGoldenRule, renderPassiveTreePlannerPanel, selectPassiveTreePresetSlot, savePassiveTreePresetFromUi, togglePassiveTreeAutoInvest, togglePassiveTreeLabels, copyPassiveTreePresetCode, importPassiveTreePresetFromUi, setupPassiveTreeSearchControls, closeVoidPassiveCraftOverlay, craftVoidPassiveFromOverlay, refundVoidPassiveFromOverlay, askRefundPassiveNode, convertChameleonFromOverlay, openVoidPassiveCraftOverlay, normalizePassiveTooltipText, getPassiveTooltipDescription, describeReachablePassiveNode, describeBlockedPassiveNode, effectHtml, panelHtml, toggleTarget, openPicker, showGroup, toggleRun, stopRun };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(undefined, ctx);
    initialize(ctx);
    ctx.api = createPublicApi(ctx);
    return ctx.api;
}

function initialize(ctx) {
    ctx.state.passiveTreeSearch = '';
    ctx.state.passiveTreeFilter = 'all';
    ctx.state.controlsBound = false;
    ctx.state.RUN_INTERVAL_MS = 130;
    ctx.state.MAX_TARGETS = 3;
    ctx.state.HIT_FX_MS = 1900;
    ctx.state.SPARKS = 22;
    ctx.state.GROUP_CLASS = { 피해: 'damage', '치명타와 속도': 'speed', 상태이상: 'ailment', 방어: 'defence', 능력치: 'attribute', 무기: 'weapon' };
    ctx.state.PICKER_ID = 'void-target-dialog';
    ctx.state.targets = new Map();
    ctx.state.run = null;
    ctx.state.pickerNode = null;
    ctx.state.pickerGroup = Object.keys(ctx.state.GROUP_CLASS)[0];
}

function createPublicApi(ctx) {
    return { getPassiveTreeSearchState: ctx.handlers.getPassiveTreeSearchState, getPassiveNodeSearchMatch: ctx.handlers.getPassiveNodeSearchMatch, setPassiveTreeSearchState: ctx.handlers.setPassiveTreeSearchState, renderPassiveSpecializationControls: ctx.handlers.renderPassiveSpecializationControls, onPassiveRevelationChanged: ctx.handlers.onPassiveRevelationChanged, renderPassiveInvestmentSummary: ctx.handlers.renderPassiveInvestmentSummary, togglePassiveInvestmentSummary: ctx.handlers.togglePassiveInvestmentSummary, syncPassiveTreeHeader: ctx.handlers.syncPassiveTreeHeader, resetPassiveTreeByGoldenRule: ctx.handlers.resetPassiveTreeByGoldenRule, renderPassiveTreePlannerPanel: ctx.handlers.renderPassiveTreePlannerPanel, selectPassiveTreePresetSlot: ctx.handlers.selectPassiveTreePresetSlot, savePassiveTreePresetFromUi: ctx.handlers.savePassiveTreePresetFromUi, togglePassiveTreeAutoInvest: ctx.handlers.togglePassiveTreeAutoInvest, togglePassiveTreeLabels: ctx.handlers.togglePassiveTreeLabels, copyPassiveTreePresetCode: ctx.handlers.copyPassiveTreePresetCode, importPassiveTreePresetFromUi: ctx.handlers.importPassiveTreePresetFromUi, setupPassiveTreeSearchControls: ctx.handlers.setupPassiveTreeSearchControls, closeVoidPassiveCraftOverlay: ctx.handlers.closeVoidPassiveCraftOverlay, craftVoidPassiveFromOverlay: ctx.handlers.craftVoidPassiveFromOverlay, refundVoidPassiveFromOverlay: ctx.handlers.refundVoidPassiveFromOverlay, askRefundPassiveNode: ctx.handlers.askRefundPassiveNode, convertChameleonFromOverlay: ctx.handlers.convertChameleonFromOverlay, openVoidPassiveCraftOverlay: ctx.handlers.openVoidPassiveCraftOverlay, normalizePassiveTooltipText: ctx.handlers.normalizePassiveTooltipText, getPassiveTooltipDescription: ctx.handlers.getPassiveTooltipDescription, describeReachablePassiveNode: ctx.handlers.describeReachablePassiveNode, describeBlockedPassiveNode: ctx.handlers.describeBlockedPassiveNode, voidCraftUi: { effectHtml: ctx.handlers.effectHtml, panelHtml: ctx.handlers.panelHtml, toggleTarget: ctx.handlers.toggleTarget, openPicker: ctx.handlers.openPicker, showGroup: ctx.handlers.showGroup, toggleRun: ctx.handlers.toggleRun, stopRun: ctx.handlers.stopRun } };
}
