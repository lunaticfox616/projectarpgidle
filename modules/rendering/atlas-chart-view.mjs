import { paint, paintWheel, mix, createBarkPainter } from './atlas-chart-paint.mjs';

/** Owns chart palette and painters. Receives the chart model; never changes game state. */
export function createAtlasChartArt(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { paint, paintWheel };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.handlers.barkAt = createBarkPainter(runtime);
    runtime.api = Object.freeze({ paint: runtime.handlers.paint, paintWheel: runtime.handlers.paintWheel });

    return runtime.api;
}

function initialize(runtime) {
    runtime.state.INK = [5, 4, 4];
    runtime.state.WOOD_DARK = [20, 17, 13];
    runtime.state.WOOD = [29, 24, 18];
    runtime.state.WOOD_LINE = [41, 34, 25];
    runtime.state.TRACK = [52, 43, 31];
    runtime.state.BARK = [14, 11, 8];
    runtime.state.BRONZE = [93, 74, 46];
    runtime.state.BRONZE_HI = [141, 114, 73];
    runtime.state.GOLD = [217, 176, 102];
    runtime.state.GOLD_HI = [243, 210, 140];
    runtime.state.SAP = [158, 128, 78];
    runtime.state.DIM = [52, 44, 32];
    runtime.state.RUN = [134, 178, 226];
    runtime.state.WELL = [16, 10, 20];
    runtime.state.TICKET_COLORS = [[214, 128, 82], [126, 178, 214], [214, 198, 96], [158, 126, 206]];
    runtime.state.BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    runtime.state.RIM = 47;
    runtime.state.BARK_IN = 44.8;
    runtime.state.WELL_R = 11;
    runtime.state.NODE_UNITS = Object.freeze({ map: 2.1, guardian: 2.6, pinnacle: 3.6 });
    runtime.state.LINK_LOOK = Object.freeze({ done: { color: runtime.state.GOLD, shadow: true }, lit: { color: runtime.state.SAP, shadow: true }, dim: { color: [88, 74, 52], dotted: true } });
    runtime.state.LOOKS = Object.freeze({
        locked: tint => ({ rim: mix(runtime, runtime.state.DIM, tint, 0.25), face: mix(runtime, runtime.state.WOOD_DARK, tint, 0.12), shine: mix(runtime, runtime.state.DIM, tint, 0.2) }),
        open: tint => ({ rim: runtime.state.GOLD, face: mix(runtime, runtime.state.WOOD, tint, 0.3), shine: mix(runtime, runtime.state.GOLD, tint, 0.4) }),
        complete: tint => ({ rim: mix(runtime, tint, runtime.state.GOLD_HI, 0.35), face: mix(runtime, tint, runtime.state.WOOD_DARK, 0.35), shine: mix(runtime, tint, runtime.state.GOLD_HI, 0.55) }),
        bonus: tint => ({ rim: runtime.state.GOLD_HI, face: mix(runtime, tint, runtime.state.WOOD_DARK, 0.25), shine: runtime.state.GOLD_HI })
    });
    runtime.state.WHEEL_UNITS = Object.freeze({ root: 3.6, small: 2.8, notable: 4, keystone: 4.6 });
    runtime.state.WHEEL_LOOKS = Object.freeze({
        taken: tint => ({ rim: runtime.state.GOLD, face: mix(runtime, tint, runtime.state.WOOD_DARK, 0.15), shine: runtime.state.GOLD_HI }),
        open: tint => ({ rim: runtime.state.SAP, face: mix(runtime, runtime.state.WOOD, tint, 0.3), shine: mix(runtime, runtime.state.SAP, runtime.state.GOLD_HI, 0.3) }),
        locked: tint => ({ rim: mix(runtime, runtime.state.DIM, tint, 0.25), face: runtime.state.WOOD_DARK, shine: mix(runtime, runtime.state.DIM, tint, 0.2) })
    });
}
