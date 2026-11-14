import { createDrawFloorEdges, createDrawMarkers } from './act-exploration-minimap.mjs';
import { stopWalking, closeExplorationGateHint, restoreExplorationTooltip, hoverFrame, steer, render, mode, toggleAuto, commandMove, lockOnAt, hover, choose, holdMove, expand, hint, departureClick } from './act-exploration-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createActExplorationView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, hoverFrameId: null, gateDialog: null, tooltipDialog: null, tooltip: null };
    const handlers = { closeExplorationGateHint, restoreExplorationTooltip, hoverFrame, steer, render, mode, toggleAuto, commandMove, lockOnAt, hover, choose, holdMove, expand, hint, departureClick };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.handlers.drawFloorEdges = createDrawFloorEdges(runtime);
    runtime.handlers.drawMarkers = createDrawMarkers(runtime);
    runtime.api = {render: runtime.handlers.render,mode: runtime.handlers.mode,toggleAuto: runtime.handlers.toggleAuto,commandMove: runtime.handlers.commandMove,lockOnAt: runtime.handlers.lockOnAt,hover: runtime.handlers.hover,choose: runtime.handlers.choose,holdMove: runtime.handlers.holdMove,expand: runtime.handlers.expand,hint: runtime.handlers.hint,departurePending:()=>runtime.state.departurePending};
    runtime.deps.document.addEventListener('click',runtime.handlers.departureClick,true);
    runtime.api.dispose = () => disposeActExplorationView(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.departurePending = false;
    runtime.state.approvedDeparture = null;
    runtime.state.gateHintRun = null;
    runtime.state.BASE = ['run','map','packs','visited','discovered','status','sealed'];
    runtime.state.MODES = ['run','status','mode','hotkey','locked'];
    runtime.state.MARK = ['gx','gy','goalX','goalY','large'];
    runtime.state.shown = {};
    runtime.state.baseRev = 0;
    runtime.state.MAP_INK = {fog:'#050807',grid:'rgba(201,164,92,.06)',floor:'#7d7152',wall:'#26342c',edge:'rgba(240,214,150,.85)'};
    runtime.state.MINI_VIEW = 19;
    runtime.state.MINI_MARKER_BASE = 13;
    runtime.state.EDGE_SIDES = [[0,-1],[1,0],[0,1],[-1,0]];
    runtime.state.ENCOUNTER_MARKS = {breach:'#b58ce0',hive:'#79a8e8',treasure:'#8fd08a',meteor:'#f2efe6',redAltar:'#f07a2a',blueAltar:'#3f6dff'};
    runtime.state.hovering = null;
    runtime.state.STEPS = Object.freeze({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]});
    runtime.state.WALK_REACH = 4;
    runtime.state.WALK_TICK_MS = 90;
    runtime.state.held = [];
    runtime.state.walkTimer = null;
    runtime.state.KEYED = Object.freeze({unmarked:true});
}

function disposeActExplorationView(runtime) {
    runtime.active = false;
    runtime.deps.document.removeEventListener('click', runtime.handlers.departureClick, true);
    if (runtime.hoverFrameId !== null) runtime.deps.cancelAnimationFrame(runtime.hoverFrameId);
    runtime.hoverFrameId = null;
    runtime.state.hovering = null;
    runtime.state.held.length = 0;
    stopWalking(runtime, runtime.deps.actExplorationState.current(runtime.deps.game));
    runtime.gateDialog?.removeEventListener('close', runtime.handlers.closeExplorationGateHint);
    runtime.gateDialog = null;
    runtime.state.gateHintRun = null;
    restoreExplorationTooltip(runtime);
    runtime.state.shown = {};
}
