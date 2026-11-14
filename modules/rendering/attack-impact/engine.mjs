// Elemental impact art and timing preserved from canvas-attack-fx.js.
import { AttackParticleBuilders } from './particle-builders.mjs';
import { AttackParticlePainter } from './particle-painter.mjs';
import { KIND } from './element-shapes.mjs';
import { clamp01, rand, TAU } from './math.mjs';
import { stepParticle } from './particle-state.mjs';
import { drawVariantAccent } from './variant-accents.mjs';

const FX_KIND_SIZE_MUL = { physical: 0.86, fire: 0.9, ice: 0.9, lightning: 0.45, chaos: 0.9 };

const VARIANT_DURATION = {
    slam: 1.14,
    pierce: 0.82,
    chain: 0.9,
    corpse_burst: 1.18,
    nova: 1.08,
    dot: 1.12,
    summon: 1.1,
    projectile: 0.84,
    melee: 0.92
};

const ELEMENT_KINDS = new Map([
    ['fire', 'fire'], ['cold', 'ice'], ['ice', 'ice'], ['frost', 'ice'],
    ['light', 'lightning'], ['lightning', 'lightning'], ['thunder', 'lightning'],
    ['chaos', 'chaos'], ['void', 'chaos']
]);

function normalizeKind(element) {
    return ELEMENT_KINDS.get(String(element || 'phys').toLowerCase()) || 'physical';
}

const MAX_EFFECTS = 10;

function impactDensity(options, activeCount, crit) {
    const densityMul = Number.isFinite(Number(options.densityMul))
        ? Math.max(0.3, Math.min(1, Number(options.densityMul))) : 1;
    const density = clamp01(1 - activeCount / MAX_EFFECTS * 0.55) * (crit ? 1.05 : 0.78) * densityMul;
    const activeCap = densityMul < 0.55 ? 6 : (densityMul < 0.8 ? 8 : MAX_EFFECTS);
    return { density, activeCap };
}

/** One battlefield owns its impact particles and canvas-gradient cache. Durations are seconds. */
class AttackImpactRenderer {
    constructor(config) {
        this.config = config;
        this.list = [];
        this.spawnsThisFrame = 0;
        this.active = true;
        this.builders = new AttackParticleBuilders(config.particleScale);
        this.painter = new AttackParticlePainter();
    }

    spawn(element, x, y, opts) {
        if (!this.active || !this.config.enabled()) return;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        if (this.spawnsThisFrame >= this.config.maxSpawnsPerFrame) return;
        this.spawnsThisFrame++;
        const kindId = normalizeKind(element);
        const kind = KIND[kindId];
        const options = opts || {};
        const scale = Number.isFinite(options.scale) ? options.scale : 0.68;
        const crit = !!options.crit;
        const { density, activeCap } = impactDensity(options, this.list.length, crit);
        while (this.list.length >= activeCap) this.list.shift();
        const fx = this.makeEffect(kindId, kind, { x, y, options, scale, crit });
        this.builders[kindId](fx, Math.max(0.4, density));
        this.list.push(fx);
    }

    makeEffect(kindId, kind, spawn) {
        const { x, y, options, scale, crit } = spawn;
        const variant = String(options.variant || 'melee');
        return { kind, kindId, variant, x, y, age: 0, dur: kind.dur * (VARIANT_DURATION[variant] || 1),
            scale: crit ? scale * 1.08 : scale, pBack: [], pFront: [], st: { variantSeed: rand(0, TAU) } };
    }

    update(dtMs) {
        if (!this.active) return;
        this.spawnsThisFrame = 0;
        const dt = Math.min(Number(dtMs) || 0, 50) / 1000;
        if (dt <= 0) return;
        for (let i = this.list.length - 1; i >= 0; i--) {
            const fx = this.list[i];
            fx.age += dt;
            for (const p of fx.pBack) stepParticle(p, dt);
            for (const p of fx.pFront) stepParticle(p, dt);
            if (fx.age >= fx.dur) this.list.splice(i, 1);
        }
    }

    drawEffect(g, fx) {
        const t = clamp01(fx.age / fx.dur);
        g.save();
        g.globalAlpha = this.config.opacity;
        const drawScale = fx.scale * (FX_KIND_SIZE_MUL[fx.kindId] || 1);
        g.translate(fx.x, fx.y);
        g.scale(drawScale, drawScale);
        g.translate(-fx.x, -fx.y);
        fx.kind.under(g, fx, t, this.config.opacity);
        for (const p of fx.pBack) this.painter.drawParticle(g, p);
        fx.kind.body(g, fx, t);
        drawVariantAccent(g, fx, t);
        g.save();
        g.globalCompositeOperation = 'lighter';
        for (const p of fx.pFront) this.painter.drawParticle(g, p);
        g.restore();
        g.restore();
    }

    draw(g) {
        if (!this.active || !g || this.list.length === 0) return;
        for (const fx of this.list) this.drawEffect(g, fx);
    }

    // A room transition clears screen-anchored effects, not the reusable canvas cache.
    clear() { this.list.length = 0; }
    dispose() {
        this.clear();
        this.spawnsThisFrame = 0;
        this.painter.dispose();
        this.active = false;
    }
}

export function createAttackImpactRenderer(config) {
    const owner = new AttackImpactRenderer(config);
    return Object.freeze({ spawn: owner.spawn.bind(owner), update: owner.update.bind(owner),
        draw: owner.draw.bind(owner), clear: owner.clear.bind(owner), dispose: owner.dispose.bind(owner) });
}
