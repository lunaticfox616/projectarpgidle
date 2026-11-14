import { TAB_HEADER_NOTI_KEYS, TAB_UNLOCK_BUTTON_KEYS } from './tab-notification-keys.mjs';
export function syncStaticTabHeader(runtime) {
    TAB_HEADER_NOTI_KEYS.forEach(key => { let el=runtime.deps.document.getElementById('noti-' + key); if(!el) return; el.style.display = (runtime.deps.game.noti[key] && (0, runtime.deps.isNotiEnabled)(key)) ? 'block' : 'none'; });
    TAB_UNLOCK_BUTTON_KEYS.forEach(runtime.deps.syncTabUnlockButton);
    let battleBtn = runtime.deps.document.getElementById('btn-tab-battle');
    if (battleBtn) battleBtn.style.display = (0, runtime.deps.isMobilePrimaryNavigationEnabled)() ? 'flex' : 'none';
    (0, runtime.deps.syncMergedTabLauncherVisibility)();
    // 매 프레임 해금 판정으로 재노출된 탭에 2단 그룹 필터를 다시 적용한다.
    if (typeof runtime.deps.hideOutOfGroupTabButtons === 'function') (0, runtime.deps.hideOutOfGroupTabButtons)();
    let summarySkillTreeBtn = runtime.deps.document.getElementById('btn-summary-tab-char');
    if (summarySkillTreeBtn) {
        summarySkillTreeBtn.disabled = !runtime.deps.game.unlocks.char;
        summarySkillTreeBtn.innerText = runtime.deps.game.unlocks.char ? (0, runtime.deps._t)('스킬트리') : (0, runtime.deps._t)('스킬트리 (Lv.2)');
    }
}

export function getStaticRenderContext(runtime) {
    let activeTabId = (0, runtime.deps.getActiveUiTabId)();
    // 포커스된 화면 하나가 아니라 "지금 보이는 화면 전부"를 그린다.
    let renderingTabIds = (0, runtime.deps.getRenderingUiTabIds)();
    let isTabRendering = tabId => renderingTabIds.has(tabId);
    // 열려 있는 최상위 화면이 그 사이 다시 잠겼는지(루프 정산 등)를 먼저 본다.
    // 병합 런처(기록 등)는 TAB_UNLOCK_GATES에 없으므로 게이트 검사만으로는 걸러지지 않는다.
    let activeHostId = ((0, runtime.deps.getActiveTopLevelTabElement)() || {}).id || '';
    (0, runtime.deps.closeRelockedTabSurfaces)();
    let activeGate = activeTabId ? runtime.deps.TAB_UNLOCK_GATES[activeTabId] : null;
    // 잠긴 화면을 정리하고 나면 활성 탭이 하나도 남지 않을 수 있다(tabNavigation.needsFallback()).
    // 그대로 두면 어떤 탭도 렌더되지 않는 빈 화면이 되므로 안전한 탭으로 되돌린다.
    if ((activeGate && !runtime.deps.game.unlocks[activeGate]) || runtime.deps.tabNavigation.needsFallback() || (activeHostId && !(0, runtime.deps.isTabSurfaceAvailable)(activeHostId))) {
        runtime.deps.tabNavigation.clearFallback();
        (0, runtime.deps.switchTab)('tab-character');
        return;
    }
    return { renderingTabIds, isTabRendering, itemsTabActive: isTabRendering('tab-items'), sf: (0, runtime.deps.getSearchFilterState)() };
}

export function syncStaticTradeButton(runtime) {
    const tradeButton = runtime.deps.document.getElementById('btn-tab-trade'); // 거래 창의 메뉴 단추(2026-11-06): 열 칸이 하나라도 있으면 보인다
    if (tradeButton) tradeButton.style.display = runtime.deps.contentProgression.canOpen('tab-trade') ? 'flex' : 'none';
}
