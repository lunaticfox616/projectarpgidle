import { isFrameTabVisible, frameTabs } from './message-frame-queries.mjs';
import { followGoalDrawer, renderFrame, renderBar } from './message-frame-presentation.mjs';
import { createFrameResizeAxis } from './message-frame-geometry.mjs';
import { rememberHome, syncFrames, showFrameTab, showPhoneTab, resetFrames, disposeMessageFrames } from './message-frame-mount.mjs';
import { frameBoxOnStage, fadeFramesOverHero, stageCoveredFrom } from './message-frame-occlusion.mjs';
import { readFrameState } from './message-frame-store.mjs';
import { listenMessage, syncMessageOwner } from './message-frame-lifetime.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createMessageFramesView(deps) {
    const runtime = { deps, state: { owner: deps.game, pointer: null, clickTimer: null }, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { isFrameTabVisible, followGoalDrawer, renderFrame, rememberHome, frameBoxOnStage, syncFrames, showFrameTab, showPhoneTab, resetFrames, fadeFramesOverHero, stageCoveredFrom };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.handlers.frameResizeAxis = createFrameResizeAxis();
    runtime.api = messageFramesApi(runtime);
    listenMessage(runtime, runtime.deps.window, 'game:languagechange', () => {
        if (runtime.state.mounted) runtime.state.FRAMES.forEach(frame => renderBar(runtime, frame, frameTabs(runtime, frame)));
    });
    listenMessage(runtime, runtime.deps.window, 'resize', () => { runtime.state.stageBox = null; });
    return runtime.api;
}

function messageFramesApi(runtime) {
    const calls = { sync: runtime.handlers.syncFrames, showTab: runtime.handlers.showFrameTab, showPhoneTab: runtime.handlers.showPhoneTab,
        isTabVisible: runtime.handlers.isFrameTabVisible, isActive: () => runtime.state.mounted, reset: runtime.handlers.resetFrames,
        heroAt: runtime.handlers.fadeFramesOverHero, coveredFrom: runtime.handlers.stageCoveredFrom };
    const api = {};
    for (const [name, handler] of Object.entries(calls)) api[name] = (...args) => {
        if (!runtime.active) return name === 'coveredFrom' ? args[1] : false;
        syncMessageOwner(runtime);
        return handler(...args);
    };
    api.dispose = () => disposeMessageFrames(runtime);
    return Object.freeze(api);
}

function initialize(runtime) {
    runtime.state.STORAGE_KEY = 'rignin-message-frames-v1';
    runtime.state.TABS = Object.freeze({ log: { label: '전투', paneId: 'log' }, chat: { label: '채팅', paneId: 'tab-social' } });
    runtime.state.FRAMES = Object.freeze(['main', 'side']);
    runtime.state.MIN_WIDTH = 220;
    runtime.state.MIN_HEIGHT = 120;
    runtime.state.COLLAPSED_HEIGHT = 34;
    runtime.state.DRAG_OUT_PX = 24;
    runtime.state.DEFAULT_WIDTH = 300;
    runtime.state.DEFAULT_HEIGHT = 240;
    runtime.state.GAP = 10;
    runtime.state.TOP_RESERVE = 96;
    runtime.state.EDGES = Object.freeze(['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se']);
    runtime.state.homes = new Map();
    runtime.state.placedRects = { main: null, side: null };
    runtime.state.state = readFrameState(runtime);
    runtime.state.env = null;
    runtime.state.mounted = false;
    runtime.state.stash = null;
    runtime.state.dot = null;
    runtime.state.visible = new Set();
    runtime.state.suppressClick = false;
    runtime.state.phoneTab = 'log';
    runtime.state.goalWatch = null;
    runtime.state.HERO_HALF = 30;
    runtime.state.faded = { main: false, side: false };
    runtime.state.stageBox = null;
    runtime.state.COVER_JOIN = 40;
}
