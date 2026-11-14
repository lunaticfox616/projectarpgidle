import { renderBeyondBoundaryPanel } from './beyond-boundary-markup.mjs';
import { setBeyondBoundaryTier, stepBeyondBoundaryTier, chooseBeyondBoundarySeal, chooseBeyondBoundaryRewardFocus, chooseBeyondBoundaryIntensity, enterBeyondBoundaryRun, viewBeyondBoundaryCombat, leaveBeyondBoundaryRun } from './beyond-boundary-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createBeyondBoundaryView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { renderBeyondBoundaryPanel, setBeyondBoundaryTier, stepBeyondBoundaryTier, chooseBeyondBoundarySeal, chooseBeyondBoundaryRewardFocus, chooseBeyondBoundaryIntensity, enterBeyondBoundaryRun, viewBeyondBoundaryCombat, leaveBeyondBoundaryRun };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);

    runtime.api = {
        renderBeyondBoundaryPanel: runtime.handlers.renderBeyondBoundaryPanel,
        setBeyondBoundaryTier: runtime.handlers.setBeyondBoundaryTier,
        stepBeyondBoundaryTier: runtime.handlers.stepBeyondBoundaryTier,
        chooseBeyondBoundarySeal: runtime.handlers.chooseBeyondBoundarySeal,
        chooseBeyondBoundaryRewardFocus: runtime.handlers.chooseBeyondBoundaryRewardFocus,
        chooseBeyondBoundaryIntensity: runtime.handlers.chooseBeyondBoundaryIntensity,
        enterBeyondBoundaryRun: runtime.handlers.enterBeyondBoundaryRun,
        viewBeyondBoundaryCombat: runtime.handlers.viewBeyondBoundaryCombat,
        leaveBeyondBoundaryRun: runtime.handlers.leaveBeyondBoundaryRun
    };

    return runtime.api;
}
