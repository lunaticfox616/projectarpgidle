import { listenView, releaseViewEvents } from './view-events.mjs';
import { cancelViewFrames } from './view-frames.mjs';
import { closeNpcView } from './content-npc-actions.mjs';
import { announceStarterWeapon, announceLoop, announceJourney, announceOutsideChaos, announceContent, announceOpenedSince, syncOpened, announceSettledUnlocks } from './content-unlock-notices.mjs';
import { sync, syncOpeningHud, syncRuneLauncher, syncRoute, resetClosedSelection, render, select, purchase, takeContent, openSection, openProgressTarget, open } from './content-unlock-actions.mjs';
import { roadmapAdditions, entryReward, lockAttribute, routeAction, routeKey, journeyPath, journeyNotice, noticeContentId, journeyForNotice, noticeBody, canOpenProgressTarget, progressButton, openedContents, view_art, view_listed } from './content-unlock-markup.mjs';
import { npcNews, npcModeBody, npcTalkBody, npcFoot, npcTopics, npcReachedAct, npcGreeting, npcHeard, view_personal, view_npcHeardKey } from './content-npc-markup.mjs';
import { openNpc, renderNpc, hearNpcTopic, npcClick, npcPickTopic } from './content-npc-actions.mjs';
import { syncMenuUnlocks, getStarterWeaponTutorialTarget, isJournalTabUnlockReady, cancelBoundaryReveal } from './content-menu-progression.mjs';

export function createContentUnlockView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [], frames: new Set() };
    const handlers = { checkUnlocks: syncMenuUnlocks, getStarterWeaponTutorialTarget, isJournalTabUnlockReady, announceStarterWeapon, announceLoop, sync, syncOpeningHud, syncRuneLauncher, syncRoute, resetClosedSelection, roadmapAdditions, entryReward, lockAttribute, render, select, purchase, takeContent, routeAction, openSection, routeKey, journeyPath, journeyNotice, noticeContentId, journeyForNotice, noticeBody, announceJourney, announceOutsideChaos, canOpenProgressTarget, openProgressTarget, progressButton, announceContent, openedContents, announceOpenedSince, syncOpened, announceSettledUnlocks, npcNews, openNpc, renderNpc, npcModeBody, npcTalkBody, npcFoot, npcTopics, npcReachedAct, npcGreeting, npcHeard, hearNpcTopic, npcClick, npcPickTopic, open, view_art, view_listed, view_personal, view_npcHeardKey };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : undefined;
    initialize(runtime);

    runtime.api = ContentUnlockViewApi(runtime);
    installContentUnlockViewEvents(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.CONTENT_ROUTE_PATHS = Object.freeze({
        'item-tab-equip': '장비 → 장비 창', 'item-tab-craft': '장비 → 제작실', 'item-tab-fossil': '장비 → 제작실', 'tab-trade': '거래',
        'skill-tab-equip': '스킬룬 → 룬', 'skill-tab-enhance': '스킬룬 → 각인',
        'skill-tab-condition': '스킬룬 → 전술',
        'tab-codex': '기록 → 도감', 'tab-traits': '스킬트리 → 전직', 'tab-char': '스킬트리',
        'tab-season': '루프 패시브', 'tab-stump': '그루터기 함', 'tab-talent': '재능',
        'tab-unlocks': '해금'
    });
}

function ContentUnlockViewApi(runtime) {
    const names = [
        "checkUnlocks", "getStarterWeaponTutorialTarget", "isJournalTabUnlockReady",
        "announceStarterWeapon", "announceLoop", "sync", "syncOpeningHud", "syncRuneLauncher", "syncRoute",
        "resetClosedSelection", "roadmapAdditions", "entryReward", "lockAttribute", "render", "select",
        "purchase", "takeContent", "routeAction", "openSection", "routeKey", "journeyPath",
        "journeyNotice", "noticeContentId", "journeyForNotice", "noticeBody", "announceJourney", "announceOutsideChaos",
        "canOpenProgressTarget", "openProgressTarget", "progressButton", "announceContent", "openedContents", "announceOpenedSince",
        "syncOpened", "announceSettledUnlocks", "npcNews", "openNpc", "renderNpc", "npcModeBody",
        "npcTalkBody", "npcFoot", "npcTopics", "npcReachedAct", "npcGreeting", "npcHeard",
        "hearNpcTopic", "npcClick", "npcPickTopic", "open"
    ];
    const api = Object.fromEntries(names.map(name => [name, runtime.handlers[name]]));
    Object.defineProperties(api, Object.getOwnPropertyDescriptors(ContentUnlockViewFields(runtime)));
    api.dispose = () => disposeContentUnlockView(runtime);
    return api;
}

function ContentUnlockViewFields(runtime) {
    return {
        get art() { return runtime.handlers.view_art; },
        set art(value) { runtime.handlers.view_art = value; },
        get listed() { return runtime.handlers.view_listed; },
        set listed(value) { runtime.handlers.view_listed = value; },
        get personal() { return runtime.handlers.view_personal; },
        set personal(value) { runtime.handlers.view_personal = value; },
        get npcHeardKey() { return runtime.handlers.view_npcHeardKey; },
        set npcHeardKey(value) { runtime.handlers.view_npcHeardKey = value; }
    };
}

function installContentUnlockViewEvents(runtime) {
    listenView(runtime, runtime.deps.document, 'click', event => {
        const progress = event.target.closest('[data-progress-target]');
        if (progress) runtime.api.openProgressTarget(progress.dataset.progressTarget);
        const button = event.target.closest('[data-unlock-content]');
        if (button && !button.disabled) runtime.api.purchase(button.dataset.unlockContent, button.closest('.unlock-detail') || runtime.deps.document);
        const open = event.target.closest('[data-open-content]');
        if (open) runtime.api.open(open.dataset.openContent);
    });
    listenView(runtime, runtime.deps.document, 'error', event => {
        if (!(event.target instanceof runtime.deps.HTMLImageElement)) return;
        if (event.target.matches('.npc-dialog-portrait, .npc-roster-portrait')) event.target.remove();
        }, true);
}

function disposeContentUnlockView(runtime) {
    if (!runtime.active) return;
    closeNpcView(runtime);
    cancelBoundaryReveal(runtime);
    runtime.state.menuOwner = null;
    releaseViewEvents(runtime);
    cancelViewFrames(runtime);
}
