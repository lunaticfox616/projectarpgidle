import { renderRarityFilterChips } from './static-inventory-filters.mjs';
import { getCraftPickerBodyHtml } from './static-picker-cards.mjs';

export function getCraftPickerPanelHtml(runtime, kind, real, options) {

    let filterRowHtml = real ? '' : `<div class="craft-picker-filter"><span class="inventory-view-filter-label">${(0, runtime.deps._t)('표시')}</span>${renderRarityFilterChips(runtime, 'picker')}</div>`;
    let desc = options.desc || (real ? (0, runtime.deps._t)('장비를 누르면 제작실 대상 장비로 바로 선택됩니다.') : (0, runtime.deps._t)('카드를 클릭하면 제작실 대상 장비로 바로 선택됩니다.'));
    let title = options.title || (kind === 'equip' ? (0, runtime.deps._t)('장착 장비에서 제작 대상 선택') : (0, runtime.deps._t)('인벤토리에서 제작 대상 선택'));
    return `<div class="craft-picker-panel"><div class="craft-picker-head"><div><div class="craft-picker-title" id="craft-picker-title">${title}</div><div class="craft-picker-desc">${desc}</div></div><button type="button" autofocus onclick="closeCraftItemPickerOverlay()">${(0, runtime.deps._t)('닫기')}</button></div>${filterRowHtml}<div class="craft-picker-body">${real ? '' : getCraftPickerBodyHtml(runtime, kind)}</div></div>`;

}

export function refuseCraftPickerItem(runtime, reason) {

    let line = runtime.deps.document.querySelector('#craft-item-picker-overlay .craft-picker-desc');
    if (!line) return;
    line.textContent = reason;
    line.classList.add('is-refused');

}

export function decorateCraftPickerCards(runtime, overlay, kind) {

    if (kind === 'altar') {
        overlay.querySelector('.craft-picker-title').textContent = (0, runtime.deps._t)('제단 장비 선택');
        overlay.querySelector('.craft-picker-desc').textContent = (0, runtime.deps._t)('제단에 올릴 수 있는 장비만 표시됩니다. 선택 후 제단에 올리세요.');
    }
    if (runtime.deps.uiDisplay.matches('(max-width: 1080px)')) overlay.querySelector('.craft-picker-head').insertAdjacentHTML('afterend', '<form class="craft-picker-search"><input name="craftSearch" type="search" aria-label="제작 장비 이름/베이스/등급/부위/옵션 검색" placeholder="이름/베이스/등급/옵션 검색"><button type="submit">검색</button></form>');

}
