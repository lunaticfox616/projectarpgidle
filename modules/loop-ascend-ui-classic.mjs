import { windowMatchMedia } from './browser/window-methods.mjs';
import { createSeasonInvestments } from './domain/season-investments.mjs';
import { createAscendInvestments } from './domain/ascend-investments.mjs';
import { createPassiveNodeRefund } from './domain/passive-node-refund.mjs';
import { createLoopInvestmentView } from './ui/loop-investment-view.mjs';

// Remove these ports with final application composition; rules always receive their save explicitly.
const season = createSeasonInvestments({
    get nodes() { return SEASON_NODES; }, get innerNodes() { return SEASON_INNER_NODES; },
    node: id => getSeasonPassiveNodeDef(id), ids: () => getAllSeasonPassiveNodeIds(),
    unlockLoop: id => getSeasonPassiveUnlockLoop(id), unlocked: owner => contentProgression.isUnlocked('loopTree', owner),
    loop10Cost: (owner, key) => getLoop10StatCost(key, owner)
});
const ascend = createAscendInvestments({
    get classes() { return CLASS_TEMPLATES; }, get pickLimit() { return CLASS_KEYSTONE_PICK_LIMIT; },
    tree: (id, owner) => getClassTreeDef(id, owner), keystones: id => getClassKeystoneDefs(id),
    isClass: (id, base) => isAscendancyOfClass(id, base), canStore: (items, owner) => canStoreEquipmentItems(items, owner)
});
const passive = createPassiveNodeRefund({
    get tree() { return PASSIVE_TREE; }, get routing() { return passiveRouting; },
    root: owner => getPassiveTreeRootNodeId(owner), route: owner => getPassiveRouting(owner)
});
const view = createLoopInvestmentView({
    season, ascend, passive,
    get game() { return window.GameModules.state.game; },
    get document() { return document; },
    get _t() { return _t; },
    get escapeHTML() { return escapeHTML; },
    get assertBuildEditable() { return assertBuildEditable; },
    get requestGameConfirmation() { return requestGameConfirmation; },
    get addLog() { return addLog; },
    get updateStaticUI() { return updateStaticUI; },
    get normalizeSupportLoadout() { return normalizeSupportLoadout; },
    get clearAscendKeystoneRuntimeState() { return typeof clearAscendKeystoneRuntimeState === 'undefined' ? undefined : clearAscendKeystoneRuntimeState; },
    get calculateReachableNodes() { return calculateReachableNodes; },
    get hasAuthoredPassiveKeystone() { return hasAuthoredPassiveKeystone; },
    get passiveNodePresentation() { return window.GameModules.passiveScene.nodes; },
    get CLASS_TEMPLATES() { return CLASS_TEMPLATES; },
    get CLASS_KEYSTONE_PICK_LIMIT() { return CLASS_KEYSTONE_PICK_LIMIT; },
    get P_STATS() { return P_STATS; },
    get SEASON_NODES() { return SEASON_NODES; },
    get isAscendancyOfClass() { return isAscendancyOfClass; },
    get getAscendanciesForClass() { return getAscendanciesForClass; },
    get getClassTreeDef() { return getClassTreeDef; },
    get getClassKeystoneDefs() { return getClassKeystoneDefs; },
    get getSeasonPassiveNodeDef() { return getSeasonPassiveNodeDef; },
    get getSeasonPassiveUnlockLoop() { return getSeasonPassiveUnlockLoop; },
    get renderPixelIcon() { return renderPixelIcon; },
    get getStatName() { return getStatName; },
    get statToneText() { return statToneText; },
    get formatValue() { return formatValue; },
    get getItemStatToneColor() { return getItemStatToneColor; },
    get uiDisplay() { return uiDisplay; },
    get matchMedia() { return typeof matchMedia === 'undefined' ? undefined : windowMatchMedia; }
});
window.GameModules.loopInvestmentView = view;
window.GameModules.loopInvestmentRules = Object.freeze({ season, ascend, passive });
safeExposeGlobals({
    isSeasonNodeRequirementMet: view.isSeasonNodeRequirementMet,
    getSeasonNodeLevel: view.getSeasonNodeLevel,
    isSeasonTreeEvolved: view.isSeasonTreeEvolved,
    isAscendNodeRequirementMet: view.isAscendNodeRequirementMet,
    canRefundPassiveNode: view.canRefundPassiveNode,
    refundPassiveNode: view.refundPassiveNode,
    askRefundSeasonNode: view.askRefundSeasonNode,
    refundSeasonNode: view.refundSeasonNode,
    askRefundAscendNode: view.askRefundAscendNode,
    canInvestSeasonNode: view.canInvestSeasonNode,
    getSeasonNodeCap: view.getSeasonNodeCap,
    hasSpendableSeasonPoint: view.hasSpendableSeasonPoint,
    loopOrbitCenterHtml: view.loopOrbitCenterHtml,
    loopPassiveHint: view.loopPassiveHint,
    loopPassivePress: view.loopPassivePress,
    isAscendKeystoneRequirementMet: view.isAscendKeystoneRequirementMet,
    enforceWarriorDualTrainingEquipment: view.enforceWarriorDualTrainingEquipment,
    refundAscendKeystone: view.refundAscendKeystone,
    resetAscendKeystones: view.resetAscendKeystones,
    resetSeasonNodes: view.resetSeasonNodes,
    resetAscendNodes: view.resetAscendNodes,
    selectClass: view.selectClass,
    fillAscendancyPickScreen: view.fillAscendancyPickScreen,
    chooseLastLoopAscendPlan: view.chooseLastLoopAscendPlan,
    getAscendancyPlanContinueHtml: view.getAscendancyPlanContinueHtml,
    continueLastLoopAscendPlan: view.continueLastLoopAscendPlan,
    buyAscend: view.buyAscend,
    buySeason: view.buySeason,
    buyAscendKeystone: view.buyAscendKeystone
});
