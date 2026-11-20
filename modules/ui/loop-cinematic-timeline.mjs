// The loop transition cinematic's one timing and size table (artifacts/loop-cinematic/first-loop-preview-v2.html in the
// loop-cinematic-v2 worktree is the visual reference). Times are ms, sizes are px of the logical world (one backdrop picture,
// 1376x768). Every shot's start is computed from this table and the voice lines' length.
const W = 1376, H = 768;

const freezeDeep = value => {
    if (value && typeof value === 'object') Object.values(value).forEach(freezeDeep);
    return Object.freeze(value);
};

export const SHOTS = freezeDeep({
    world: { w: W, h: H },
    // The hero at two world px per sprite dot, drawn on the screen at a whole device-pixel step (loop-cinematic-hero.mjs).
    hero: { scale: 2, feet: { x: 470, y: 600 }, chestPx: 62 },
    ring: { x: 690, y: 186, r: 92 },
    enterMs: 300,
    exitMs: 300,
    battlefield: { ms: 2200, fadeMs: 800, saturation: 0.35, brightness: 0.62, dx: -148, dy: 0 },
    fall: { ms: 1400, columnPx: 8, gravity: 3400, edgeFirstMs: 760, jitterMs: 160, dimFrom: 0.55 },
    voice: { leadMs: 450, charMs: 55, commaMs: 160, stopMs: 280, holdMinMs: 1800, holdPerCharMs: 70, gapMs: 300,
        push: 1.12, anchor: { x: 690, y: 420 }, leanInMs: 1800, leanOutMs: 1000, leanFrontFrom: -0.4, leanFrontTo: 1.3 },
    breakShot: { freezeMs: 250, ringLightMs: 500, vortexRampMs: 900, vortexSpeed: 2.4 },
    scatter: { dissolveMs: 1600, pullMs: 2000, moteLifeMs: [1500, 2300], moteCurl: 0.35, moteRimPx: 118, moteRimJitter: 0.35, coreLiftPx: 18, coreFadeMs: 150 },
    core: { haloR: [9, 14], pulseMs: 320, trail: 6, trailStepMs: 32 },
    rewind: { ms: 3200, coreFlyMs: 600, flashMs: 34, irisOpenMs: 300, firstHoldMs: 240, lastHoldMs: 100, scrollPx: 36, tearMs: 60,
        centre: { x: 688, y: 384 }, driftAt: 0.62, chipGapMs: 180 },
    // The pool of light is a whole circle inside the scene on a 16:9 desktop and in the phone's camera window (y 40 to 659).
    well: { ms: 2800, closeMs: 500, shaftMs: 400, poolAtMs: 900, poolRevealMs: 200, poolR0: 120, poolR1: 190, poolRimPx: 8, poolCentre: { x: 688, y: 450 },
        fallStartMs: 900, fallMs: 800, shaftThinMs: 300, titleAtMs: 2000, titleFadeMs: 300,
        mouth: { x: 688, y: 72, r: 22 }, hover: { x: 688, y: 476 }, heroFeet: { x: 688, y: 600 }, shaftPx: 6 },
    // Act 1 (the root end sanctuary) is a stage set, not one region picture: scaled 1.5 so a dot is exactly 3 px.
    act1: { scale: 1.5, groundY: 520 },
    graft: { fadeMs: 300, dropMs: 400, formMs: 900, poolOpenMs: 900, holdMs: 400, moteMs: 380 },
    short: {
        dissolveMs: 500, moteLifeMs: [350, 500], waveMs: 500,
        rewind: { ms: 900, coreFlyMs: 150, flashMs: 34, irisOpenMs: 150, firstHoldMs: 80, lastHoldMs: 40, scrollPx: 24, tearMs: 30 },
        well: { ms: 1000, closeMs: 200, shaftMs: 150, poolAtMs: 350, poolRevealMs: 100, fallStartMs: 350, fallMs: 250, shaftThinMs: 150, titleAtMs: 600, titleFadeMs: 200 }
    },
    auto: {
        dissolveMs: 300, moteLifeMs: [220, 320], waveMs: 300,
        rewind: { ms: 500, coreFlyMs: 80, flashMs: 34, irisOpenMs: 100, firstHoldMs: 40, lastHoldMs: 20, scrollPx: 16, tearMs: 20 },
        well: { ms: 600, closeMs: 150, shaftMs: 100, poolAtMs: 220, poolRevealMs: 80, fallStartMs: 220, fallMs: 160, shaftThinMs: 100, titleAtMs: 300, titleFadeMs: 150 }
    },
    plain: { fadeMs: 500, holdMs: 400, outMs: 500 },
    panelDim: 0.55,
    // The phone sees a 1100 wide window centred on the ring and the well (x 688), so the title and the pool line up.
    camera: { phoneViewW: 1100, phoneCentre: { x: 688, y: 350 }, phoneTopBar: 56 },
    audio: { reverseGain: 0.75, duckGain: 0.35, duckMs: 600, rateFrom: 1.0, rateTo: 1.6, sliceEndSec: 70 },
    typing: { autoMinMs: 1800, autoPerCharMs: 70 }
});

export const clamp01 = v => Math.max(0, Math.min(1, v));
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = u => { const x = clamp01(u); return x * x * (3 - 2 * x); };
export const easeIn = u => { const x = clamp01(u); return x * x; };
export const easeOutCubic = u => { const x = clamp01(u); return 1 - Math.pow(1 - x, 3); };
export const hash = k => { const s = Math.sin(k * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };

/** The time of each character of a line: punctuation holds, the third line's first character freezes the scene. */
function lineTimes(text, freezeAfterFirst) {
    const v = SHOTS.voice, times = [];
    let at = 0;
    for (let k = 0; k < text.length; k++) {
        times.push(at);
        const ch = text[k];
        if (k === 0 && freezeAfterFirst) at += SHOTS.breakShot.freezeMs;
        at += v.charMs + (/[.!?]/.test(ch) ? v.stopMs : ch === ',' ? v.commaMs : 0);
    }
    return { times, typeMs: times[times.length - 1] + v.charMs };
}

function voiceLines(T, lines, from) {
    const v = SHOTS.voice;
    let t = from;
    lines.forEach((text, i) => {
        if (i === 2) T.starts[3] = t;
        if (i === 3) T.starts[4] = t;
        const sched = lineTimes(text, i === 2), typeEnd = t + sched.typeMs;
        const line = { i, text, start: t, times: sched.times, typeEnd, end: typeEnd + Math.max(v.holdMinMs, v.holdPerCharMs * text.length) };
        T.lines.push(line);
        t = line.end + v.gapMs;
        line.next = t;
    });
    return t;
}

/** The first loop's seven shots (battlefield, ground falls, voice, break, scatter, rewind, well). */
function fullTimeline(lines) {
    const S = SHOTS, T = { mode: 'full', starts: [0], lines: [] };
    let t = S.battlefield.ms;
    T.starts[1] = t; t += S.fall.ms;
    T.starts[2] = t;
    t = voiceLines(T, lines, t + S.voice.leadMs);
    T.starts[5] = t; t += S.rewind.ms;
    T.starts[6] = t; t += S.well.ms;
    T.end = t;
    T.freezeEnd = T.starts[3] + S.breakShot.freezeMs;
    T.waveStart = T.freezeEnd;
    T.waveEnd = T.starts[4] + S.scatter.pullMs;
    T.rewind = S.rewind;
    T.well = S.well;
    T.music = { fwdUntil: T.starts[3], revStart: T.freezeEnd, revEnd: T.starts[6] };
    T.events = [
        { at: T.freezeEnd, sfx: 'returnWarp' },
        { at: T.starts[5] + S.rewind.coreFlyMs, sfx: 'hitLightBeam' },
        { at: T.starts[6] + S.well.titleAtMs, sfx: 'levelUp' }
    ];
    return T;
}

/** Every later loop: dissolve, reverse flashes, well and title (cfg is SHOTS.short or the faster SHOTS.auto). */
function shortTimeline(mode, cfg) {
    const S = SHOTS, T = { mode, starts: [0], lines: [], cfg };
    T.rewind = { ...S.rewind, ...cfg.rewind };
    T.well = { ...S.well, ...cfg.well };
    T.starts[1] = cfg.dissolveMs;
    T.starts[2] = cfg.dissolveMs + T.rewind.ms;
    T.end = T.starts[2] + T.well.ms;
    T.music = { fwdUntil: 0, revStart: 0, revEnd: T.starts[2] };
    T.events = [
        { at: 1, sfx: 'returnWarp' },
        { at: T.starts[1] + T.rewind.coreFlyMs, sfx: 'hitLightBeam' },
        { at: T.starts[2] + T.well.titleAtMs, sfx: 'levelUp' }
    ];
    return T;
}

function plainTimeline() {
    const p = SHOTS.plain;
    return { mode: 'plain', starts: [0], lines: [], end: p.fadeMs + p.holdMs, music: null, events: [] };
}

/** @param {'full'|'short'|'auto'|'plain'} mode @param {string[]} lines the voice lines (full mode only) */
export function buildTimeline(mode, lines) {
    if (mode === 'full') return fullTimeline(lines);
    if (mode === 'short') return shortTimeline('short', SHOTS.short);
    if (mode === 'auto') return shortTimeline('auto', SHOTS.auto);
    return plainTimeline();
}

/** The voice line on screen at t, or null. */
export function lineAt(T, t) { return T.lines.find(line => t >= line.start && t < line.next) || null; }

/** Scene time that stands still during the break's freeze. */
export function animMs(T, t) {
    return T.mode === 'full' && t > T.starts[3] ? t - Math.min(t - T.starts[3], SHOTS.breakShot.freezeMs) : t;
}

/** How long each reverse picture holds, from the first (slow) to the last (fast). */
export function rewindHolds(cfg, count) {
    const out = [];
    for (let i = 0; i < count; i++) out.push(lerp(cfg.firstHoldMs, cfg.lastHoldMs, count > 1 ? i / (count - 1) : 0));
    return out;
}

export function rewindPicture(cfg, e, count) {
    const holds = rewindHolds(cfg, count);
    let at = cfg.coreFlyMs + cfg.flashMs;
    for (let i = 0; i < holds.length; i++) {
        if (e < at + holds[i] || i === holds.length - 1) return { i, local: e - at, hold: holds[i] };
        at += holds[i];
    }
    return { i: Math.max(0, holds.length - 1), local: 0, hold: 1 };
}

export function graftTimes() {
    const g = SHOTS.graft, form = g.fadeMs + g.dropMs;
    return { drop: g.fadeMs, form, formed: form + g.formMs, end: form + g.formMs + g.holdMs };
}
