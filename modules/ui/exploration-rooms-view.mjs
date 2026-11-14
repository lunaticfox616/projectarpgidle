import { draw, pick, forgetMapBase, createDrawRooms, createDrawEliteMarks, createArenaDot } from './exploration-rooms-paint.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createExplorationRoomsView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { draw, pick, forgetMapBase };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.handlers.drawRooms = createDrawRooms(runtime);
    runtime.handlers.drawEliteMarks = createDrawEliteMarks(runtime);
    runtime.handlers.arenaDot = createArenaDot(runtime);
    runtime.api = Object.freeze({ dispose: () => { runtime.state.bases = new WeakMap(); }, draw: runtime.handlers.draw, pick: runtime.handlers.pick, forgetMapBase: runtime.handlers.forgetMapBase });

    return runtime.api;
}

function initialize(runtime) {
    runtime.state.INK = Object.freeze({ back: '#080b0d', rim: '#0b0e11',
        room: '#5b6a78', roomLight: '#8493a1', roomShade: '#3a4651', done: '#35404a', doneLight: '#4c5964', doneShade: '#252d35',
        veil: '#12171c', veilEdge: '#627080',
        boss: '#7c2a2c', bossLight: '#c2554f', bossShade: '#4a1719', bossVeil: '#2a1113', bossEdge: '#a7443f', bossMark: '#ffd9cf',
        link: '#93a2b0', linkDim: '#46525d', gate: '#c2554f', elite: '#e2b457', eliteEdge: '#3a2a10',
        here: '#7ff0de', hereGlow: 'rgba(110,240,220,.85)', hero: '#f4fffd', heroEdge: '#0b2a27' });
    runtime.state.SIZE = Object.freeze({ mini: { w: 152, h: 152, pad: 18, cap: 30, least: 19 }, large: { w: 560, h: 400, pad: 40, cap: 92, least: 0 } });
    runtime.state.SS = 2;
    runtime.state.bases = new WeakMap();
}
