import { positionTooltipElement, invalidateTooltipSize, setActiveTooltip, watchTooltipAnchor, tooltipAnchorAt } from './tooltip-core.mjs';

/** The tooltip context; a jewel or a core draws its own card here and the equipment tooltip stops (js/bag-items-ui.js). */
export function createPrepareItemTooltip(runtime) {
    return function prepareItemTooltip(event, item, idx, isEquip, options) {
        const context = runtime.handlers.prepareItemTooltipContext(event, item, idx, isEquip, options);
        return context && runtime.deps.bagItemsUi.presentTooltip(context, event, item) ? null : context;
    };
}

export function createPrepareItemTooltipContext(runtime) {
    return function prepareItemTooltipContext(event, item, idx, isEquip, options) {
        if (options.target) return { target: options.target, inline: true };
        if (runtime.deps.equipmentInventoryInteraction.getFocusedKey()) return null;
        if (runtime.state.itemTooltipHideTimer) {
            (0, runtime.deps.clearTimeout)(runtime.state.itemTooltipHideTimer);
            runtime.state.itemTooltipHideTimer = null;
        }
        let nextTooltipToken = options.token || (isEquip ? `equip:${idx}:${item.id}` : `inv:${idx}:${item.id}`);
        let tt = runtime.deps.document.getElementById('item-tooltip-box');
        runtime.state.itemTooltipComparisonScheduler.setPointer(event);
        if (runtime.state.activeItemTooltipToken === nextTooltipToken && tt.style.display === 'block' && tt.innerHTML) {
            positionTooltipElement(runtime, tt, event.clientX, event.clientY);
            return null;
        }
        runtime.state.itemTooltipComparisonScheduler.cancel();
        runtime.state.activeItemTooltipToken = nextTooltipToken;
        return { target: tt, token: nextTooltipToken, inline: false };
    };
}

export function createPresentItemTooltip(runtime) {
    return function presentItemTooltip(context, event, item, html, isEquip) {
        let tt = context.target;
        tt.innerHTML = html;
        runtime.deps.itemInfluencesUi.markTooltip(tt, item);
        if (context.inline) return;
        // 스킨이 희귀도별 머리띠·테두리를 그릴 수 있도록 표시 중인 장비의 희귀도를 남긴다.
        tt.dataset.rarity = item.rarity || 'normal';
        tt.classList.toggle('item-compare-tooltip', false);
        tt.classList.toggle('dual-compare-tooltip', false);
        invalidateTooltipSize(runtime, tt);
        tt.style.display = 'block';
        positionTooltipElement(runtime, tt, event.clientX, event.clientY);
        setActiveTooltip(runtime, 'item-tooltip-box');
        watchTooltipAnchor(runtime, 'item-tooltip-box', tooltipAnchorAt(runtime, event.currentTarget, event.clientX, event.clientY));
        if (!isEquip) runtime.state.itemTooltipComparisonScheduler.schedule(item, context.token, html);
    };
}

export function getItemAffixTierHtml(runtime, stat) {
    const tier = (0, runtime.deps.isFixedEquipmentAffix)(stat) ? ' <span class="tier-badge tier-badge-fixed">[T0]</span>'
        : (stat.tier !== undefined ? ` ${(0, runtime.deps.getTierBadgeHtml)(stat.tier, 'T')}` : '');
    const source = runtime.deps.equipmentCrafting.getLabel(stat);
    return `${tier}${source ? ` <span class="equipment-craft-source">, ${source}</span>` : ''}`;
}

/** 추가 옵션 머리말: 마법과 희귀는 "추가 옵션 5/6 (접두 2/3, 접미 3/3)"(2026-10-07 접두 3, 접미 3). 예전 규칙으로 한도를 넘은
* 장비는 머리말을 경고색으로, 아래에 한 줄 안내. */
export function itemExplicitAffixHeaderHtml(runtime, item, count) {
    const used = runtime.deps.EXPLICIT_AFFIX_RULES[item.rarity] ? runtime.deps.equipmentCrafting.affixCounts(item) : null;
    const header = item.fusedRelic
        ? { text: `추가 옵션 ${count}개 (계승 ${item.stats.filter(stat => stat.fusedFromRare).length}개)`, over: false }
        : runtime.deps.equipmentCrafting.affixHeader(item.rarity, count, used);
    const style = header.over ? ' style="color:#ffb454;"' : '';
    const note = header.over ? `<div class="tooltip-line" style="color:#ffb454;">${(0, runtime.deps._t)('레거시 아이템')}</div>` : '';
    return `<div class="tooltip-line tooltip-section tooltip-section-explicit"${style}><span class="px-center">${(0, runtime.deps._t)(header.text)}</span></div>${note}`;
}

/** The base line's badge: the upgrade step ([2/4]). The 수평 word for a horizontal base is gone (2026-11-08 사용자: 무엇인지 모르겠다, 문구 삭제). */
export function getItemBaseBadgesHtml(runtime, item) {
    let info = typeof runtime.deps.getItemBaseChainInfo === 'function' ? (0, runtime.deps.getItemBaseChainInfo)(item) : null;
    let step = info && info.total > 1
        ? ` <span class="${(0, runtime.deps.getBaseStepClassName)(info)}" data-tip="${(0, runtime.deps._t)('업그레이드 단계 (낮을수록 하위, 높을수록 상위 베이스)')}">[${info.step}/${info.total}]</span>` : '';
    return step;
}
