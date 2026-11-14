import { flushTooltipPositions, checkTooltipAnchors, queueTooltipAnchorCheck, cancelTooltipComparison, applyTooltipPosition, positionTooltipElement, invalidateTooltipSize, reuseInfoTooltip, setActiveTooltip, clearActiveTooltip, hideInfoTooltip, dismissItemTooltipNow, hideItemTooltip, closeEveryTooltip, createShowInfoTooltipHtml } from './tooltip-core.mjs';
import { getItemAffixTierHtml, createPrepareItemTooltip, createPrepareItemTooltipContext, createPresentItemTooltip } from './tooltip-item-shell.mjs';
import { showCombatLogItemTooltip, openCombatLogItemEquipment, hideCombatLogItemTooltip, validateItemTooltipAnchor, createShowItemTooltip } from './tooltip-items.mjs';
import { scheduleTooltipComparison, setTooltipComparisonPointer } from './tooltip-comparison.mjs';
import { showSporeCraftTooltip, showStatTooltip, showPlayerEhpTooltip, showMapProgressTooltip, showPlayerExperienceTooltip, showPlayerBuffTooltip, createShowPlayerAilmentTooltip, createShowPlayerRuntimeEffectTooltip, createShowPlayerNamedEffectTooltip, createShowPlayerCosmosDebuffTooltip } from './tooltip-player.mjs';
import { showEnemyAilmentTooltip } from './tooltip-enemy.mjs';
import { showGemTooltip } from './tooltip-gems.mjs';
import { getItemSlotDisplayLabel, getItemStatRollRange, getItemStatRollRangeHtml, getUniqueEffectApplicationHint, getPlayerStatComparisonLines } from './tooltip-item-details.mjs';

import { syncTooltipOwner, disposeTooltipView, installTooltipEvents } from './tooltip-lifetime.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createTooltipView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, owner: deps.game, active: true, listeners: [] };
    const handlers = { flushTooltipPositions, checkTooltipAnchors, queueTooltipAnchorCheck, cancelTooltipComparison, scheduleTooltipComparison, setTooltipComparisonPointer, applyTooltipPosition, positionTooltipElement, invalidateTooltipSize, reuseInfoTooltip, setActiveTooltip, clearActiveTooltip, hideInfoTooltip, showSporeCraftTooltip, showStatTooltip, showPlayerEhpTooltip, showMapProgressTooltip, showPlayerExperienceTooltip, showPlayerBuffTooltip, showEnemyAilmentTooltip, showGemTooltip, getItemSlotDisplayLabel, getItemStatRollRange, getItemStatRollRangeHtml, getUniqueEffectApplicationHint, getPlayerStatComparisonLines, getItemAffixTierHtml, showCombatLogItemTooltip, openCombatLogItemEquipment, hideCombatLogItemTooltip, dismissItemTooltipNow, validateItemTooltipAnchor, hideItemTooltip, closeEveryTooltip };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.handlers.showInfoTooltipHtml = createShowInfoTooltipHtml(runtime);
    runtime.handlers.showPlayerAilmentTooltip = createShowPlayerAilmentTooltip(runtime);
    runtime.handlers.showPlayerRuntimeEffectTooltip = createShowPlayerRuntimeEffectTooltip(runtime);
    runtime.handlers.showPlayerNamedEffectTooltip = createShowPlayerNamedEffectTooltip(runtime);
    runtime.handlers.showPlayerCosmosDebuffTooltip = createShowPlayerCosmosDebuffTooltip(runtime);
    runtime.handlers.prepareItemTooltip = createPrepareItemTooltip(runtime);
    runtime.handlers.prepareItemTooltipContext = createPrepareItemTooltipContext(runtime);
    runtime.handlers.presentItemTooltip = createPresentItemTooltip(runtime);
    runtime.handlers.showItemTooltip = createShowItemTooltip(runtime);
    runtime.api = { applyTooltipPosition: runtime.handlers.applyTooltipPosition, positionTooltipElement: runtime.handlers.positionTooltipElement, invalidateTooltipSize: runtime.handlers.invalidateTooltipSize, reuseInfoTooltip: runtime.handlers.reuseInfoTooltip, setActiveTooltip: runtime.handlers.setActiveTooltip, clearActiveTooltip: runtime.handlers.clearActiveTooltip, showInfoTooltipHtml: runtime.handlers.showInfoTooltipHtml, hideInfoTooltip: runtime.handlers.hideInfoTooltip, showSporeCraftTooltip: runtime.handlers.showSporeCraftTooltip, showStatTooltip: runtime.handlers.showStatTooltip, showPlayerAilmentTooltip: runtime.handlers.showPlayerAilmentTooltip, showPlayerEhpTooltip: runtime.handlers.showPlayerEhpTooltip, showMapProgressTooltip: runtime.handlers.showMapProgressTooltip, showPlayerExperienceTooltip: runtime.handlers.showPlayerExperienceTooltip, showPlayerRuntimeEffectTooltip: runtime.handlers.showPlayerRuntimeEffectTooltip, showPlayerNamedEffectTooltip: runtime.handlers.showPlayerNamedEffectTooltip, showPlayerCosmosDebuffTooltip: runtime.handlers.showPlayerCosmosDebuffTooltip, showPlayerBuffTooltip: runtime.handlers.showPlayerBuffTooltip, showEnemyAilmentTooltip: runtime.handlers.showEnemyAilmentTooltip, showGemTooltip: runtime.handlers.showGemTooltip, getItemSlotDisplayLabel: runtime.handlers.getItemSlotDisplayLabel, getItemStatRollRange: runtime.handlers.getItemStatRollRange, getItemStatRollRangeHtml: runtime.handlers.getItemStatRollRangeHtml, getUniqueEffectApplicationHint: runtime.handlers.getUniqueEffectApplicationHint, getPlayerStatComparisonLines: runtime.handlers.getPlayerStatComparisonLines, prepareItemTooltip: runtime.handlers.prepareItemTooltip, presentItemTooltip: runtime.handlers.presentItemTooltip, getItemAffixTierHtml: runtime.handlers.getItemAffixTierHtml, showItemTooltip: runtime.handlers.showItemTooltip, showCombatLogItemTooltip: runtime.handlers.showCombatLogItemTooltip, openCombatLogItemEquipment: runtime.handlers.openCombatLogItemEquipment, hideCombatLogItemTooltip: runtime.handlers.hideCombatLogItemTooltip, dismissItemTooltipNow: runtime.handlers.dismissItemTooltipNow, validateItemTooltipAnchor: runtime.handlers.validateItemTooltipAnchor, hideItemTooltip: runtime.handlers.hideItemTooltip };
    for (const [name, handler] of Object.entries(runtime.api)) runtime.api[name] = guardTooltipCall(runtime, handler);
    runtime.api.comparison = Object.freeze({
        cancel: runtime.handlers.cancelTooltipComparison,
        schedule: guardTooltipCall(runtime, runtime.handlers.scheduleTooltipComparison),
        setPointer: guardTooltipCall(runtime, runtime.handlers.setTooltipComparisonPointer)
    });
    runtime.api.infoToken = () => syncTooltipOwner(runtime) ? runtime.state.activeInfoTooltipToken : null;
    runtime.api.clearGemCache = () => { runtime.state.gemTooltipCache = null; };
    runtime.api.dispose = () => disposeTooltipView(runtime);
    installTooltipEvents(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.tooltipAnchors = new Map();
    runtime.state.tooltipAnchorWatch = null;
    runtime.state.tooltipAnchorCheck = 0;
    runtime.state.TOOLTIP_CLOSERS = Object.freeze({ 'info-tooltip': () => hideInfoTooltip(runtime), 'item-tooltip-box': () => dismissItemTooltipNow(runtime) });
    runtime.state.gemTooltipCache = null;
    runtime.state.activeInfoTooltipToken = null;
    runtime.state.tooltipPositionFrame = null;
    runtime.state.pendingTooltipPositions = new Map();
    runtime.state.tooltipSizeCache = new WeakMap();
    runtime.state.UI_ENEMY_AILMENT_DETAIL_FORMATTERS = Object.freeze({
        chill: () => '이동/공격 속도 감소 (최대 생명력 대비 타격 비율 반영)',
        freeze: () => '행동 불가 (최대 생명력 대비 타격 비율 반영)',
        hunterExpose: () => (0, runtime.deps._t)('헌터 전직 키스톤 효과로 받는 모든 피해가 {takenMorePct}% 증가합니다.', { takenMorePct: runtime.deps.ASCENDANCY_KEYSTONE_VALUES.h2.takenMorePct }),
        assassinWeakness: state => (0, runtime.deps._t)('{floor}중첩, 중첩당 받는 피해 {takenPctPerStack}% 증가', { floor: Math.floor(state.power), takenPctPerStack: runtime.deps.ASCENDANCY_KEYSTONE_VALUES.a3.takenPctPerStack }),
        cosmosJudgment: state => (0, runtime.deps._t)('모든 저항 {power}% 감소', { power: state.power.toFixed(0) }),
        realmAllResDown: state => (0, runtime.deps._t)('모든 저항 약화 {stacks}중첩', { stacks: state.stacks })
    });
    runtime.state.itemTooltipHideTimer = null;
    runtime.state.activeTooltipId = null;
    runtime.state.activeItemTooltipToken = null;
    runtime.state.tooltipComparisonJob = null;
    runtime.state.tooltipComparisonPointer = { x: 0, y: 0 };
    runtime.state.itemTooltipComparisonScheduler = Object.freeze({cancel:runtime.handlers.cancelTooltipComparison,schedule:runtime.handlers.scheduleTooltipComparison,setPointer:runtime.handlers.setTooltipComparisonPointer});
}

function guardTooltipCall(runtime, handler) {
    return (...args) => { if (syncTooltipOwner(runtime)) return handler(...args); };
}
