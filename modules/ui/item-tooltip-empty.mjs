/** Existing empty-option notice shared by item tooltips and public equipment cards. */
export function renderEmptyItemExplicit(deps, item) {
    const ward = typeof deps.colonyWards === 'object' && deps.colonyWards.isWard(item);
    return `<div class="tooltip-line" style="margin-top:6px; color:var(--copy-muted);">${ward ? deps._t('장비창의 액막이 칸에 끼웁니다') : deps._t('일반 아이템: 추가 옵션 없음')}</div>`;
}
