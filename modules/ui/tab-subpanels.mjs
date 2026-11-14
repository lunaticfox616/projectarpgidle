import { selectSubtab, acknowledgeEquipmentTab } from '../state/navigation-selection.mjs';

export function runWindowOpenHooks(runtime, tabId, shownId) {
    const { deps } = runtime;
    if (shownId === 'tab-items' && deps.equipmentTriage) deps.equipmentTriage.onOpen();
    if (tabId === 'tab-trade' && deps.marketUi.section === 'hall') deps.loadPlayerExchange();
    deps.tutorialActionUi.followOpeningTab(shownId);
}

export function craftSelectInventoryItemById(runtime, itemId) {
    const { deps } = runtime, owner = deps.game;
    if (!deps.contentProgression.canOpen('item-tab-craft')) return;
    const id = Number(itemId);
    if (!Number.isFinite(id) || !(owner.inventory || []).some(item => item && item.id === id)) return;
    openCraftingTab(runtime);
    deps.selectForCrafting(id, false);
    scheduleCraftingScroll(runtime, owner);
}

function openCraftingTab(runtime) {
    const { deps } = runtime;
    if (typeof deps.hideItemTooltip === 'function') deps.hideItemTooltip();
    if (typeof deps.hideInfoTooltip === 'function') deps.hideInfoTooltip();
    // Use the public desktop wrapper: a repeated click may toggle the window closed.
    if (typeof deps.switchTab === 'function') deps.switchTab('tab-items');
    if (deps.document.body.classList.contains('desktop-windowed-ui') && typeof deps.openWindow === 'function') deps.openWindow('tab-items');
    runtime.handlers.switchItemSubtab('item-tab-craft');
}

function scheduleCraftingScroll(runtime, owner) {
    const loop = owner.loopCount, season = owner.season;
    const timer = runtime.deps.setTimeout(() => {
        runtime.state.activationTimers.delete(timer);
        if (!runtime.active || runtime.deps.game !== owner || owner.loopCount !== loop || owner.season !== season) return;
        const el = runtime.deps.document.getElementById('forge-item-display');
        if (el && el.scrollIntoView) {
            try { el.scrollIntoView({ block:'start', behavior:'smooth' }); }
            catch (error) { runtime.deps.console.warn('crafting scroll fallback:', error); el.scrollIntoView(); }
        }
    }, 60);
    runtime.state.activationTimers.add(timer);
}

export function isSelectedSubtab(runtime, subtabId) {
    const panel = runtime.deps.document.getElementById(subtabId);
    const button = runtime.deps.document.getElementById('btn-' + subtabId);
    return !!(panel && button && panel.classList.contains('active') && button.classList.contains('active'));
}

export function switchItemSubtab(runtime, subtabId) {
    const { deps } = runtime, owner = deps.game;
    if (subtabId === 'item-tab-fossil') subtabId = 'item-tab-craft';
    if (redirectTradeTab(runtime, subtabId)) return;
    if (subtabId !== owner.itemSubtab) deps.craftingWorkspaceUi.stopAuto('');
    if (!deps.contentProgression.canOpen(subtabId)) return;
    acknowledgeEquipmentTab(owner, subtabId);
    if (subtabId === owner.itemSubtab && isSelectedSubtab(runtime, subtabId)) return;
    selectSubtab(owner, 'itemSubtab', subtabId);
    if (subtabId === 'item-tab-equip' && deps.equipmentTriage) deps.equipmentTriage.onOpen();
    showItemSubtabPanel(runtime, subtabId);
    deps.systemTutorialUi.visit(subtabId);
    deps.updateStaticUI();
}

function redirectTradeTab(runtime, subtabId) {
    if (!['item-tab-market', 'item-tab-hall'].includes(subtabId)) return false;
    const market = runtime.deps.marketUi;
    market.open(subtabId === 'item-tab-hall' ? 'hall' : market.section);
    return true;
}

function showItemSubtabPanel(runtime, subtabId) {
    const { deps } = runtime;
    clearSubtabPanels(runtime, '#tab-items .subtab-content', '#tab-items .subtab-btn');
    deps.document.getElementById(subtabId).classList.add('active');
    deps.document.getElementById('btn-' + subtabId).classList.add('active');
    if (typeof deps.refitDockedWindows === 'function') deps.refitDockedWindows();
}

function clearSubtabPanels(runtime, panels, buttons) {
    runtime.deps.document.querySelectorAll(panels).forEach(el => el.classList.remove('active'));
    runtime.deps.document.querySelectorAll(buttons).forEach(el => el.classList.remove('active'));
}

function activateSubtab(runtime, subtabId) {
    const panel = runtime.deps.document.getElementById(subtabId);
    const button = runtime.deps.document.getElementById('btn-' + subtabId);
    if (panel) panel.classList.add('active');
    if (button) button.classList.add('active');
}

export function switchSkillSubtab(runtime, subtabId) {
    const { deps } = runtime, owner = deps.game;
    if (!deps.contentProgression.canOpen(subtabId)) return;
    if (subtabId === owner.skillSubtab && isSelectedSubtab(runtime, subtabId)) return;
    selectSubtab(owner, 'skillSubtab', subtabId);
    clearSubtabPanels(runtime, '#tab-skills .subtab-content', '#tab-skills .subtab-btn');
    activateSubtab(runtime, subtabId);
    deps.systemTutorialUi.visit(subtabId);
}

export function switchMapSubtab(runtime, subtabId) {
    const { deps } = runtime, owner = deps.game;
    if (!deps.contentProgression.canOpen(subtabId)) return;
    if (!deps.isMapPrimaryContentUnlocked(owner, subtabId)) subtabId = 'map-tab-zones';
    if (subtabId === owner.mapSubtab && isSelectedSubtab(runtime, subtabId)) {
        reopenMapExplore(runtime, subtabId);
        if (subtabId === 'map-tab-cosmos') deps.cosmosAtlasView?.renderCosmosAtlas();
        return;
    }
    selectSubtab(owner, 'mapSubtab', subtabId);
    clearSubtabPanels(runtime, '#tab-map .subtab-content', '#tab-map .map-primary-tabs .subtab-btn');
    activateSubtab(runtime, subtabId);
    reopenMapExplore(runtime, subtabId);
    renderMapRegion(runtime, subtabId);
    deps.renderMobileMapNavigation();
    deps.explorationAtlasUi.syncLocation();
}

function reopenMapExplore(runtime, subtabId) {
    if (subtabId === 'map-tab-zones') runtime.deps.switchMapExploreSubtab(runtime.deps.game.mapExploreSubtab || 'map-explore-atlas');
}

function renderMapRegion(runtime, subtabId) {
    const { deps } = runtime;
    if (subtabId === 'map-tab-pvp' && typeof deps.renderGhostArena === 'function') deps.renderGhostArena();
    const render = {
        'map-tab-underworld': () => deps.renderUnderworldMapPanel(),
        'map-tab-ocean': () => deps.oceanDiveUi.render(),
        'map-tab-fishing': () => deps.fishingUi.render(),
        'map-tab-cosmos': () => deps.cosmosAtlasView?.renderCosmosAtlas()
    };
    render[subtabId]?.();
}

export function syncSingleSubtabRows(runtime) {
    runtime.deps.document.querySelectorAll('.tab-content .subtab-row:not(.merged-tab-subtabs)').forEach(row => {
        const open = [...row.children].filter(button => !button.hasAttribute('data-content-locked') && !button.hidden && button.style.display !== 'none');
        row.hidden = open.length < 2;
        const count = String(open.length);
        if (row.style.getPropertyValue('--subtab-count') !== count) row.style.setProperty('--subtab-count', count);
    });
}

export function notifyLockedTab(runtime, tabId) {
    const reserved = !!runtime.deps.document.getElementById('btn-' + tabId)?.classList.contains('nav-locked');
    runtime.deps.addLog(getLockedTabMessage(runtime, tabId), 'attack-monster', { toast:reserved });
}

function getLockedTabMessage(runtime, tabId) {
    if (tabId === 'tab-char') return runtime.deps._t('루프 2부터 해금 탭에서 스킬트리를 열 수 있습니다.');
    const messages = {
        'tab-season':'루프 1을 클리어하면 루프 탭이 열립니다.',
        'tab-items':'장비나 제작 재화를 얻으면 장비 탭이 열립니다.',
        'tab-skills':'새 스킬룬이나 보조스킬룬을 획득하면 스킬룬 탭이 열립니다.',
        'tab-codex':'첫 고유 아이템을 획득하면 도감 탭이 열립니다.',
        'tab-map':'액트 1을 마치면 지도가 열립니다.',
        'tab-traits':'전직 시련을 통과하면 전직 탭이 열립니다.',
        'tab-talent':'재능 개화 시련을 클리어하면 재능 탭이 열립니다.'
    };
    return messages[tabId] || '아직 해금되지 않은 탭입니다.';
}
