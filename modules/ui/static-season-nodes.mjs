import { seasonNodeIcons } from './static-ui-data.mjs';

export function renderSeasonNode(runtime, id, placement, x, y) {
    let node = (0, runtime.deps.getSeasonPassiveNodeDef)(id);
    if (!node) return '';
    const state = seasonNodePresentation(runtime, id, node);
    const { lv, active, cap, reqMet, statInfo, suffix, scaled, stateText } = state;
    const { style, horizontalClass, stateClass, maxedClass, actionAttrs } = seasonNodeLayout(id, x, y, state);
    return `<div class="loop-passive-node ${placement || ''} ${horizontalClass} ${stateClass} ${maxedClass}"${style}${actionAttrs} data-loop-hint="${id}" aria-label="${(0, runtime.deps._t)(node.name)}: ${(0, runtime.deps._t)(node.desc)}"><span class="loop-node-core">${(0, runtime.deps.renderPixelIcon)(seasonNodeIcons[node.stat] || 'star', 'loop-node-icon')}<span class="loop-node-rank">${active ? `${lv}/${cap}` : (reqMet ? '+' : '×')}</span></span><span class="loop-node-tooltip"><strong>${(0, runtime.deps._t)(node.name)}</strong><small>${runtime.deps.statToneText.html((0, runtime.deps._t)(node.desc))}</small><em style="color:${(0, runtime.deps.getItemStatToneColor)(node.stat)}">${(0, runtime.deps._t)(statInfo.name) || node.stat} +${(0, runtime.deps.formatValue)(node.stat, scaled)}${suffix}</em><b>${stateText}</b>${active ? `<span class="loop-node-refund" role="button" tabindex="0" data-loop-action="refund" data-loop-id="${id}">${(0, runtime.deps._t)('마름병 포자로 반환')}</span>` : ''}</span></div>`;
}

function seasonNodePresentation(runtime, id, node) {
    let lv = (0, runtime.deps.getSeasonNodeLevel)(id);
    let active = lv > 0;
    let evolved = (0, runtime.deps.isSeasonTreeEvolved)();
    let cap = node.inner ? 1 : (evolved ? 5 : 1);
    let unlockLoop = (0, runtime.deps.getSeasonPassiveUnlockLoop)(id);
    let contentUnlocked = (runtime.deps.game.season || 1) >= unlockLoop;
    let reqMet = contentUnlocked && (0, runtime.deps.isSeasonNodeRequirementMet)(node);
    let statInfo = runtime.deps.P_STATS[node.stat] || {};
    let suffix = statInfo.isPct ? '%' : '';
    let scaled = Number((node.val * (1 + Math.max(0, lv - 1) * 0.2)).toFixed(2));
    const stateText = seasonNodeStateLabel(runtime, { contentUnlocked, unlockLoop, reqMet, active, lv, cap });
    return { lv, active, cap, reqMet, statInfo, suffix, scaled, stateText };
}

function seasonNodeStateLabel(runtime, state) {
    const { contentUnlocked, unlockLoop, reqMet, active, lv, cap } = state;
    let stateText = !contentUnlocked ? (0, runtime.deps._t)('루프 {unlockLoop} 해금', { unlockLoop }) : (!reqMet ? '선행 노드 필요' : (active ? (lv >= cap ? '최대' : '강화') : '활성화'));
    return stateText;
}

function seasonNodeLayout(id, x, y, state) {
    const { reqMet, active, lv, cap } = state;
    let style = Number.isFinite(x) && Number.isFinite(y) ? ` style="--loop-node-x:${x}%;--loop-node-y:${y}%;"` : '';
    let horizontalClass = x < 25 ? 'tooltip-right' : (x > 75 ? 'tooltip-left' : '');
    let stateClass = active ? 'active' : (reqMet ? 'available' : 'locked');
    let maxedClass = active && lv >= cap ? 'maxed' : '';
    let actionAttrs = reqMet
        ? ` role="button" tabindex="0" data-loop-action="press" data-loop-id="${id}"`
        : ' aria-disabled="true"';
    return { style, horizontalClass, stateClass, maxedClass, actionAttrs };
}
