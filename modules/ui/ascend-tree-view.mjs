import { ascendTreeRender, ascendTreeHint, ascendTreeTip, ascendTreePress, ascendTreeAct, ascendTreeClear } from './ascend-tree-actions.mjs';
import { ascendTreeIconOf } from './ascend-tree-common.mjs';
import { ascendTreePickCardHtml } from './ascend-tree-pick.mjs';
import { captureInvestmentSession, investmentSessionIsCurrent } from './loop-investment-session.mjs';
import { installAscendTreeEvents } from './ascend-tree-events.mjs';
import { releaseViewEvents } from './view-events.mjs';

/** Focus, hover and deferred scrolling belong to this view and the save/loop it rendered. */
export function createAscendTreeView(deps) {
    const runtime = { deps, active: true, session: null, focus: null, shown: null, scrollFrame: null, listeners: [], handlers: {} };
    const actions = { hint: ascendTreeHint, tip: ascendTreeTip, press: ascendTreePress, act: ascendTreeAct, clear: ascendTreeClear,
        reset: () => (0, deps.resetAscendKeystones)(),
        resetNodes: () => (0, deps.resetAscendNodes)(), continuePlan: () => (0, deps.continueLastLoopAscendPlan)() };
    runtime.handlers.render = () => {
        if (!runtime.active) return;
        syncAscendTreeSession(runtime);
        ascendTreeRender(runtime);
    };
    for (const [name, action] of Object.entries(actions)) runtime.handlers[name] = (...args) => {
        if (!runtime.active) return;
        if (!runtime.session || !investmentSessionIsCurrent(runtime, runtime.session)) return runtime.handlers.render();
        return action(runtime, ...args);
    };
    installAscendTreeEvents(runtime);
    return Object.freeze({ ...runtime.handlers,
        pickCardHtml: key => ascendTreePickCardHtml(runtime, key), icon: ascendTreeIconOf,
        dispose() {
            if (runtime.scrollFrame !== null) deps.cancelAnimationFrame(runtime.scrollFrame);
            runtime.scrollFrame = null;
            runtime.session = null;
            releaseViewEvents(runtime);
        }
    });
}

function syncAscendTreeSession(runtime) {
    if (runtime.session && investmentSessionIsCurrent(runtime, runtime.session)) return;
    if (runtime.scrollFrame !== null) runtime.deps.cancelAnimationFrame(runtime.scrollFrame);
    runtime.scrollFrame = null;
    runtime.focus = null;
    runtime.shown = null;
    runtime.session = captureInvestmentSession(runtime);
}
