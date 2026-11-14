import { cancelTooltipComparison, invalidateTooltipSize, positionTooltipElement } from './tooltip-core.mjs';
import { getPlayerStatComparisonLines, getUniqueEffectApplicationHint } from './tooltip-item-details.mjs';

export function setTooltipComparisonPointer(runtime, event) {
    runtime.state.tooltipComparisonPointer = {
        x: Number.isFinite(event && event.clientX) ? event.clientX : 0,
        y: Number.isFinite(event && event.clientY) ? event.clientY : 0
    };
}

export function getTooltipComparisonSlots(runtime, item) {
    let slots = (0, runtime.deps.getEquipCandidateSlots)(item).filter(slotKey => !!runtime.deps.game.equipment[slotKey]);
    if (slots.length === 0) slots = (0, runtime.deps.getEquipCandidateSlots)(item);
    return slots;
}

export function isTooltipComparisonActive(runtime, job) {
    if (!runtime.active || runtime.owner !== runtime.deps.game || runtime.state.tooltipComparisonJob !== job) return false;
    if (job.receiver) return job.receiver.isActive();
    if (runtime.state.activeItemTooltipToken !== job.tooltipToken) return false;
    return !(typeof runtime.deps.equipmentInventoryInteraction !== 'undefined'
            && runtime.deps.equipmentInventoryInteraction && typeof runtime.deps.equipmentInventoryInteraction.isCarrying === 'function'
            && runtime.deps.equipmentInventoryInteraction.isCarrying());
}

export function keepTooltipComparisonActive(runtime, job) {
    if (isTooltipComparisonActive(runtime, job)) return true;
    if (runtime.state.tooltipComparisonJob === job) cancelTooltipComparison(runtime);
    return false;
}

export function buildTooltipComparisonPanel(runtime, item, targetSlot) {
    const backup = runtime.deps.game.equipment[targetSlot];
    const { before, after } = runtime.deps.previewBuildStats(copy => {
        copy.equipment[targetSlot] = item;
    });
    let changedLines = getPlayerStatComparisonLines(runtime, before, after);
    if ((backup && backup.uniqueEffect) !== item.uniqueEffect) {
        let hint = item.uniqueEffect ? getUniqueEffectApplicationHint(runtime, item, true, targetSlot) : '';
        if (item.uniqueEffect) changedLines.push(`<div class="tooltip-line item-compare-line" style="color:#d8b5ff;">◆ 획득: ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(item.uniqueEffect))}${hint ? `<small style="display:block;color:#a995bf;">${(0, runtime.deps.escapeHTML)(hint)}</small>` : ''}</div>`);
        if (backup && backup.uniqueEffect) changedLines.push(`<div class="tooltip-line item-compare-line" style="color:#c98f9f;">◇ 상실: ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(backup.uniqueEffect))}</div>`);
    }
    let label = (0, runtime.deps.getDualSlotDisplayLabel)(targetSlot);
    if (changedLines.length > 0) return `<div class="item-compare-panel"><div class="tooltip-line item-compare-title">${(0, runtime.deps._t)('{label} 기준 착용 시 변화', { label })}</div>${changedLines.join('')}</div>`;
    if (!(0, runtime.deps.isDualSlotItem)(item.slot)) return '';
    return `<div class="item-compare-panel item-compare-empty"><div class="tooltip-line item-compare-title">${label}</div><div class="tooltip-line">${(0, runtime.deps._t)('교체 시 변화 없음')}</div></div>`;
}

export function applyTooltipComparison(runtime, job, result) {
    if (!keepTooltipComparisonActive(runtime, job)) return;
    if (job.receiver) { job.receiver.apply(result); return; }
    let tt = runtime.deps.document.getElementById('item-tooltip-box');
    if (!tt) return;
    tt.classList.toggle('item-compare-tooltip', result.hasSections);
    tt.classList.toggle('dual-compare-tooltip', result.hasSections && (0, runtime.deps.isDualSlotItem)(job.item.slot));
    tt.innerHTML = result.hasSections
        ? `<div class="item-tooltip-main">${job.mainHtml}</div>${result.markup}` : job.mainHtml;
    invalidateTooltipSize(runtime, tt);
    positionTooltipElement(runtime, tt, runtime.state.tooltipComparisonPointer.x, runtime.state.tooltipComparisonPointer.y);
}

export function finishTooltipComparison(runtime, job) {
    let sections = job.sections.filter(Boolean);
    let layoutClass = sections.length > 1 ? 'item-compare-grid' : 'item-compare-single';
    let result = {
        hasSections: sections.length > 0,
        markup: sections.length > 0 ? `<div class="${layoutClass}">${sections.join('')}</div>` : ''
    };
    applyTooltipComparison(runtime, job, result);
    if (runtime.state.tooltipComparisonJob === job) runtime.state.tooltipComparisonJob = null;
}

export function failTooltipComparison(runtime, job, error) {
    runtime.deps.console.error('equipment tooltip comparison failed:', error);
    let result = {
        hasSections: true,
        markup: '<div class="item-compare-single"><div class="item-compare-panel item-compare-empty"><div class="tooltip-line">장비 비교를 표시하지 못했습니다.</div></div></div>'
    };
    applyTooltipComparison(runtime, job, result);
    if (runtime.state.tooltipComparisonJob === job) runtime.state.tooltipComparisonJob = null;
}

export function queueTooltipComparisonWork(runtime, job) {
    if (!keepTooltipComparisonActive(runtime, job)) return;
    let run = () => {
        job.workHandle = null;
        if (!keepTooltipComparisonActive(runtime, job)) return;
        let slot = job.slots[job.index++];
        try {
            job.sections.push(buildTooltipComparisonPanel(runtime, job.item, slot));
        } catch (error) {
            failTooltipComparison(runtime, job, error);
            return;
        }
        if (job.index >= job.slots.length) finishTooltipComparison(runtime, job);
        else queueTooltipComparisonWork(runtime, job);
    };
    if (typeof runtime.deps.requestIdleCallback === 'function') {
        job.workKind = 'idle';
        job.workHandle = (0, runtime.deps.requestIdleCallback)(run, { timeout: 240 });
    } else {
        job.workKind = 'timeout';
        job.workHandle = (0, runtime.deps.setTimeout)(run, 0);
    }
}

/** @param {{isActive: () => boolean, apply: (result: {hasSections: boolean, markup: string}) => void} | null} receiver */
export function scheduleTooltipComparison(runtime, item, tooltipToken, mainHtml, receiver = null) {
    cancelTooltipComparison(runtime);
    let slots = getTooltipComparisonSlots(runtime, item);
    if (slots.length === 0) return;
    let job = {
        item, tooltipToken, mainHtml, receiver, slots, sections: [], index: 0,
        delayHandle: null, workHandle: null, workKind: ''
    };
    runtime.state.tooltipComparisonJob = job;
    // Paint details first; each idle slice compares one slot against fresh stats.
    job.delayHandle = (0, runtime.deps.requestAnimationFrame)(() => {
        job.delayHandle = null;
        queueTooltipComparisonWork(runtime, job);
    });
}
