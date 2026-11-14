import { getPassiveNodeIconFamily } from './passive-node-art.mjs';

function tracePassiveBladeIcon(ctx, r) {
    ctx.moveTo(0, -r); ctx.lineTo(0, r * 0.45);
    ctx.moveTo(-r * 0.45, r * 0.22); ctx.lineTo(r * 0.45, r * 0.22);
    ctx.moveTo(-r * 0.18, r); ctx.lineTo(0, r * 0.45); ctx.lineTo(r * 0.18, r);
}

function tracePassiveProjectileIcon(ctx, r) {
    ctx.moveTo(-r, r * 0.5); ctx.lineTo(r, -r * 0.5);
    ctx.moveTo(r, -r * 0.5); ctx.lineTo(r * 0.35, -r * 0.62);
    ctx.moveTo(r, -r * 0.5); ctx.lineTo(r * 0.62, r * 0.05);
}

function tracePassiveShieldIcon(ctx, r) {
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.72, -r * 0.52); ctx.lineTo(r * 0.56, r * 0.45);
    ctx.lineTo(0, r); ctx.lineTo(-r * 0.56, r * 0.45); ctx.lineTo(-r * 0.72, -r * 0.52); ctx.closePath();
}

function tracePassivePotionIcon(ctx, r) {
    ctx.moveTo(-r * 0.34, -r); ctx.lineTo(r * 0.34, -r); ctx.lineTo(r * 0.3, -r * 0.42);
    ctx.lineTo(r * 0.72, r * 0.62); ctx.lineTo(r * 0.45, r); ctx.lineTo(-r * 0.45, r);
    ctx.lineTo(-r * 0.72, r * 0.62); ctx.lineTo(-r * 0.3, -r * 0.42); ctx.closePath();
}

function tracePassiveEyeIcon(ctx, r) {
    ctx.moveTo(-r, 0); ctx.lineTo(0, -r * 0.62); ctx.lineTo(r, 0); ctx.lineTo(0, r * 0.62); ctx.closePath();
    ctx.moveTo(r * 0.28, 0); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
}

function tracePassiveCubeIcon(ctx, r) {
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.82, -r * 0.45); ctx.lineTo(r * 0.82, r * 0.45);
    ctx.lineTo(0, r); ctx.lineTo(-r * 0.82, r * 0.45); ctx.lineTo(-r * 0.82, -r * 0.45); ctx.closePath();
    ctx.moveTo(0, 0); ctx.lineTo(0, r); ctx.moveTo(0, 0); ctx.lineTo(r * 0.82, -r * 0.45); ctx.moveTo(0, 0); ctx.lineTo(-r * 0.82, -r * 0.45);
}

function tracePassiveCycleIcon(ctx, r) {
    ctx.arc(0, 0, r * 0.72, -Math.PI * 0.15, Math.PI * 1.25);
    ctx.moveTo(-r * 0.62, -r * 0.45); ctx.lineTo(-r * 0.92, -r * 0.16); ctx.lineTo(-r * 0.48, -r * 0.08);
}

function tracePassiveElementIcon(ctx, r) {
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, r * 0.48); ctx.lineTo(0, r); ctx.lineTo(-r * 0.7, r * 0.48); ctx.closePath();
    ctx.moveTo(0, -r * 0.42); ctx.lineTo(r * 0.25, r * 0.32); ctx.lineTo(-r * 0.25, r * 0.32); ctx.closePath();
}

function tracePassiveChaosIcon(ctx, r) {
    ctx.moveTo(-r * 0.9, -r * 0.2); ctx.lineTo(-r * 0.25, -r * 0.72); ctx.lineTo(r * 0.5, -r * 0.5);
    ctx.lineTo(r * 0.9, r * 0.18); ctx.lineTo(r * 0.2, r * 0.76); ctx.lineTo(-r * 0.58, r * 0.5); ctx.closePath();
    ctx.moveTo(r * 0.24, 0); ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
}

function tracePassiveLifeIcon(ctx, r) {
    ctx.moveTo(0, r); ctx.lineTo(-r * 0.82, r * 0.06); ctx.lineTo(-r * 0.58, -r * 0.62);
    ctx.lineTo(0, -r * 0.28); ctx.lineTo(r * 0.58, -r * 0.62); ctx.lineTo(r * 0.82, r * 0.06); ctx.closePath();
}

function tracePassiveArcaneIcon(ctx, r) {
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.86, r * 0.52); ctx.lineTo(-r * 0.86, r * 0.52); ctx.closePath();
    ctx.moveTo(0, -r * 0.38); ctx.lineTo(0, r * 0.52);
}

function tracePassiveSummonIcon(ctx, r) {
    ctx.moveTo(r * 0.45, r * 0.3); ctx.arc(0, r * 0.3, r * 0.45, 0, Math.PI * 2);
    [-0.58, -0.2, 0.2, 0.58].forEach(x => { ctx.moveTo(x * r + r * 0.18, -r * 0.38); ctx.arc(x * r, -r * 0.38, r * 0.18, 0, Math.PI * 2); });
}

function tracePassivePrecisionIcon(ctx, r) {
    ctx.moveTo(r, 0); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.moveTo(r * 0.42, 0); ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
    ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r);
}

function tracePassiveWindIcon(ctx, r) {
    ctx.moveTo(-r, -r * 0.48); ctx.lineTo(r * 0.55, -r * 0.48); ctx.lineTo(r, -r * 0.2);
    ctx.moveTo(-r * 0.7, 0); ctx.lineTo(r * 0.35, 0); ctx.lineTo(r * 0.72, r * 0.25);
    ctx.moveTo(-r, r * 0.48); ctx.lineTo(r * 0.58, r * 0.48);
}

function tracePassiveAttributeIcon(ctx, r) {
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.3, -r * 0.28); ctx.lineTo(r, 0);
    ctx.lineTo(r * 0.3, r * 0.28); ctx.lineTo(0, r); ctx.lineTo(-r * 0.3, r * 0.28);
    ctx.lineTo(-r, 0); ctx.lineTo(-r * 0.3, -r * 0.28); ctx.closePath();
}

function tracePassiveVoidIcon(ctx, r) {
    ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath();
    ctx.moveTo(r * 0.48, 0); ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2);
}

function tracePassiveConstellationIcon(ctx, r) {
    const points = [[-0.72, -0.32], [0.12, -0.72], [0.72, 0.1], [-0.18, 0.72]];
    points.forEach(([x, y], index) => {
        const next = points[(index + 1) % points.length];
        ctx.moveTo(x * r, y * r); ctx.lineTo(next[0] * r, next[1] * r);
        ctx.moveTo(x * r + r * 0.12, y * r); ctx.arc(x * r, y * r, r * 0.12, 0, Math.PI * 2);
    });
}

const PASSIVE_ICON_TRACERS = Object.freeze({
    blade: tracePassiveBladeIcon, projectile: tracePassiveProjectileIcon, shield: tracePassiveShieldIcon,
    potion: tracePassivePotionIcon, mystique: tracePassiveEyeIcon, devotion: tracePassiveCubeIcon,
    cycle: tracePassiveCycleIcon, elemental: tracePassiveElementIcon, chaos: tracePassiveChaosIcon,
    life: tracePassiveLifeIcon, arcane: tracePassiveArcaneIcon, summon: tracePassiveSummonIcon,
    precision: tracePassivePrecisionIcon, wind: tracePassiveWindIcon,
    strength: tracePassiveAttributeIcon, dexterity: tracePassiveAttributeIcon, intelligence: tracePassiveAttributeIcon,
    void: tracePassiveVoidIcon, constellation: tracePassiveConstellationIcon,
    // the 2026-11-01 families fall back to the nearest older tracer while the sheet is still loading
    fire: tracePassiveElementIcon, cold: tracePassiveElementIcon, lightning: tracePassiveElementIcon, ignite: tracePassiveElementIcon,
    chill: tracePassiveElementIcon, freeze: tracePassiveElementIcon, shock: tracePassiveElementIcon, critical: tracePassivePrecisionIcon,
    armor: tracePassiveShieldIcon, evasion: tracePassiveWindIcon, energyShield: tracePassiveArcaneIcon, cooldown: tracePassiveCycleIcon,
    bleed: tracePassiveBladeIcon, poison: tracePassivePotionIcon,
    wisp: tracePassiveSummonIcon, blessing: tracePassiveCubeIcon, mobility: tracePassiveWindIcon, area: tracePassiveElementIcon, slam: tracePassiveBladeIcon,
    damageOverTime: tracePassiveChaosIcon, spell: tracePassiveArcaneIcon, censer: tracePassivePotionIcon, greatsword: tracePassiveBladeIcon,
    bow: tracePassiveProjectileIcon, orb: tracePassiveArcaneIcon
});

export function drawPassiveNodeIcon(runtime, ctx, node, radius, color) {
    const tracer = PASSIVE_ICON_TRACERS[getPassiveNodeIconFamily(runtime, node)];
    if (!tracer) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.1, radius * 0.1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    tracer(ctx, radius * 0.48);
    ctx.stroke();
    ctx.restore();
}
