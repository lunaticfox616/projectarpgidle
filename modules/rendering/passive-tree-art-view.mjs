import { paintFramed, paintStart, drawBackdrop, drawMotifs, drawLinks, createNodePainter } from './passive-tree-art.mjs';

/** One renderer owns the node sprites, shaded images, links and backdrop caches. */
export function createPassiveTreeArt(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { paintFramed, paintStart, drawBackdrop, drawMotifs, drawLinks };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    runtime.handlers.drawNode = createNodePainter(runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ drawBackdrop: runtime.handlers.drawBackdrop, drawMotifs: runtime.handlers.drawMotifs, drawLinks: runtime.handlers.drawLinks, drawNode: runtime.handlers.drawNode });
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.TAU = Math.PI * 2;
    runtime.state.TONE = Object.freeze({
        idle: { ring: '#81786b', wood: ['#8c8274', '#4c463e'], fill: '#14110e', glow: null },
        reach: { ring: '#d6ccba', wood: ['#efe6d4', '#9c907c'], fill: '#1c1713', glow: null },
        active: { ring: '#e8b462', wood: ['#ffe2a6', '#b8822e'], fill: '#291c0e', glow: 'rgba(255,184,92,0.36)' }
    });
    runtime.state.SHADE = Object.freeze({
        idle: { icon: [0.55, 0.8], frame: [0.7, 0.58], brass: null },
        reach: { icon: [0.88, 0.94], frame: [1, 1], brass: null },
        active: { icon: [1, 1.04], frame: [1, 1], brass: [234, 176, 92] }
    });
    runtime.state.FRAME_FIT = Object.freeze({
        small: { size: 1.14, icon: 0.58, socket: 0.82 }, medium: { size: 1.12, icon: 0.6, socket: 0.76 },
        notable: { size: 1.2, icon: 0.57, socket: 0.64 }, keystone: { size: 1.24, icon: 0.56, socket: 0.62 },
        void: { size: 1.3, icon: 0.42, socket: 0.4 }
    });
    runtime.state.SPRITE_RADII = Object.freeze([2, 3, 4, 6, 8, 11, 15, 21, 29, 40, 56, 78]);
    runtime.state.SPRITE_MARGIN = 1.9;
    runtime.state.sprites = new Map();
    runtime.state.shadedImages = new Map();
    runtime.state.imageIds = new WeakMap();
    runtime.state.nodeIcons = new WeakMap();
    runtime.state.nodeInfo = new WeakMap();
    runtime.state.SPRITE_LIMIT = 1200;
    runtime.state.nextImageId = 1;
    runtime.state.linkCache = { nodes: null, signature: null, layers: null };
    runtime.state.PAINTERS = Object.freeze({ small: runtime.handlers.paintFramed, medium: runtime.handlers.paintFramed, notable: runtime.handlers.paintFramed, keystone: runtime.handlers.paintFramed, void: runtime.handlers.paintFramed, start: runtime.handlers.paintStart });
    runtime.state.STATES = Object.freeze(['idle', 'reach', 'active']);
    runtime.state.spriteGeneration = 0;
    runtime.state.MIN_SCREEN_RADIUS = Object.freeze({ small: 1.8, medium: 2.4, notable: 3.4, keystone: 4.2, void: 3.6, start: 6.5 });
    runtime.state.bucketCache = { zoom: 0, dpr: 0, byLook: new Map() };
    runtime.state.LINK_STYLES = Object.freeze({
        idle: [['rgba(6,5,4,0.85)', 4.6, 4.4], ['#4a443c', 2.2, 2.1]],
        reach: [['rgba(6,5,4,0.85)', 4.6, 4.4], ['#b3a894', 2.2, 2.1]],
        active: [['rgba(255,176,84,0.16)', 12, 12], ['#120c06', 5, 4.8], ['#d9a24c', 2.8, 2.6], ['#ffefcc', 1, 0.9]],
        chain: [['rgba(6,5,4,0.85)', 4.6, 4.4], ['#d5cbb8', 2.2, 2.1]],
        path: [['rgba(6,5,4,0.85)', 4.6, 4.4], ['#f3e3c0', 2.4, 2.2, 8]],
        hover: [['rgba(6,5,4,0.85)', 4.6, 4.4], ['#fff7e6', 2.8, 2.6]]
    });
    runtime.state.MOTIF_ALPHA = 0.42;
    runtime.state.motifDrawings = null;
    runtime.state.ECLIPSE_REACH = 3800;
    runtime.state.ECLIPSE_STOPS = Object.freeze([[0, '#0e0f16'], [2300, '#090a0f'], [2405, '#090a0f'], [2470, '#39415a'], [2492, '#98a5c6'], [2520, '#4d576f'], [2720, '#1a1f2d'], [3150, '#0a0c12'], [runtime.state.ECLIPSE_REACH, '#050609']]);
    runtime.state.grainPattern = null;
}
