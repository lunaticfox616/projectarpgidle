// Elemental impact art and timing preserved from canvas-attack-fx.js.
import { rgba, TAU, clamp01, easeOutCubic } from './math.mjs';

const VARIANT_COLOR = {
    physical: [226, 210, 178],
    fire: [255, 151, 72],
    ice: [143, 226, 255],
    lightning: [255, 229, 103],
    chaos: [204, 126, 255]
};

function drawSlamAccent(g, fx, accent) {
    const { t, color, fade, p, seed } = accent;
    g.strokeStyle = rgba(color, fade * 0.72);
    g.lineWidth = 3.5 * (1 - t) + 0.8;
    g.beginPath(); g.ellipse(fx.x, fx.y + 10, 26 + 70 * p, 8 + 24 * p, 0, 0, TAU); g.stroke();
    for (let i = 0; i < 7; i++) {
        const a = seed + i * TAU / 7;
        const r0 = 16 + 10 * p;
        const r1 = 38 + 58 * p;
        g.beginPath();
        g.moveTo(fx.x + Math.cos(a) * r0, fx.y + 10 + Math.sin(a) * r0 * 0.34);
        g.lineTo(fx.x + Math.cos(a + 0.08) * r1, fx.y + 10 + Math.sin(a + 0.08) * r1 * 0.34);
        g.stroke();
    }
}

function drawPierceAccent(g, fx, accent) {
    const { t, color, fade, seed } = accent;
    const angle = -0.16 + Math.sin(seed) * 0.1;
    const length = fx.variant === 'pierce' ? 150 : 105;
    const dx = Math.cos(angle) * length;
    const dy = Math.sin(angle) * length;
    g.strokeStyle = rgba(color, fade * 0.84);
    g.lineWidth = fx.variant === 'pierce' ? 4.2 : 2.8;
    g.beginPath(); g.moveTo(fx.x - dx * (0.7 - t * 0.25), fx.y - dy * (0.7 - t * 0.25)); g.lineTo(fx.x + dx * 0.55, fx.y + dy * 0.55); g.stroke();
    g.lineWidth = 1.2;
    g.strokeStyle = rgba([255,255,255], fade * 0.78);
    g.beginPath(); g.moveTo(fx.x - dx * 0.36, fx.y - dy * 0.36); g.lineTo(fx.x + dx * 0.52, fx.y + dy * 0.52); g.stroke();
}

function drawChainAccent(g, fx, accent) {
    const { color, fade, p, seed } = accent;
    g.strokeStyle = rgba(color, fade * 0.9);
    g.lineWidth = 2.6;
    for (let branch = 0; branch < 3; branch++) {
        const a = seed + branch * TAU / 3;
        g.beginPath(); g.moveTo(fx.x, fx.y);
        for (let step = 1; step <= 4; step++) {
            const r = (18 + 18 * step) * p;
            const jitter = Math.sin(seed * 2 + branch * 7 + step * 3) * 8;
            g.lineTo(fx.x + Math.cos(a) * r + Math.cos(a + Math.PI / 2) * jitter, fx.y + Math.sin(a) * r * 0.62 + Math.sin(a + Math.PI / 2) * jitter);
        }
        g.stroke();
    }
}

function drawCorpseBurstAccent(g, fx, accent) {
    const { color, fade, p, seed } = accent;
    g.strokeStyle = rgba(color, fade * 0.8);
    g.fillStyle = rgba(color, fade * 0.18);
    g.lineWidth = 2.2;
    for (let i = 0; i < 9; i++) {
        const a = seed + i * TAU / 9;
        const inner = 14 + 10 * p;
        const outer = 34 + 56 * p;
        g.beginPath();
        g.moveTo(fx.x + Math.cos(a - 0.11) * inner, fx.y + Math.sin(a - 0.11) * inner);
        g.lineTo(fx.x + Math.cos(a) * outer, fx.y + Math.sin(a) * outer * 0.78);
        g.lineTo(fx.x + Math.cos(a + 0.11) * inner, fx.y + Math.sin(a + 0.11) * inner);
        g.closePath(); g.fill(); g.stroke();
    }
}

function drawNovaAccent(g, fx, accent) {
    const { t, color, fade } = accent;
    for (let ring = 0; ring < 3; ring++) {
        const rp = clamp01(t * 1.4 - ring * 0.12);
        g.strokeStyle = rgba(color, fade * (0.72 - ring * 0.16));
        g.lineWidth = 3 - ring * 0.6;
        g.beginPath(); g.ellipse(fx.x, fx.y, 28 + rp * (68 + ring * 12), 15 + rp * (34 + ring * 8), 0, 0, TAU); g.stroke();
    }
}

function drawDotAccent(g, fx, accent) {
    const { t, color, fade, p, seed } = accent;
    g.fillStyle = rgba(color, fade * 0.82);
    for (let i = 0; i < 8; i++) {
        const a = seed + i * TAU / 8 + t * (i % 2 ? -2.4 : 2.4);
        const r = 24 + (i % 3) * 9 + 15 * p;
        g.beginPath(); g.arc(fx.x + Math.cos(a) * r, fx.y + Math.sin(a) * r * 0.65, 2.2 + (i % 2), 0, TAU); g.fill();
    }
}

function drawSummonAccent(g, fx, accent) {
    const { color, fade, p, seed } = accent;
    const r = 32 + 38 * p;
    g.strokeStyle = rgba(color, fade * 0.78);
    g.lineWidth = 2.2;
    g.beginPath(); g.arc(fx.x, fx.y, r, seed, seed + TAU * 0.82); g.stroke();
    g.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = seed + i * TAU / 6;
        const px = fx.x + Math.cos(a) * r;
        const py = fx.y + Math.sin(a) * r * 0.62;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.stroke();
}

function drawMeleeAccent(g, fx, accent) {
    const { color, fade, t, p, seed } = accent;
    g.strokeStyle = rgba(color, fade * 0.82);
    g.lineWidth = 5 * (1 - t) + 1.2;
    g.beginPath(); g.arc(fx.x - 6, fx.y + 5, 34 + 48 * p, -2.2 + seed * 0.03, 0.28 + seed * 0.03); g.stroke();
}

const ACCENTS = Object.freeze({ slam: drawSlamAccent, pierce: drawPierceAccent,
    projectile: drawPierceAccent, chain: drawChainAccent, corpse_burst: drawCorpseBurstAccent,
    nova: drawNovaAccent, dot: drawDotAccent, summon: drawSummonAccent });

function drawVariantAccent(g, fx, t) {
    const variant = fx.variant || 'melee';
    const color = variant === 'corpse_burst' ? [224, 66, 99] : (VARIANT_COLOR[fx.kindId] || VARIANT_COLOR.physical);
    const accent = { color, t, fade: Math.pow(1 - t, 1.55), p: easeOutCubic(t), seed: fx.st.variantSeed || 0 };
    const elemental = ['fire', 'ice', 'lightning'].includes(fx.kindId);
    const selected = elemental && variant !== 'pierce' && variant !== 'projectile' ? 'chain' : variant;
    const draw = Object.hasOwn(ACCENTS, selected) ? ACCENTS[selected] : drawMeleeAccent;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    draw(g, fx, accent);
    g.restore();
}

export { drawVariantAccent };
