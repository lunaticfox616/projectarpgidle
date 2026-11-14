// Elemental impact art and timing preserved from canvas-attack-fx.js.
import { rand, TAU } from './math.mjs';
import { makeParticle } from './particle-state.mjs';

export class AttackParticleBuilders {
    constructor(particleScale) { this.particleScale = particleScale; }
    qn(base, q) { return Math.max(1, Math.round(base * q * this.particleScale)); }
    physical(fx, q) {
        const { x, y } = fx;
        fx.st.crack = [];
        for (let i = 0; i < 4; i++) fx.st.crack.push({ a: rand(0, TAU), len: rand(22, 44), seg: rand(0.4, 0.7) });
        for (let i = 0; i < this.qn(6, q); i++) {
            const a = rand(0, TAU); const sp = rand(40, 130);
            fx.pBack.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(10, 40), grav: 120, drag: 3.2, size: rand(10, 20), grow: 1.6, life: rand(0.45, 0.7), shape: 'smoke', c0: [120, 112, 100], c1: [70, 66, 60] }));
        }
        for (let i = 0; i < this.qn(5, q); i++) {
            const a = rand(-Math.PI, 0.2); const sp = rand(160, 320);
            fx.pBack.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 700, drag: 0.6, size: rand(2.5, 5), rot: rand(0, TAU), vrot: rand(-12, 12), life: rand(0.4, 0.65), shape: 'debris', c0: [150, 146, 138], c1: [70, 66, 60] }));
        }
        for (let i = 0; i < this.qn(8, q); i++) {
            const a = rand(0, TAU); const sp = rand(260, 520);
            fx.pFront.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, grav: 300, drag: 1.0, size: rand(1.4, 2.6), life: rand(0.18, 0.34), shape: 'spark', trail: 5, c0: [255, 246, 210], c1: [255, 150, 60] }));
        }
    }

    fire(fx, q) {
        const { x, y } = fx;
        fx.st.flame = [];
        for (let i = 0; i < 9; i++) {
            fx.st.flame.push({ a: rand(-Math.PI * 0.92, -Math.PI * 0.08), len: rand(58, 116), w: rand(14, 26), bend: rand(-22, 22), lift: rand(10, 28), phase: rand(0, TAU), wave: rand(0.85, 1.3), inner: i < 5 });
        }
        for (let i = 0; i < this.qn(18, q); i++) {
            const a = rand(-Math.PI * 1.1, Math.PI * 0.1); const sp = rand(30, 110);
            fx.pFront.push(makeParticle({ x: x + rand(-10, 10), y: y + rand(-4, 8), vx: Math.cos(a) * sp * 0.5, vy: -rand(60, 150), grav: -40, drag: 0.8, size: rand(1.4, 3.2), life: rand(0.5, 0.95), shape: 'spark', trail: 3, c0: [255, 224, 120], c1: [200, 40, 10] }));
        }
        for (let i = 0; i < this.qn(7, q); i++) {
            const a = rand(-Math.PI, 0); const sp = rand(180, 340);
            fx.pFront.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 260, drag: 1.0, size: rand(1.4, 2.4), life: rand(0.25, 0.45), shape: 'spark', trail: 4, c0: [255, 240, 180], c1: [255, 90, 30] }));
        }
    }

    ice(fx, q) {
        const { x, y } = fx;
        fx.st.crystal = [];
        for (let i = 0; i < 9; i++) fx.st.crystal.push({ a: rand(0, TAU), d: rand(40, 90), s: rand(8, 15), long: rand(2.1, 3.0), shatter: rand(0.55, 0.72) });
        for (let i = 0; i < this.qn(11, q); i++) {
            const a = rand(0, TAU); const sp = rand(120, 280);
            fx.pBack.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 480, drag: 0.8, size: rand(2, 4), rot: rand(0, TAU), vrot: rand(-10, 10), life: rand(0.45, 0.7), shape: 'shard', c0: [220, 248, 255], c1: [120, 190, 240] }));
        }
        for (let i = 0; i < this.qn(14, q); i++) {
            const a = rand(0, TAU); const sp = rand(20, 90);
            fx.pFront.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 1.4, size: rand(1, 2.2), life: rand(0.5, 0.95), shape: 'spark', trail: 3, c0: [235, 252, 255], c1: [150, 210, 255] }));
        }
    }

    lightning(fx, q) {
        const { x, y } = fx;
        fx.st.bolts = [];
        for (let i = 0; i < 5; i++) fx.st.bolts.push({ angle: rand(0, TAU), len: rand(80, 150), seed: rand(0, 1000) });
        for (let i = 0; i < this.qn(14, q); i++) {
            const a = rand(0, TAU); const sp = rand(220, 460);
            fx.pFront.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 2.0, size: rand(1.2, 2.4), life: rand(0.12, 0.28), shape: 'spark', trail: 4, c0: [255, 255, 255], c1: [90, 170, 255] }));
        }
    }

    chaos(fx, q) {
        const { x, y } = fx;
        fx.st.tendril = [];
        for (let i = 0; i < 6; i++) fx.st.tendril.push({ a: rand(0, TAU), len: rand(46, 92), phase: rand(0, TAU), wave: rand(2, 4) });
        for (let i = 0; i < this.qn(18, q); i++) {
            const inward = Math.random() < 0.45;
            const a = rand(0, TAU);
            const sp = inward ? -rand(60, 130) : rand(70, 160);
            fx.pFront.push(makeParticle({ x: x + Math.cos(a) * (inward ? rand(50, 90) : 6), y: y + Math.sin(a) * (inward ? rand(50, 90) : 6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: inward ? 0.4 : 1.3, size: rand(1.6, 3.4), life: rand(0.5, 0.95), shape: 'glowdot', twinkle: rand(3, 6), c0: Math.random() < 0.18 ? [150, 255, 130] : [220, 110, 255], c1: [90, 20, 150] }));
        }
        for (let i = 0; i < this.qn(8, q); i++) {
            const a = rand(0, TAU); const sp = rand(90, 200);
            fx.pBack.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 1.0, size: rand(2, 4), rot: rand(0, TAU), vrot: rand(-8, 8), life: rand(0.45, 0.75), shape: 'debris', c0: [120, 50, 170], c1: [30, 8, 55] }));
        }
    }
}
