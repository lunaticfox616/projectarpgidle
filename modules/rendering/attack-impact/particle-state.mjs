// Elemental impact art and timing preserved from canvas-attack-fx.js.
import { rand, TAU, clamp01 } from './math.mjs';

const PARTICLE_DEFAULTS = Object.freeze({
    vx: 0, vy: 0, grav: 0, drag: 0, size: 2, grow: 0, life: 0.5,
    rot: 0, vrot: 0, shape: 'circle', fade: 'out', twinkle: 0, trail: 0
});
const PARTICLE_FIELDS = Object.keys(PARTICLE_DEFAULTS);

function makeParticle(o) {
    const particle = { x: o.x, y: o.y, age: 0, c0: o.c0 || [255, 255, 255],
        c1: o.c1 || null, seed: rand(0, TAU), hist: o.trail ? [] : null };
    for (const key of PARTICLE_FIELDS) particle[key] = o[key] || PARTICLE_DEFAULTS[key];
    return particle;
}

function stepParticle(p, dt) {
    p.age += dt;
    p.vy += p.grav * dt;
    if (p.drag) {
        const f = Math.max(0, 1 - p.drag * dt);
        p.vx *= f; p.vy *= f;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vrot * dt;
    if (p.trail) {
        p.hist.push(p.x, p.y);
        const max = p.trail * 2;
        if (p.hist.length > max) p.hist.splice(0, p.hist.length - max);
    }
}

function particleAlpha(p) {
    const k = clamp01(p.age / p.life);
    let a = p.fade === 'inout' ? Math.sin(k * Math.PI) : 1 - k;
    if (p.twinkle) a *= 0.55 + 0.45 * Math.sin(p.age * p.twinkle * TAU + p.seed);
    return clamp01(a);
}

export { makeParticle, particleAlpha, stepParticle };
