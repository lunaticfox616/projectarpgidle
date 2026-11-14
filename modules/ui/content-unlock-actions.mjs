import { openedContents, canOpenProgressTarget, routeAction, routeKey } from './content-unlock-markup.mjs';
import { announceContent, announceOpenedSince } from './content-unlock-notices.mjs';

export function sync(runtime) {
    if (!runtime.deps.game.contentProgression) return;
    const enabled = !!runtime.deps.game.contentProgression;
    runtime.deps.document.body.classList.toggle('content-choice-progression', enabled);
    syncOpeningHud(runtime);
    runtime.deps.document.body.classList.toggle('content-support-locked', enabled && !runtime.deps.contentProgression.isUnlocked('support'));
    runtime.deps.document.body.classList.toggle('content-craft-locked', !runtime.deps.contentProgression.isUnlocked('craft'));
    runtime.deps.document.getElementById('loop-passive-locked')?.toggleAttribute('hidden', runtime.deps.contentProgression.isUnlocked('loopTree'));
    for (const def of runtime.deps.CONTENT_UNLOCK_CATALOG) {
        const locked = !runtime.deps.contentProgression.isUnlocked(def.id);
        for (const selector of def.sections || []) {
            runtime.deps.document.querySelectorAll(selector).forEach(el => el.toggleAttribute('data-content-locked', locked));
        }
        // 경로는 canOpen을 따른다: 세계수 아틀라스 창은 혼돈계 항목에 걸려 있지만 아틀라스가 열리면 연다. 항목 잠금을 그대로 쓰면
        // 루프 10에 아틀라스가 열려도 창이 숨어 빈 화면이 됐다(2026-10-07 리뷰).
        for (const route of def.routes || []) syncRoute(runtime, route, !runtime.deps.contentProgression.canOpen(route));
    }
    // 해금 목록 항목 없이 진행 조건으로만 열리는 경로.
    for (const route of ['tab-map', 'tab-season', 'tab-unlocks', 'tab-skills', 'tab-items', 'tab-character', 'tab-char', 'tab-social', 'tab-trade', 'map-explore-worldtree']) {
        syncRoute(runtime, route, !runtime.deps.contentProgression.canOpen(route));
    }
    resetClosedSelection(runtime, 'itemSubtab', 'item-tab-equip', '#tab-items');
    resetClosedSelection(runtime, 'skillSubtab', 'skill-tab-equip', '#tab-skills');
    resetClosedSelection(runtime, 'mapSubtab', 'map-tab-zones', '#tab-map');
    resetClosedSelection(runtime, 'mapExploreSubtab', 'map-explore-hunting', '#map-tab-zones');
    render(runtime);
}

export function syncOpeningHud(runtime) {
    const locked = runtime.deps.contentProgression.opening.combatOnly(runtime.deps.game);
    for (const id of ['btn-act-exploration-auto', 'btn-combat-return', 'btn-combat-goal-toggle']) {
        runtime.deps.document.getElementById(id)?.toggleAttribute('data-content-locked', locked);
    }
    const chatLocked = !runtime.deps.contentProgression.canOpen('tab-social');
    runtime.deps.document.body.classList.toggle('opening-chat-locked', chatLocked);
    for (const id of ['btn-combat-chat-tab', 'btn-combat-chat-settings']) {
        runtime.deps.document.getElementById(id)?.toggleAttribute('data-content-locked', chatLocked);
    }
    syncRuneLauncher(runtime);
}

export function syncRuneLauncher(runtime) {
    const button = runtime.deps.document.getElementById('btn-tab-items');
    if (!button) return;
    const runeOnly = !runtime.deps.contentProgression.canOpen('tab-items') && runtime.deps.contentProgression.canOpen('tab-skills');
    if (runeOnly) button.dataset.openingRunes = '1';
    else {
        if (!button.dataset.openingRunes) return;
        delete button.dataset.openingRunes;
    }
    const name = runeOnly ? '스킬룬' : '장비';
    const caption = name + '|하단 메뉴';
    const label = button.querySelector('.ui-rail-label');
    if (label && label.textContent !== (0, runtime.deps._t)(name)) label.textContent = (0, runtime.deps._t)(name);
    button.dataset.i18nSourceDataCaption = caption;
    button.dataset.caption = (0, runtime.deps._t)(caption);
}

export function syncRoute(runtime, route, locked) {
    // A merged launcher may remain available through another purchased child.
    const group = (0, runtime.deps.getMergedTabGroup)(route);
    const launcher = group && group[1].launcher === route;
    const closed = launcher ? !(0, runtime.deps.getSelectedMergedTabId)(group[0]) : locked;
    runtime.deps.document.getElementById('btn-' + route)?.toggleAttribute('data-content-locked', closed);
    if (!launcher) runtime.deps.document.getElementById(route)?.toggleAttribute('data-content-locked', locked);
}

export function resetClosedSelection(runtime, key, fallback, rootId) {
    if (runtime.deps.contentProgression.canOpen(runtime.deps.game[key])) return;
    runtime.deps.game[key] = fallback;
    const panels = key === 'mapExploreSubtab' ? ' .vertical-tab-panel' : ' > .subtab-content';
    const buttons = key === 'mapExploreSubtab' ? ' .vertical-tab-btn' : ' > .subtab-row > button';
    runtime.deps.document.querySelectorAll(rootId + panels).forEach(el => el.classList.toggle('active', el.id === fallback));
    runtime.deps.document.querySelectorAll(rootId + buttons).forEach(el => el.classList.toggle('active', el.id === 'btn-' + fallback));
}

export function render(runtime) {
    if (typeof runtime.deps.unlockTabUi === 'object') runtime.deps.unlockTabUi.render();
}

export function select(runtime, id) {
    runtime.deps.unlockTabUi.select(id);
}

export function purchase(runtime, id, scope = runtime.deps.document) {
    takeContent(runtime, id, scope);
}

export function takeContent(runtime, id, scope) {
    const key = scope.querySelector(`[data-unlock-reward="${id}"]`)?.value, opened = openedContents(runtime);
    const result = runtime.deps.contentProgression.purchase(id, runtime.deps.game, key);
    if (!result.ok) { (0, runtime.deps.addLog)(result.message, 'attack-monster', { toast: true }); return; }
    // The unlock card says the same and more: no toast (PC) or bottom notice (phone) on top of it.
    const carded = id === 'passiveTree' || announceContent(runtime, id);
    (0, runtime.deps.addLog)(result.message, 'season-up', { toast: !carded, noToast: carded });
    announceOpenedSince(runtime, opened); // free content that comes with it (장비 전당 with 고유 도감)
    // 공허 소켓은 스킬트리에 숨어 있던 공허 칸을 드러낸다(js/passives.js isVoidSocketHidden): 길과 화면을 다시 잇고 스킬트리에 알림 점을 켠다.
    if (id === 'voidSocket') { (0, runtime.deps.refreshPassiveConnectivity)(); runtime.deps.game.noti.char = true; }
    // 지금 살 수 있는 해금이 남았을 때만 알림: 뒤 루프의 강화 단계를 기다리는 포인트는 소식이 아니다(2026-10-25).
    runtime.deps.game.noti.season = runtime.deps.CONTENT_UNLOCK_CATALOG.some(def => runtime.deps.contentProgression.kind(def) === 'paid' && runtime.deps.contentProgression.status(def.id).available);
    runtime.handlers.checkUnlocks();
    (0, runtime.deps.updateStaticUI)();
    (0, runtime.deps.saveGame)({ skipCloudSync: false });
}

export function openSection(runtime, id) {
    runtime.deps.disclosure.setOpen(`id:${id}`, true);
    const section = runtime.deps.document.getElementById(id);
    if (section) section.open = true;
    scheduleViewFrame(runtime, () => runtime.deps.document.getElementById(id)?.scrollIntoView({ block:'nearest' }));
}

export function openProgressTarget(runtime, route) {
    if (!canOpenProgressTarget(runtime, route)) return false;
    if (route === 'outside-chaos') {
        (0, runtime.deps.switchTab)('tab-season', { keepWindowOpen: true });
        openSection(runtime, 'ui-loop10-section');
    } else if (route === 'map-explore-chaos' && !runtime.deps.explorationAtlasUi.available(route)) {
        runtime.deps.explorationAtlasUi.openAct(Math.min(runtime.deps.STORY_ACTS.length - 1, runtime.deps.game.maxZoneId));
    } else {
        (0, runtime.deps.switchTab)('tab-map', { keepWindowOpen: true });
        runtime.deps.explorationAtlasUi.enter(route);
        runtime.deps.explorationAtlasUi.openEntryPage(route);
    }
    return true;
}

export function open(runtime, id) {
    if (!runtime.deps.contentProgression.isUnlocked(id)) return false;
    const def = runtime.deps.CONTENT_UNLOCK_CATALOG.find(row => row.id === id);
    const action = routeAction(runtime, def);
    if (!action || !runtime.deps.contentProgression.canOpen(routeKey(runtime, action))) return false;
    (0, runtime.deps.switchTab)(action.tab, { keepWindowOpen: true });
    if (action.subtab) (0, runtime.deps.switchItemSubtab)(action.subtab);
    if (action.skillSubtab) (0, runtime.deps.switchSkillSubtab)(action.skillSubtab);
    if (action.mapSubtab) (0, runtime.deps.switchMapSubtab)(action.mapSubtab);
    if (action.explore) (0, runtime.deps.switchMapExploreSubtab)(action.explore);
    runtime.deps.explorationAtlasUi.openEntryPage(routeKey(runtime, action));
    if (action.atlasView) runtime.deps.atlasUi.setView(action.atlasView);
    if (action.section) openSection(runtime, action.section);
    return true;
}
import { scheduleViewFrame } from './view-frames.mjs';
