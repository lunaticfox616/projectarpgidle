import { esc, prepareExample } from './player-guide-examples.mjs';
import { listenView, releaseViewTarget } from './view-events.mjs';

export function showReturnButton(runtime, lesson) {
    const bar = runtime.deps.document.createElement('aside');
    bar.className = 'guide-replay-bar';
    bar.setAttribute('aria-label', (0, runtime.deps._t)('가이드 다시보기'));
    bar.innerHTML = `<span>${esc(runtime, lesson.title)}</span><button type="button">${(0, runtime.deps._t)('가이드로 돌아가기')}</button>`;
    listenView(runtime, bar, 'click', event => { if (event.target.closest('button')) dismissReplay(runtime); });
    runtime.deps.document.body.append(bar);
    return bar;
}

export function openReplay(runtime, lesson) {
    if (!runtime.active) return;
    if (runtime.state.replay && runtime.deps.game !== runtime.state.replay.example) dismissReplay(runtime, false);
    if (runtime.state.replay) return;
    (0, runtime.deps.yieldTutorialCardToResult)();
    runtime.deps.tutorialActionUi.finish(false, true);
    const example = (0, runtime.deps.cloneDefaultGame)();
    example.settings = { ...(0, runtime.deps.structuredClone)(runtime.deps.game.settings), inventoryViewRarities: example.settings.inventoryViewRarities };
    Object.defineProperty(example, 'isGuideReplay', { value: true });
    const inert = [...runtime.deps.document.querySelectorAll('#left-pane, #left-pane-floating-toggle, #left-pane-expand-fab, #tab-header-main, #tab-header-bottom, #tab-category-bar')]
        .filter(element => !element.inert);
    runtime.state.replay = { live: runtime.deps.game, example, counter: runtime.deps.window.GameModules.state.session.itemIdCounter, lesson, inert, bar: null };
    runtime.deps.game = example;
    try {
        startExample(runtime, lesson);
    } catch (error) {
        dismissReplay(runtime);
        runtime.deps.console.error('Guide replay could not start:', error);
        (0, runtime.deps.showGameToast)((0, runtime.deps._t)('가이드를 불러오지 못했습니다.'), { tone: 'warning' });
    }
}

export function startExample(runtime, lesson) {
    prepareExample(runtime, lesson.key);
    runtime.state.replay.restoreWindows = (0, runtime.deps.beginGuideWindowLayout)(runtime.state.replay.live);
    if (lesson.tabId === 'tab-stump') runtime.state.replay.restoreStumpView = runtime.deps.stumpBoxUi.beginStumpGuideView(runtime.state.replay.live);
    runtime.deps.contentProgression.sync();
    runtime.deps.playerStatCache.invalidate();
    if (lesson.tabId === 'tab-char') (0, runtime.deps.calculateReachableNodes)();
    if (!runtime.deps.tutorialActionUi.guideFor(lesson.key)) throw new Error('Guide example cannot start');
    runtime.state.replay.bar = showReturnButton(runtime, lesson);
    runtime.deps.document.body.classList.add('guide-replay-active');
    runtime.state.replay.inert.forEach(element => { element.inert = true; });
    runtime.deps.document.addEventListener('scroll', runtime.handlers.repositionReplayCoach, true);
    const session = runtime.state.replay;
    session.notice = { ...lesson, replay: true, onComplete: () => completeReplay(runtime, session) };
    runtime.deps.tutorialActionUi.start(session.notice);
    (0, runtime.deps.updateStaticUI)();
}

export function completeReplay(runtime, session) {
    // The real equip/plant handler may still be rendering the example.
    (0, runtime.deps.queueMicrotask)(() => {
        if (!runtime.active || runtime.state.replay !== session || runtime.deps.game !== session.example) return;
        dismissReplay(runtime);
        (0, runtime.deps.showGameToast)((0, runtime.deps._t)('가이드 완료'), { tone: 'success' });
    });
}

export function clearExampleControls(runtime, tabId) {
    runtime.deps.document.querySelector('#game-dialog-overlay[open] #game-dialog-cancel')?.click();
    if (tabId === 'tab-items') {
        runtime.deps.equipmentInventoryInteraction.cancelCarry();
        runtime.deps.equipmentInventoryInteraction.focus(null);
    }
    if (tabId === 'tab-skills') runtime.deps.gemSelectionUi.close();
    if (tabId === 'tab-char') runtime.deps.passiveSelectionUi.hide();
}

export function repositionReplayCoach(runtime) {
    if (runtime.state.replay && runtime.deps.game !== runtime.state.replay.example) { dismissReplay(runtime, false); return; }
    runtime.deps.tutorialActionUi.reposition();
}

export function dismissReplay(runtime, restoreView = true) {
    if (!runtime.state.replay) return;
    const session = runtime.state.replay;
    const ownsExample = runtime.deps.game === session.example;
    let restored = false;
    try {
        if (runtime.deps.tutorialActionUi.active?.notice === session.notice) runtime.deps.tutorialActionUi.finish(false, true);
        if (ownsExample) {
            clearExampleControls(runtime, session.lesson.tabId);
        }
    } finally {
        restored = restoreReplay(runtime, session);
    }
    if (restored && restoreView) {
        (0, runtime.deps.openTabPane)('tab-guide');
        (0, runtime.deps.updateStaticUI)();
    }
}

function restoreReplay(runtime, session) {
    const ownsExample = runtime.deps.game === session.example;
    if (ownsExample) {
        runtime.deps.game = session.live;
        runtime.deps.window.GameModules.state.session.itemIdCounter = session.counter;
    }
    runtime.state.replay = null;
    runtime.deps.document.removeEventListener('scroll', runtime.handlers.repositionReplayCoach, true);
    if (session.bar) { releaseViewTarget(runtime, session.bar); session.bar.remove(); }
    runtime.deps.document.body.classList.remove('guide-replay-active');
    session.inert.forEach(element => { element.inert = false; });
    // A load performed during replay owns the new save and its item counter.
    if (!ownsExample) return false;
    session.restoreStumpView?.();
    session.restoreWindows?.();
    session.restoreSystem?.();
    runtime.deps.playerStatCache.invalidate();
    if (session.lesson.tabId === 'tab-char') (0, runtime.deps.calculateReachableNodes)();
    return true;
}

export function readReplayLiveGame(runtime) {
    const replay = runtime.state.replay;
    return replay && runtime.deps.game === replay.example ? replay.live : runtime.deps.game;
}

export function allowsTab(runtime, tabId, includeLauncher = false) {
    const replay = runtime.state.replay;
    const target = replay && runtime.deps.game === replay.example ? replay.lesson.tabId : null;
    return !target || tabId === target || (includeLauncher && tabId === (0, runtime.deps.getMergedTabGroup)(target)?.[1].launcher);
}
