export const TAU = Math.PI * 2;
export const ORB = Object.freeze({ range: 6, speed: 240 / 72, every: 50, spin: 0.62, nova: 16, past: 1.2, least: 3, stagger: 90, release: 320, fan: 0.24, stepMs: 20,
    bolt: Object.freeze({ reach: 2.6, speed: 520 / 72, pct: 22, hitX: 0.3, hitY: 0.45 }) });
export const BOLT_LIFE = ORB.bolt.reach / ORB.bolt.speed * 1000;
export const ORBIT = Object.freeze({ life: 12000, every: 900, pct: 32, reach: 3, max: Object.freeze([5, 7, 10]), first: 240, firstStep: 110, avoid: 400, retry: 200, release: 320 });
export const RIFT = Object.freeze({ middle: 2, half: 0.75, depth: 4.5, pull: 1.2, pullAt: 90, close: 520, pct: 60, impact: 630, hold: 200, grow: 0.5 });
export const ISSEN = Object.freeze({ reach: 10, depth: 0.6, grow: 0.25, delay: 220, impact: 350, hold: 200, cuts: 6 });
export const VOID = Object.freeze({ radius: 3, pullCells: 2, spirit: 40, hit: 300, gap: 30, weak: 4000, impact: 400, hold: 200, fly: 260 });
export const STORM = Object.freeze({ range: 5, radius: 2, charge: 180, stagger: 200, pct: 200 });
export const CAULDRON = Object.freeze({ range: 6, radius: 2.5, pour: 260, fall: 130, every: 250, pcts: Object.freeze([80, 50, 50]), impact: 840, hold: 200 });
export const BELL = Object.freeze({ range: 6, radius: 3, drop: 220, tolls: Object.freeze([300, 750]), pcts: Object.freeze([120, 80]), least: 35, wave: 320, impact: 320, hold: 200 });
export const CHANDELIER = Object.freeze({ range: 5, radius: 2, hang: 140, fall: 220, pct: 100, fireLag: 70, contact: 540, frame: 6, mageContact: 630, mageFrame: 7, hold: 140 });
export const GAVEL = Object.freeze({ near: 0.5, far: 3.5, depth: 1.5, grow: 0.25, length: 2.3, windup: 150, swing: 170, pct: 120, impact: 320, hold: 200,
    verdict: Object.freeze({ delay: 200, gap: 45, pct: 60, lag: 50 }) });
